// src/native/ScreenTimeModule.ts
// JavaScript interface for the ScreenTimeModule TurboModule.
// All calls are async — native Swift executes on a background queue.

import { NativeModules, Platform } from 'react-native'

const { ScreenTimeModule: NativeScreenTime } = NativeModules

if (!NativeScreenTime && Platform.OS === 'ios') {
  console.warn(
    '[MonkMode] ScreenTimeModule not found. ' +
    'Ensure the native module is linked and the app was rebuilt.'
  )
}

export type AuthorizationStatus = 'approved' | 'denied' | 'notDetermined' | 'unknown'

export interface ApplyRestrictionsResult {
  restricted: number     // number of apps blocked
  endsAt: number         // unix timestamp when session auto-expires
}

export interface ClearRestrictionsResult {
  cleared: boolean
}

export const ScreenTimeModule = {
  /**
   * Request FamilyControls authorization (one-time user consent).
   * Must be called before any restriction APIs.
   * Presents system sheet — must run from a user interaction context.
   */
  requestAuthorization(): Promise<{ status: 'authorized' }> {
    if (Platform.OS !== 'ios') return Promise.resolve({ status: 'authorized' })
    if (!NativeScreenTime) return Promise.resolve({ status: 'authorized' })
    return NativeScreenTime.requestAuthorization()
  },

  /**
   * Get current FamilyControls authorization status.
   */
  getAuthorizationStatus(): Promise<{ status: AuthorizationStatus }> {
    if (Platform.OS !== 'ios') return Promise.resolve({ status: 'approved' })
    if (!NativeScreenTime) return Promise.resolve({ status: 'unknown' })
    return NativeScreenTime.getAuthorizationStatus()
  },

  /**
   * Apply OS-level restrictions for the given session.
   *
   * @param blockedTokenData  Array of base64 ApplicationToken strings to block.
   *                          These are apps NOT on the whitelist.
   * @param durationMinutes   Session length. DeviceActivity will auto-clear at end.
   */
  applyRestrictions(
    blockedTokenData: string[],
    durationMinutes: number
  ): Promise<ApplyRestrictionsResult> {
    if (Platform.OS !== 'ios') {
      return Promise.resolve({ restricted: blockedTokenData.length, endsAt: Date.now() / 1000 + durationMinutes * 60 })
    }
    if (!NativeScreenTime) {
      return Promise.resolve({ restricted: 0, endsAt: Date.now() / 1000 + durationMinutes * 60 })
    }
    return NativeScreenTime.applyRestrictions(blockedTokenData, durationMinutes)
  },

  /**
   * Immediately clear all MonkMode restrictions.
   * Should only be called after override passcode is verified.
   */
  clearRestrictions(): Promise<ClearRestrictionsResult> {
    if (Platform.OS !== 'ios') return Promise.resolve({ cleared: true })
    if (!NativeScreenTime) return Promise.resolve({ cleared: true })
    return NativeScreenTime.clearRestrictions()
  },
}
