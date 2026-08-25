/**
 * native/DeviceActivityModule.ts
 *
 * JS interface for the DeviceActivityModule TurboModule.
 * Manages recurring DeviceActivitySchedule registration and cancellation.
 *
 * Backed by Swift: DeviceActivityCenter.shared.startMonitoring() with
 * repeating schedules derived from day-of-week + time window config.
 */

import { NativeModules, Platform } from 'react-native'
import type { DayOfWeek } from '../store/scheduleStore'

const { DeviceActivityModule: Native } = NativeModules

export interface RecurringScheduleConfig {
  id: string
  days: DayOfWeek[]
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  whitelistPresetId: string | null
}

export const DeviceActivityModule = {
  /**
   * Register a named recurring schedule with iOS DeviceActivity.
   * iOS will call the DeviceActivityMonitor extension at each window boundary.
   * No-op on non-iOS platforms.
   */
  scheduleRecurring(config: RecurringScheduleConfig): Promise<{ registered: boolean }> {
    if (Platform.OS !== 'ios') return Promise.resolve({ registered: false })
    if (!Native) return Promise.resolve({ registered: false })
    return Native.scheduleRecurring(config)
  },

  /**
   * Cancel a named schedule. Removes it from DeviceActivityCenter.
   * Restrictions will NOT be cleared — only future enforcement stops.
   */
  cancelSchedule(id: string): Promise<{ cancelled: boolean }> {
    if (Platform.OS !== 'ios') return Promise.resolve({ cancelled: false })
    if (!Native) return Promise.resolve({ cancelled: false })
    return Native.cancelSchedule(id)
  },

  /**
   * Cancel all registered MonkMode schedules at once.
   * Used on sign-out or full reset.
   */
  cancelAllSchedules(): Promise<{ cancelled: number }> {
    if (Platform.OS !== 'ios') return Promise.resolve({ cancelled: 0 })
    if (!Native) return Promise.resolve({ cancelled: 0 })
    return Native.cancelAllSchedules()
  },

  /** Write JSON-serializable value to App Group (for extension + main app). */
  setAppGroupJSON(key: string, value: unknown): Promise<{ ok: boolean }> {
    if (Platform.OS !== 'ios') return Promise.resolve({ ok: true })
    if (!Native) return Promise.resolve({ ok: false })
    return Native.setAppGroupString(key, JSON.stringify(value))
  },

  /** Drain schedule completions recorded by DeviceActivityMonitor extension. */
  drainPendingScheduleCompletions(): Promise<{
    completions: Array<{ scheduleId: string; durationMinutes: number; endedAt: number }>
  }> {
    if (Platform.OS !== 'ios') return Promise.resolve({ completions: [] })
    if (!Native) return Promise.resolve({ completions: [] })
    return Native.drainPendingScheduleCompletions()
  },
}
