// DeviceActivityMonitorExtension.swift
// App Extension target — runs in its own process, separate from MonkMode app.
// This is the enforcement backbone: restrictions persist even if MonkMode is killed.
//
// Target type: DeviceActivity Monitor Extension
// Bundle ID: com.yourco.monkmode.monitor
//
// CRITICAL: This extension is what makes MonkMode hard to bypass.
// iOS invokes these callbacks based on the DeviceActivitySchedule,
// regardless of whether the main app is running.

import DeviceActivity
import ManagedSettings

class MonkModeMonitor: DeviceActivityMonitor {

  private let store = ManagedSettingsStore()

  // Called when a scheduled session window STARTS
  // Use this to re-apply restrictions if the app was relaunched mid-session
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)

    guard activity == .monkModeSession else { return }

    // Re-read stored token list from shared UserDefaults (App Group)
    // and re-apply restrictions. This handles the edge case where
    // the device was rebooted mid-session.
    if let tokenData = sharedDefaults?.data(forKey: "monk_blocked_tokens"),
       let tokens = try? JSONDecoder().decode(Set<ApplicationToken>.self, from: tokenData) {
      store.application.blockedApplications = tokens
    }
  }

  // Called when scheduled session window ENDS — auto-unlock
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)

    guard activity == .monkModeSession else { return }

    // Clear all restrictions — session over
    store.clearAllSettings()

    // Post a local notification to inform the user
    scheduleSessionEndNotification()
  }

  // Called when a specific app's usage threshold is crossed (optional feature)
  // Can use this for "gentle warnings" before full block
  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)
    // Future: "5 minutes of Instagram consumed — entering cooldown"
  }

  // MARK: - Helpers

  private var sharedDefaults: UserDefaults? {
    UserDefaults(suiteName: "group.com.yourco.monkmode")
  }

  private func scheduleSessionEndNotification() {
    let content = UNMutableNotificationContent()
    content.title = "Session complete."
    content.body = "All apps restored. Well done."
    content.sound = .none  // deliberately minimal

    let request = UNNotificationRequest(
      identifier: "monkmode.session.end",
      content: content,
      trigger: nil  // deliver immediately
    )
    UNUserNotificationCenter.current().add(request)
  }
}
