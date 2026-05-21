// ScreenTimeModule.swift
// TurboModule bridging React Native ↔ Apple FamilyControls + ManagedSettings
//
// Requires:
//   - com.apple.developer.family-controls entitlement (individual authorization)
//   - iOS 16.0+ deployment target
//   - FamilyControls, ManagedSettings, DeviceActivity frameworks linked

import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import AuthenticationServices

@objc(ScreenTimeModule)
class ScreenTimeModule: NSObject {

  // Shared ManagedSettingsStore — our isolated store, separate from system Screen Time
  private let store = ManagedSettingsStore()
  private let activityCenter = DeviceActivityCenter()

  // MARK: - Authorization

  /// Request FamilyControls authorization for .individual (self-restriction mode).
  /// Must be called on main thread; presents system consent sheet to user.
  @objc
  func requestAuthorization(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        resolve(["status": "authorized"])
      } catch {
        reject("AUTH_FAILED", "FamilyControls authorization denied: \(error.localizedDescription)", error)
      }
    }
  }

  // MARK: - Apply Restrictions

  /// Apply OS-level app blocks for all apps NOT in the whitelist token set.
  /// Takes an array of base64-encoded ApplicationToken data (opaque handles).
  /// Apps in this set will be blocked by iOS — they show a Screen Time intercept sheet.
  @objc
  func applyRestrictions(
    _ blockedTokenData: [String],
    sessionDurationMinutes duration: Int,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard !blockedTokenData.isEmpty else {
      reject("EMPTY_LIST", "Blocked token list cannot be empty", nil)
      return
    }

    // Decode opaque ApplicationToken objects from stored base64 strings
    var tokenSet = Set<ApplicationToken>()
    for tokenString in blockedTokenData {
      guard
        let data = Data(base64Encoded: tokenString),
        let token = try? JSONDecoder().decode(ApplicationToken.self, from: data)
      else { continue }
      tokenSet.insert(token)
    }

    // Apply to ManagedSettingsStore — takes effect immediately
    store.application.blockedApplications = tokenSet
    store.application.denyAppInstallation = true   // prevent installing replacements
    store.webContent.blockedByFilter = .auto()       // optional: filter web

    // Schedule DeviceActivity window to auto-clear at session end
    let schedule = DeviceActivitySchedule(
      intervalStart: DateComponents(
        hour: Calendar.current.component(.hour, from: Date()),
        minute: Calendar.current.component(.minute, from: Date())
      ),
      intervalEnd: Calendar.current.dateComponents(
        [.hour, .minute],
        from: Date().addingTimeInterval(TimeInterval(duration * 60))
      ),
      repeats: false
    )

    do {
      try activityCenter.startMonitoring(
        .monkModeSession,
        during: schedule
      )
      resolve(["restricted": tokenSet.count, "endsAt": Date().addingTimeInterval(TimeInterval(duration * 60)).timeIntervalSince1970])
    } catch {
      reject("SCHEDULE_FAILED", "DeviceActivity scheduling failed: \(error.localizedDescription)", error)
    }
  }

  // MARK: - Clear Restrictions

  /// Immediately lift all MonkMode restrictions. Called after override passcode verified.
  @objc
  func clearRestrictions(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    store.clearAllSettings()
    activityCenter.stopMonitoring([.monkModeSession])
    resolve(["cleared": true])
  }

  // MARK: - Authorization Status

  @objc
  func getAuthorizationStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let status = AuthorizationCenter.shared.authorizationStatus
    switch status {
    case .approved:
      resolve(["status": "approved"])
    case .denied:
      resolve(["status": "denied"])
    case .notDetermined:
      resolve(["status": "notDetermined"])
    @unknown default:
      resolve(["status": "unknown"])
    }
  }

  // MARK: - TurboModule boilerplate

  @objc
  static func requiresMainQueueSetup() -> Bool { return false }
}

// MARK: - DeviceActivity name constant
extension DeviceActivityName {
  static let monkModeSession = Self("monkmode.session")
}
