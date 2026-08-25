/**
 * Active session — timer, intention anchor, override flow, then SessionEndScreen.
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
import { IntentionAnchorBanner } from '../components/ImplementationIntentionModal'
import { SessionEndScreen } from './SessionEndScreen'
import { Colors, T, S } from '../utils/styles'
import { useGrowthStore } from '../store/growthStore'
import { useIAPStore } from '../store/iapStore'

const pad = (n: number) => String(n).padStart(2, '0')

export const FocusActiveScreen: React.FC = () => {
  const { endsAt, startedAt, durationMinutes, config, wallpaperMethod, endSession, intentionAnchor } =
    useSessionStore()
  const { installedApps, allowedTokens } = useWhitelistStore()
  const { recordOverrideAttempt, recordJustification, recordSessionComplete } = useStatsStore()
  const { trackEvent } = useGrowthStore()

  const [secsLeft, setSecsLeft] = useState(() =>
    Math.max(0, Math.floor(((endsAt ?? 0) - Date.now()) / 1000))
  )
  const [showOverride, setShowOverride] = useState(false)
  const [phase, setPhase] = useState<'active' | 'ended'>('active')
  const pulseAnim = useRef(new Animated.Value(0.4)).current
  const completedRef = useRef(false)

  useEffect(() => {
    const tick = () => setSecsLeft(Math.max(0, Math.floor(((endsAt ?? 0) - Date.now()) / 1000)))
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

  useEffect(() => {
    if (secsLeft > 0 || completedRef.current || phase !== 'active') return
    completedRef.current = true
    ;(async () => {
      try { await recordSessionComplete(durationMinutes, { source: 'manual' }) } catch {}
      try { await trackEvent('session_completed', { durationMinutes }) } catch {}
      if (!useIAPStore.getState().hasPurchased()) {
        useIAPStore.getState().incrementFreeSession()
      }
      setPhase('ended')
    })()
  }, [secsLeft, durationMinutes, phase, recordSessionComplete, trackEvent])

  const progress = endsAt && startedAt
    ? Math.min(1, (Date.now() - startedAt) / (endsAt - startedAt))
    : 0

  const allowedApps = installedApps.filter(a => allowedTokens.has(a.token)).slice(0, 3)

  const handleEndAttempt = () => {
    if (config.hardLock) {
      Vibration.vibrate([0, 80, 60, 80])
      // subtle feedback via progress bar flash — hard lock is intentional friction
      return
    }
    void recordOverrideAttempt(false)
    setShowOverride(true)
  }

  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60

  if (phase === 'ended') {
    return (
      <SessionEndScreen
        durationMinutes={durationMinutes}
        wasEarlyEnd={false}
        onDismiss={() => {
          void endSession()
        }}
      />
    )
  }

  return (
    <View style={styles.root}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>FOCUS</Text>
        <View style={styles.headerRight}>
          {wallpaperMethod !== 'none' && (
            <View style={styles.wallpaperBadge}>
              <Text style={styles.wallpaperBadgeText}>WP</Text>
            </View>
          )}
          <View style={S.pill}>
            <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
            <Text style={S.pillText}>LOCKED</Text>
          </View>
        </View>
      </View>

      {intentionAnchor && (
        <IntentionAnchorBanner intention={intentionAnchor} />
      )}

      <View style={styles.ringWrap}>
        <Animated.View style={[styles.ringGlow, { opacity: pulseAnim }]} />
        <View style={styles.ring}>
          <Text style={styles.timer}>{pad(mins)}:{pad(secs)}</Text>
        </View>
        <Text style={styles.sessionMeta}>REMAINING · {durationMinutes} MIN</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
      </View>

      <View style={styles.screenTimeReminder}>
        <Text style={styles.reminderText}>
          APP LIMITS ARE ENFORCED VIA SCREEN TIME.{'\n'}
          BLOCKED APPS WILL SHOW A LIMIT SCREEN.
        </Text>
      </View>

      {allowedApps.length > 0 && (
        <View style={styles.appsSection}>
          <Text style={S.sectionLabel}>ACCESSIBLE NOW</Text>
          <View style={styles.appGrid}>
            {allowedApps.map(app => (
              <View key={app.token} style={styles.appItem}>
                <View style={styles.appIcon}>
                  <Text style={styles.appIconText}>
                    {app.displayName.slice(0, 2).toUpperCase()}
                  </Text>
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
      )}

      <TouchableOpacity style={styles.endBtn} onPress={handleEndAttempt} activeOpacity={0.5}>
        <Text style={styles.endBtnText}>
          {config.hardLock
            ? 'HARD LOCK ACTIVE'
            : 'END SESSION EARLY'}
        </Text>
      </TouchableOpacity>

      {showOverride && (
        <OverrideModal
          verifyPasscode={verifyOverridePasscode}
          onConfirmedEnd={async () => {
            try { await recordSessionComplete(Math.max(1, Math.round((Date.now() - (startedAt ?? Date.now()))/60000)), { source: 'manual' }) } catch {}
            try { void recordOverrideAttempt(true) } catch {}
            await endSession()
            setShowOverride(false)
          }}
          onDismiss={() => setShowOverride(false)}
          onJustification={text => {
            void recordJustification('', text)
            void recordOverrideAttempt(true, text)
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wallpaperBadge: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  wallpaperBadgeText: {
    ...T.mono,
    fontSize: 7,
    color: Colors.textMid,
    letterSpacing: 1,
  },
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
    width: '100%', height: 1, backgroundColor: Colors.border,
    marginTop: 14, overflow: 'hidden',
  },
  progressFill: { height: 1, backgroundColor: Colors.borderHi },
  screenTimeReminder: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 12,
    marginBottom: 16,
  },
  reminderText: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 1.5,
    lineHeight: 14,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  appsSection: { marginBottom: 16 },
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
    letterSpacing: 2, textTransform: 'uppercase',
  },
})
