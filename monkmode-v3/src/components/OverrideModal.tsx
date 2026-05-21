/**
 * components/OverrideModal.tsx  (v2)
 *
 * Full 4-phase override flow:
 *   1. Anchor  — show the user's own commitment reason
 *   2. Passcode — numeric entry
 *   3. Justify  — "why right now?" (logged to stats)
 *   4. Cooldown — 60s non-skippable wait
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Vibration, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, T, S } from '../utils/styles'

interface Props {
  onConfirmedEnd: () => void
  onDismiss: () => void
  onJustification: (text: string) => void
  verifyPasscode: (pin: string) => Promise<boolean>
}

type Phase = 'anchor' | 'entry' | 'justify' | 'cooldown'

const COOLDOWN = 60

export const OverrideModal: React.FC<Props> = ({
  onConfirmedEnd, onDismiss, onJustification, verifyPasscode,
}) => {
  const [phase, setPhase] = useState<Phase>('anchor')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [cooldownLeft, setCooldownLeft] = useState(COOLDOWN)
  const [justification, setJustification] = useState('')
  const [commitment, setCommitment] = useState<{ reason: string; date: string } | null>(null)
  const shakeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    AsyncStorage.getItem('monkmode:commitment').then(raw => {
      if (raw) setCommitment(JSON.parse(raw))
    })
  }, [])

  useEffect(() => {
    if (phase !== 'cooldown') return
    const interval = setInterval(() => {
      setCooldownLeft(prev => {
        if (prev <= 1) { clearInterval(interval); onConfirmedEnd(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start()
  }

  const handleDigit = async (digit: string) => {
    const next = pin + digit
    setPin(next)
    if (next.length < 4) return

    const valid = await verifyPasscode(next)
    if (!valid) {
      shake()
      Vibration.vibrate([0, 80, 60, 80])
      setPinError(true)
      setTimeout(() => { setPin(''); setPinError(false) }, 1400)
    } else {
      setPhase('justify')
    }
  }

  const handleJustify = () => {
    if (justification.trim().length < 3) return
    onJustification(justification.trim())
    setPhase('cooldown')
    setCooldownLeft(COOLDOWN)
  }

  const dots = Array.from({ length: 4 }).map((_, i) => i < pin.length)

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.modal, { transform: [{ translateX: shakeAnim }] }]}>

          {phase === 'anchor' && (
            <View style={styles.section}>
              <Text style={styles.phaseLabel}>01 / 03 — YOUR COMMITMENT</Text>
              {commitment ? (
                <>
                  <Text style={styles.commitDate}>
                    {new Date(commitment.date).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.commitReason}>"{commitment.reason}"</Text>
                </>
              ) : (
                <Text style={styles.dimText}>No commitment on record.</Text>
              )}
              <Text style={styles.anchorQ}>Do you still want to end early?</Text>
              <TouchableOpacity style={S.primaryBtn} onPress={onDismiss} activeOpacity={0.7}>
                <Text style={S.primaryBtnText}>NO — STAY IN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.continueLink} onPress={() => setPhase('entry')} activeOpacity={0.7}>
                <Text style={styles.continueLinkText}>Override anyway</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'entry' && (
            <View style={styles.section}>
              <Text style={styles.phaseLabel}>02 / 03 — PASSCODE</Text>
              <Text style={styles.entryHint}>
                {pinError ? 'INCORRECT — TRY AGAIN' : 'ENTER OVERRIDE PASSCODE'}
              </Text>
              <View style={styles.dots}>
                {dots.map((filled, i) => (
                  <View key={i} style={[styles.dot, filled && styles.dotFilled]} />
                ))}
              </View>
              <View style={styles.numpad}>
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.numKey, !key && styles.numKeyInvisible]}
                    onPress={() => key === '⌫' ? setPin(p => p.slice(0, -1)) : key ? handleDigit(key) : null}
                    disabled={!key}
                    activeOpacity={0.5}
                  >
                    <Text style={styles.numKeyText}>{key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.cancelLink} onPress={onDismiss}>
                <Text style={styles.cancelLinkText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'justify' && (
            <View style={styles.section}>
              <Text style={styles.phaseLabel}>03 / 03 — LOG YOUR REASON</Text>
              <Text style={styles.dimText}>
                Write why you need to end early. This is logged and shown in your weekly stats.
              </Text>
              <TextInput
                style={styles.justifyInput}
                placeholder="I need to check something urgent."
                placeholderTextColor={Colors.textDim}
                value={justification}
                onChangeText={setJustification}
                multiline
                maxLength={140}
                autoFocus
              />
              <TouchableOpacity
                style={[S.primaryBtn, justification.trim().length < 3 && { borderColor: Colors.border }]}
                onPress={handleJustify}
                activeOpacity={0.7}
              >
                <Text style={S.primaryBtnText}>LOG & START COOLDOWN →</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'cooldown' && (
            <View style={[styles.section, styles.cooldownSection]}>
              <Text style={styles.cooldownNum}>{cooldownLeft}</Text>
              <Text style={styles.cooldownLabel}>SECONDS UNTIL UNLOCK</Text>
              <Text style={styles.dimText} numberOfLines={undefined}>
                Use this time.{'\n'}
                Is this really worth it?
              </Text>
            </View>
          )}

        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 24,
  },
  section: { gap: 14 },
  phaseLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  commitDate: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  commitReason: {
    ...T.sans,
    fontSize: 15,
    color: Colors.textSub,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  dimText: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  anchorQ: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textSub,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  continueLink: { alignItems: 'center', paddingVertical: 6 },
  continueLinkText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  entryHint: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1, borderColor: Colors.border,
  },
  dotFilled: {
    backgroundColor: Colors.textHi,
    borderColor: Colors.textHi,
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  numKey: {
    width: 68, height: 52,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  numKeyInvisible: { borderColor: 'transparent' },
  numKeyText: {
    ...T.display,
    fontSize: 20,
    color: Colors.textSub,
  },
  cancelLink: { alignItems: 'center', paddingVertical: 6 },
  cancelLinkText: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  justifyInput: {
    ...T.sans,
    fontSize: 14,
    color: Colors.textHi,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMid,
    paddingVertical: 10,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  cooldownSection: { alignItems: 'center', paddingVertical: 16 },
  cooldownNum: {
    ...T.display,
    fontSize: 80,
    color: Colors.borderHi,
    lineHeight: 76,
  },
  cooldownLabel: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
})
