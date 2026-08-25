// src/utils/keychain.ts
// Secure storage for MonkMode's override passcode using iOS Keychain.
// Uses react-native-keychain. The passcode is hashed before storage.
//
// IMPORTANT: The passcode is stored with kSecAttrAccessibleWhenUnlockedThisDeviceOnly
// — it cannot be backed up to iCloud and cannot be moved to another device.
// This is intentional: the passcode is device-local and security-sensitive.

import * as Keychain from 'react-native-keychain'
import QuickCrypto from 'react-native-quick-crypto'

const SERVICE_KEY = 'com.yuvi10.monkmode.override_passcode'

function hashPin(pin: string): string {
  return QuickCrypto.createHash('sha256').update(pin + 'monkmode_salt_v1').digest('hex')
}

/**
 * Store the override passcode in the iOS Keychain.
 * The passcode is hashed — it is never stored in plaintext.
 */
export async function setOverridePasscode(pin: string): Promise<void> {
  if (pin.length < 4) throw new Error('Passcode must be at least 4 digits')
  const hash = hashPin(pin)
  await Keychain.setGenericPassword('monkmode_override', hash, {
    service: SERVICE_KEY,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
  })
}

/**
 * Verify the provided passcode against the stored hash.
 * Returns true if correct, false otherwise.
 */
export async function verifyOverridePasscode(pin: string): Promise<boolean> {
  try {
    const result = await Keychain.getGenericPassword({ service: SERVICE_KEY })
    if (!result) return false
    const inputHash = hashPin(pin)
    return inputHash === result.password
  } catch {
    return false
  }
}

/**
 * Check whether an override passcode has been configured.
 */
export async function hasOverridePasscode(): Promise<boolean> {
  try {
    const result = await Keychain.getGenericPassword({ service: SERVICE_KEY })
    return !!result
  } catch {
    return false
  }
}

/**
 * Remove the stored override passcode.
 * After this, sessions can be ended without a code (unless hardLock is on).
 */
export async function clearOverridePasscode(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE_KEY })
}
