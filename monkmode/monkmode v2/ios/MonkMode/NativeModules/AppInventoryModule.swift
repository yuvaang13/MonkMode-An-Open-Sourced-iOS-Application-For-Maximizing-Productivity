// NativeModules/AppInventoryModule.swift
//
// Surfaces the device's installed app list to React Native using
// FamilyActivityPicker token metadata. Tokens are opaque handles —
// bundle IDs are never exposed to the JS layer for privacy.

import Foundation
import FamilyControls
import ManagedSettings

@objc(AppInventoryModule)
class AppInventoryModule: NSObject {

  // MARK: - Present FamilyActivityPicker

  /// Presents the system FamilyActivityPicker sheet, which shows all installed apps.
  /// The user's selections are returned as base64-encoded ApplicationToken strings.
  /// This is the only approved way to enumerate apps under FamilyControls.
  ///
  /// In production: integrate SwiftUI FamilyActivityPicker into a RN modal host VC.
  /// The picker returns a FamilyActivitySelection containing applicationTokens.
  @objc
  func presentAppPicker(
    _ currentSelectionBase64: [String],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      // Decode existing selection to pre-populate the picker
      var existingSelection = FamilyActivitySelection()
      let decoder = JSONDecoder()
      for b64 in currentSelectionBase64 {
        if let data = Data(base64Encoded: b64),
           let token = try? decoder.decode(ApplicationToken.self, from: data) {
          existingSelection.applicationTokens.insert(token)
        }
      }

      // FamilyActivityPicker is SwiftUI — bridge via UIHostingController
      let picker = FamilyActivityPickerHostController(
        selection: existingSelection
      ) { selection in
        // Encode chosen tokens back to base64 for JS
        let encoder = JSONEncoder()
        let tokens: [[String: String]] = selection.applicationTokens.compactMap { token in
          guard let data = try? encoder.encode(token),
                let b64 = data.base64EncodedString() as String? else { return nil }
          return [
            "token": b64,
            // displayName is available via token metadata in production
            // For scaffold: use a placeholder
            "displayName": "App",
            "bundleCategory": "other",
          ]
        }
        resolve(tokens)
      }

      guard let root = UIApplication.shared.connectedScenes
        .compactMap({ $0 as? UIWindowScene })
        .first?.windows.first?.rootViewController else {
        reject("NO_ROOT_VC", "Cannot find root view controller", nil)
        return
      }
      root.present(picker, animated: true)
    }
  }

  // MARK: - Store token list for App Group sharing

  /// Persist the blocked token list to the shared App Group UserDefaults.
  /// The DeviceActivityMonitor extension reads this to apply restrictions.
  @objc
  func storeBlockedTokens(
    _ tokens: [String],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: "group.com.yourco.monkmode") else {
      reject("NO_APP_GROUP", "App Group not configured", nil)
      return
    }

    let tokenObjects: [ApplicationToken] = tokens.compactMap { b64 in
      guard
        let data = Data(base64Encoded: b64),
        let token = try? JSONDecoder().decode(ApplicationToken.self, from: data)
      else { return nil }
      return token
    }

    if let encoded = try? JSONEncoder().encode(Set(tokenObjects)) {
      defaults.set(encoded, forKey: "monk_blocked_tokens")
    }

    resolve(["stored": tokenObjects.count])
  }

  @objc
  static func requiresMainQueueSetup() -> Bool { return true }
}

// MARK: - SwiftUI bridge boilerplate (skeleton)

import SwiftUI

class FamilyActivityPickerHostController: UIHostingController<FamilyActivityPickerView> {
  init(selection: FamilyActivitySelection, onComplete: @escaping (FamilyActivitySelection) -> Void) {
    let view = FamilyActivityPickerView(selection: selection, onComplete: onComplete)
    super.init(rootView: view)
  }
  @objc required dynamic init?(coder: NSCoder) { fatalError() }
}

struct FamilyActivityPickerView: View {
  @State var selection: FamilyActivitySelection
  let onComplete: (FamilyActivitySelection) -> Void

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Choose Allowed Apps")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") { onComplete(selection) }
          }
        }
    }
    .colorScheme(.dark)
  }
}
