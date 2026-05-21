/**
 * screens/FocusActiveScreen.tsx  (v2)
 *
 * Active session view. Wired to all stores. Shows countdown,
 * progress, allowed apps, and gates early exit via OverrideModal.
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Vibration,
} from 'react-native'
import { useSessionStore } from '../store/sessionStore'
import { useWhitelistStore } from '../store/whitelistStore'
import { useStatsStore } from '../store/statsStore'
import { verifyOverridePasscode } from '../utils/keychain'
import { OverrideModal } from '../components/OverrideModal'
import { Colors, T, S } from '../utils/styles'

const pad = (n: number) => String(n).padStart(2, '0')

export const FocusActiveScreen: React.FC = () => {
  const { endsAt, startedAt, durationMinutes, config, endSession } = useSessionStore()
  const { installedApps, allowedTokens } = useWhitelistStore()
  const { recordOverrideAttempt, recordJustification } = useStatsStore()

  const [secsLeft, setSecsLeft] = useState(0)
  const [showOverride, setShowOverride] = useState(false)
  const pulseAnim = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const tick = () => {
      if (!endsAt) return
      setSecsLeft(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [endsAt])

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 2800, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const progress = (endsAt && startedAt)
    ? Math.min(1, (Date.now() - startedAt) / (endsAt - startedAt))
    : 0

  const allowedApps = installedApps.filter(a => allowedTokens.has(a.token)).slice(0, 3)

  const handleEndAttempt = () => {
    if (config.hardLock) { Vibration.vibrate(80); return }
    recordOverrideAttempt(false)
    setShowOverride(true)
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FOCUS</Text>
        <View style={S.pill}>
          <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
          <Text style={S.pillText}>LOCKED</Text>
        </View>
      </View>

      <View style={styles.ringWrap}>
        <Animated.View style={[styles.ringGlow, { opacity: pulseAnim }]} />
        <View style={styles.ring}>
          <Text style={styles.timer}>{pad(Math.floor(secsLeft / 60))}:{pad(secsLeft % 60)}</Text>
        </View>
        <Text style={styles.sessionMeta}>REMAINING · {durationMinutes} MIN SESSION</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
      </View>

      <View style={styles.appsSection}>
        <Text style={S.sectionLabel}>ACCESSIBLE NOW</Text>
        <View style={styles.appGrid}>
          {allowedApps.map(app => (
            <View key={app.token} style={styles.appItem}>
              <View style={styles.appIcon}>
                <Text style={styles.appIconText}>{app.displayName.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={styles.appName} numberOfLines={1}>
                {app.displayName.toUpperCase().slice(0, 5)}
              </Text>
            </View>
          ))}
          <View style={styles.appItem}>
            <View style={[styles.appIcon, styles.appIconSelf]}>
              <Text style={styles.appIconText}>MM</Text>
            </View>
            <Text style={styles.appName}>MONK</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.endBtn} onPress={handleEndAttempt} activeOpacity={0.5}>
        <Text style={styles.endBtnText}>
          {config.hardLock
            ? 'HARD LOCK ACTIVE — CANNOT END EARLY'
            : 'END SESSION EARLY (REQUIRES PASSCODE)'}
        </Text>
      </TouchableOpacity>

      {showOverride && (
        <OverrideModal
          verifyPasscode={verifyOverridePasscode}
          onConfirmedEnd={async () => {
            await endSession('__post_cooldown_clear__')
            setShowOverride(false)
          }}
          onDismiss={() => setShowOverride(false)}
          onJustification={(text) => {
            recordJustification('', text)
            recordOverrideAttempt(true, text)
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: { ...T.display, fontSize: 22, letterSpacing: 3 },
  pulseDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.textHi,
  },
  ringWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringGlow: {
    position: 'absolute',
    width: 190, height: 190, borderRadius: 95,
    borderWidth: 1, borderColor: Colors.borderMid,
  },
  ring: {
    width: 164, height: 164, borderRadius: 82,
    borderWidth: 1, borderColor: Colors.borderHi,
    alignItems: 'center', justifyContent: 'center',
  },
  timer: { ...T.display, fontSize: 44, color: Colors.textHi, letterSpacing: 2 },
  sessionMeta: {
    ...T.mono, fontSize: 9, color: Colors.textMid,
    letterSpacing: 3, textTransform: 'uppercase', marginTop: 20,
  },
  progressBar: {
    width: '100%', height: 1,
    backgroundColor: Colors.border,
    marginTop: 14, overflow: 'hidden',
  },
  progressFill: { height: 1, backgroundColor: Colors.borderHi },
  appsSection: { marginBottom: 20 },
  appGrid: { flexDirection: 'row', gap: 12, marginTop: 2 },
  appItem: { alignItems: 'center', gap: 5 },
  appIcon: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  appIconSelf: { borderStyle: 'dashed' },
  appIconText: { ...T.mono, fontSize: 9, color: Colors.textMid },
  appName: {
    ...T.mono, fontSize: 7, color: Colors.textMid,
    letterSpacing: 1, maxWidth: 44, textAlign: 'center',
  },
  endBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 2,
  },
  endBtnText: {
    ...T.mono, fontSize: 8, color: Colors.textDim,
    letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center',
  },
})
