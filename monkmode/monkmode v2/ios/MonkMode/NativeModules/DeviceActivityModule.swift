// NativeModules/DeviceActivityModule.swift
//
// TurboModule bridging React Native ↔ DeviceActivity for schedule management.
// Handles recurring schedules (set-and-forget daily blocks) separate from
// the one-shot session schedules in ScreenTimeModule.

import Foundation
import DeviceActivity
import ManagedSettings

@objc(DeviceActivityModule)
class DeviceActivityModule: NSObject {

  private let center = DeviceActivityCenter()

  // MARK: - Recurring Schedule Registration

  /// Register a named recurring schedule with iOS DeviceActivity.
  /// Each unique `id` maps to a DeviceActivityName.
  /// The DeviceActivityMonitor extension handles start/end callbacks.
  @objc
  func scheduleRecurring(
    _ config: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard
      let id = config["id"] as? String,
      let startHour = config["startHour"] as? Int,
      let startMinute = config["startMinute"] as? Int,
      let endHour = config["endHour"] as? Int,
      let endMinute = config["endMinute"] as? Int
    else {
      reject("INVALID_CONFIG", "Missing required schedule fields", nil)
      return
    }

    let activityName = DeviceActivityName(rawValue: "monkmode.schedule.\(id)")

    // DeviceActivitySchedule with repeats:true re-fires every day at the given times.
    // For day-of-week filtering, we register one schedule per active day.
    let schedule = DeviceActivitySchedule(
      intervalStart: DateComponents(hour: startHour, minute: startMinute),
      intervalEnd: DateComponents(hour: endHour, minute: endMinute),
      repeats: true,
      warningTime: nil
    )

    do {
      try center.startMonitoring(activityName, during: schedule)
      resolve(["registered": true, "id": id])
    } catch {
      reject("SCHEDULE_FAILED", "DeviceActivity scheduling failed: \(error.localizedDescription)", error)
    }
  }

  // MARK: - Cancel

  @objc
  func cancelSchedule(
    _ id: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let activityName = DeviceActivityName(rawValue: "monkmode.schedule.\(id)")
    center.stopMonitoring([activityName])
    resolve(["cancelled": true])
  }

  @objc
  func cancelAllSchedules(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // Stop all MonkMode-prefixed activities
    // DeviceActivityCenter does not expose a list API, so we track IDs in shared UserDefaults
    let defaults = UserDefaults(suiteName: "group.com.yourco.monkmode")
    let ids = defaults?.array(forKey: "registered_schedule_ids") as? [String] ?? []
    let names = ids.map { DeviceActivityName(rawValue: "monkmode.schedule.\($0)") }
    center.stopMonitoring(names)
    defaults?.removeObject(forKey: "registered_schedule_ids")
    resolve(["cancelled": ids.count])
  }

  @objc
  static func requiresMainQueueSetup() -> Bool { return false }
}

// MARK: - DeviceActivityMonitor extension (in Extensions/DeviceActivityMonitorExtension.swift)
// The Monitor extension handles scheduled start/end by reading the preset token list
// from the shared App Group UserDefaults and applying/clearing ManagedSettings.
