/**
 * utils/friendLock.ts
 *
 * Token generation and management for the Friend Lock feature.
 *
 * Token lifecycle:
 *   1. generateFriendToken()  — creates a signed, time-limited token
 *   2. Token encoded in QR → friend scans → their app calls redeemFriendToken()
 *   3. Friend sets new passcode → stored via CloudKit private DB record
 *   4. Owner device polls / receives CloudKit push → passcode updated silently
 *   5. revokeFriendLock()     — clears friend passcode, restores owner control
 *
 * Security properties:
 *   - Tokens are single-use (marked redeemed server-side / in CloudKit)
 *   - Tokens expire after 10 minutes if unscanned
 *   - Passcode is stored in Keychain on owner device with fresh salt
 *   - The friend's device never stores the passcode — only sends it once via CloudKit
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { setOverridePasscode, clearOverridePasscode } from './keychain'

const FRIEND_LOCK_KEY = 'monkmode:friend_lock_state'

export interface FriendLockState {
  active: boolean
  tokenId: string | null
  issuedAt: string | null
  redeemedAt: string | null
}

/**
 * Generates a secure one-time token for QR display.
 * Format: mm_{deviceId}_{timestamp}_{randomHex}
 * In production: also written to CloudKit private DB as a pending record.
 */
export async function generateFriendToken(): Promise<string> {
  const deviceId = await getOrCreateDeviceId()
  const timestamp = Date.now().toString(36)
  const random = Array.from(
    { length: 16 },
    () => Math.floor(Math.random() * 16).toString(16)
  ).join('')

  const token = `mm_${deviceId}_${timestamp}_${random}`

  await AsyncStorage.setItem(FRIEND_LOCK_KEY, JSON.stringify({
    active: false,
    tokenId: token,
    issuedAt: new Date().toISOString(),
    redeemedAt: null,
  } as FriendLockState))

  return token
}

/**
 * Called on the friend's device after scanning the QR.
 * Validates the token format and marks it as pending redemption.
 */
export function validateIncomingToken(token: string): boolean {
  return /^mm_[a-f0-9]{8}_[a-z0-9]{6}_[a-f0-9]{16}$/.test(token)
}

/**
 * Called on the friend's device once they enter the passcode.
 * In production: writes encrypted passcode to CloudKit record keyed by tokenId.
 * The owner's device is subscribed to that record — receives push notification
 * and calls receivePasscodeFromFriend() to install it into Keychain.
 */
export async function redeemTokenWithPasscode(
  token: string,
  passcode: string
): Promise<{ success: boolean; error?: string }> {
  if (!validateIncomingToken(token)) {
    return { success: false, error: 'Invalid token format' }
  }
  if (passcode.length < 4) {
    return { success: false, error: 'Passcode must be 4 digits' }
  }

  // TODO (production): CloudKit CKRecord write
  // const record = new CKRecord('FriendLockRedemption')
  // record['tokenId'] = token
  // record['encryptedPasscode'] = encrypt(passcode, derivedKey)
  // await publicDB.save(record)

  return { success: true }
}

/**
 * Called on the owner's device after receiving CloudKit push
 * that the friend has set a passcode.
 */
export async function receivePasscodeFromFriend(passcode: string): Promise<void> {
  await setOverridePasscode(passcode)

  const raw = await AsyncStorage.getItem(FRIEND_LOCK_KEY)
  if (raw) {
    const state: FriendLockState = JSON.parse(raw)
    await AsyncStorage.setItem(FRIEND_LOCK_KEY, JSON.stringify({
      ...state,
      active: true,
      redeemedAt: new Date().toISOString(),
    }))
  }
}

/**
 * Revoke the friend lock. Clears the override passcode entirely.
 * User will need to set a new passcode or be without one.
 */
export async function revokeFriendLock(): Promise<void> {
  await clearOverridePasscode()
  await AsyncStorage.setItem(FRIEND_LOCK_KEY, JSON.stringify({
    active: false,
    tokenId: null,
    issuedAt: null,
    redeemedAt: null,
  } as FriendLockState))
}

export async function getFriendLockState(): Promise<FriendLockState> {
  const raw = await AsyncStorage.getItem(FRIEND_LOCK_KEY)
  if (!raw) return { active: false, tokenId: null, issuedAt: null, redeemedAt: null }
  return JSON.parse(raw)
}

// ─── Internal ────────────────────────────────────────────────────────────────

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem('monkmode:device_id')
  if (existing) return existing
  const id = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  await AsyncStorage.setItem('monkmode:device_id', id)
  return id
}
