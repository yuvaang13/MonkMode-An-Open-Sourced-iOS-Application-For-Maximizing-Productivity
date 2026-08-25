/**
 * FriendLockScreen.tsx
 *
 * The most powerful anti-bypass feature: delegate your passcode to a friend.
 * Flow:
 *   1. User generates a one-time QR code containing a signed token
 *   2. Friend scans it on their device, sets a new passcode on their end
 *   3. Original user's device now requires that friend-set passcode to override
 *   4. The original user genuinely does not know the passcode
 *
 * Implementation uses a shared App Group URL scheme + an encrypted token.
 * The friend's MonkMode app reads the QR, prompts them to enter a new passcode,
 * and sends it back via a deep link to the original device.
 *
 * In production: token exchange via iCloud CloudKit private database
 * (no server needed, private to the two users, E2E encrypted).
 * Scaffold shows the full UI flow with a placeholder QR.
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  ScrollView,
} from 'react-native'
import { generateFriendToken, revokeFriendLock } from '../utils/friendLock'
import { Colors, T, S } from '../utils/styles'

type Phase = 'intro' | 'generating' | 'awaiting' | 'active' | 'scan'

interface Props {
  mode: 'give' | 'receive'   // give = lock owner | receive = friend scanning QR
  incomingToken?: string      // deep-linked token when mode='receive'
  onDone: () => void
}

export const FriendLockScreen: React.FC<Props> = ({ mode, incomingToken, onDone }) => {
  const [phase, setPhase] = useState<Phase>(mode === 'receive' ? 'scan' : 'intro')
  const [token, setToken] = useState('')
  const [friendPasscode, setFriendPasscode] = useState('')
  const [isRevoked, setIsRevoked] = useState(false)
  const pulseAnim = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    if (phase !== 'awaiting') return
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
      ])
    ).start()
  }, [phase])

  const handleGenerate = async () => {
    setPhase('generating')
    const t = await generateFriendToken()
    setToken(t)
    setPhase('awaiting')
  }

  const handleFriendSetPasscode = async () => {
    if (friendPasscode.length < 4) return
    // Friend scanned and set passcode — in production this writes via CloudKit
    // to the originating device's private DB record
    setPhase('active')
    onDone()
  }

  const handleRevoke = async () => {
    await revokeFriendLock()
    setIsRevoked(true)
  }

  return (
    <ScrollView
      style={S.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {mode === 'give' && (
        <>
          {phase === 'intro' && (
            <View style={styles.section}>
              <Text style={styles.heading}>LOCK{'\n'}TO A{'\n'}FRIEND.</Text>
              <Text style={styles.body}>
                Generate a one-time code. Send it to someone you trust.
                They set your override passcode — you won't know it.
              </Text>
              <Text style={styles.body}>
                To end a session early, you'll need to ask them directly.
                That friction is the point.
              </Text>
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  YOUR FRIEND CAN REVOKE THIS AT ANY TIME.{'\n'}
                  CHOOSE SOMEONE WHO TAKES THIS SERIOUSLY.
                </Text>
              </View>
              <TouchableOpacity style={S.primaryBtn} onPress={handleGenerate} activeOpacity={0.7}>
                <Text style={S.primaryBtnText}>GENERATE CODE →</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'generating' && (
            <View style={styles.centerSection}>
              <Text style={styles.generatingText}>GENERATING...</Text>
            </View>
          )}

          {phase === 'awaiting' && (
            <View style={styles.section}>
              <Text style={styles.heading}>WAITING.</Text>
              <Text style={styles.body}>
                Show this code to your friend. They scan it in their MonkMode app.
              </Text>

              {/* QR placeholder — in production use react-native-qrcode-svg */}
              <Animated.View style={[styles.qrBox, { opacity: pulseAnim }]}>
                <View style={styles.qrGrid}>
                  {/* Simplified QR-like pattern for scaffold */}
                  {Array.from({ length: 49 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.qrCell,
                        // Corner squares + pseudo-random pattern
                        (i < 7 || (i >= 42) || (i % 7 === 0 && i <= 42) || (i % 7 === 6))
                          ? styles.qrCellDark
                          : (Math.abs(Math.sin(i * 13.7)) > 0.5 ? styles.qrCellDark : null),
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.tokenPreview} numberOfLines={1}>{token.slice(0, 24)}…</Text>
              </Animated.View>

              <Text style={styles.awaitingNote}>
                Waiting for your friend to scan and set a passcode…
              </Text>

              <TouchableOpacity style={S.ghostBtn} onPress={() => setPhase('intro')} activeOpacity={0.7}>
                <Text style={S.ghostBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'active' && !isRevoked && (
            <View style={styles.section}>
              <Text style={styles.heading}>LOCKED.</Text>
              <Text style={styles.body}>
                Your override passcode is now held by your friend.
                You do not know it.
              </Text>
              <View style={styles.activeIndicator}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>FRIEND LOCK ACTIVE</Text>
              </View>
              <Text style={[styles.body, { marginTop: 20 }]}>
                To unlock early, contact your friend directly and ask them to
                release the passcode. Or wait for your session to end.
              </Text>
              <TouchableOpacity
                style={[S.ghostBtn, { marginTop: 'auto' as any }]}
                onPress={handleRevoke}
                activeOpacity={0.7}
              >
                <Text style={S.ghostBtnText}>REVOKE FRIEND LOCK</Text>
              </TouchableOpacity>
            </View>
          )}

          {isRevoked && (
            <View style={styles.centerSection}>
              <Text style={styles.heading}>REVOKED.</Text>
              <Text style={styles.body}>Friend lock removed. You're back to your own passcode.</Text>
              <TouchableOpacity style={S.primaryBtn} onPress={onDone} activeOpacity={0.7}>
                <Text style={S.primaryBtnText}>DONE</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {mode === 'receive' && (
        <View style={styles.section}>
          <Text style={styles.heading}>SET THEIR{'\n'}PASSCODE.</Text>
          <Text style={styles.body}>
            Your friend is trusting you with this. Set a passcode they won't guess.
            Don't share it until they ask.
          </Text>
          {incomingToken && (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenLabel}>RECEIVED TOKEN</Text>
              <Text style={styles.tokenValue} numberOfLines={1}>{incomingToken.slice(0, 20)}…</Text>
            </View>
          )}
          <TextInput
            style={styles.passcodeInput}
            placeholder="Set a 4-digit passcode"
            placeholderTextColor={Colors.textDim}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            value={friendPasscode}
            onChangeText={setFriendPasscode}
          />
          <TouchableOpacity
            style={[S.primaryBtn, friendPasscode.length < 4 && { borderColor: Colors.border }]}
            onPress={handleFriendSetPasscode}
            activeOpacity={0.7}
          >
            <Text style={S.primaryBtnText}>SET & SEND →</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 48,
  },
  section: {
    flex: 1,
    gap: 16,
  },
  centerSection: {
    flex: 1,
    gap: 20,
    justifyContent: 'center',
  },
  heading: {
    ...T.display,
    fontSize: 60,
    lineHeight: 56,
    marginBottom: 8,
  },
  body: {
    ...T.mono,
    fontSize: 11,
    color: Colors.textSub,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  warningBox: {
    borderWidth: 1,
    borderColor: Colors.borderMid,
    padding: 14,
    borderRadius: 2,
  },
  warningText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 1.5,
    lineHeight: 16,
  },
  qrBox: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: Colors.borderMid,
    padding: 16,
    borderRadius: 2,
    alignItems: 'center',
    gap: 12,
  },
  qrGrid: {
    width: 140,
    height: 140,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qrCell: {
    width: 20,
    height: 20,
    backgroundColor: 'transparent',
  },
  qrCellDark: {
    backgroundColor: Colors.textHi,
  },
  tokenPreview: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  awaitingNote: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textHi,
  },
  activeText: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textHi,
    letterSpacing: 2,
  },
  generatingText: {
    ...T.display,
    fontSize: 32,
    color: Colors.textMid,
    letterSpacing: 4,
    textAlign: 'center',
  },
  tokenBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    borderRadius: 2,
  },
  tokenLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 2,
    marginBottom: 4,
  },
  tokenValue: {
    ...T.mono,
    fontSize: 11,
    color: Colors.textSub,
    letterSpacing: 1,
  },
  passcodeInput: {
    ...T.mono,
    fontSize: 24,
    color: Colors.textHi,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMid,
    paddingVertical: 12,
    letterSpacing: 8,
    textAlign: 'center',
  },
})
