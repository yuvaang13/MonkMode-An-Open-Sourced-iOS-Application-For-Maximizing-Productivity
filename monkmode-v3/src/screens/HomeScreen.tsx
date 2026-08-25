/**
 * screens/HomeScreen.tsx  (v3)
 *
 * Idle home screen with:
 *   - Screen Time setup status check (Option C enforcement)
 *   - Wallpaper preview card (shows the MonkMode wallpaper that will be applied)
 *   - Session start flow
 */

import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Image,
} from 'react-native'
import { useSessionStore } from '../store/sessionStore'
import { useWhitelistStore } from '../store/whitelistStore'
import { useStatsStore } from '../store/statsStore'
import { WallpaperModule } from '../native/WallpaperModule'
import { FocusActiveScreen } from './FocusActiveScreen'
import { MultiDayActiveScreen } from './MultiDayActiveScreen'
import { DeepFocusMode } from '../components/DeepFocusMode'
import { MultiDaySessionConfig } from '../components/MultiDaySessionConfig'
import { ScreenTimeGuideScreen } from './ScreenTimeGuideScreen'
import { Colors, T, S } from '../utils/styles'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useGrowthStore } from '../store/growthStore'
import { useIAPStore } from '../store/iapStore'
import { useScheduleStore } from '../store/scheduleStore'
import { getIntentionForSchedule } from '../components/ImplementationIntentionModal'

const pad = (n: number) => String(n).padStart(2, '0')

interface HomeScreenProps {
  onNeedPurchase?: (reason: 'session_limit') => void
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNeedPurchase }) => {
  const {
    status, config, screenTimeConfigured,
    activeSessionKind, beginSession, setScreenTimeConfigured, refreshRetentionState, recoveryMissionActive, useGraceSkip, graceSkipsRemaining, updateConfig,
  } = useSessionStore()
  const { allowedTokens, installedApps } = useWhitelistStore()
  const { allTime } = useStatsStore()
  const { trackEvent } = useGrowthStore()

  const [now, setNow] = useState(new Date())
  const [showGuide, setShowGuide] = useState(false)
  const [wallpaperPath, setWallpaperPath] = useState<string | null>(null)
  const [wallpaperFeedback, setWallpaperFeedback] = useState<string | null>(null)
  const [commitmentReason, setCommitmentReason] = useState<string>('')
  const [commitmentGoal, setCommitmentGoal] = useState<string>('deep_work')

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    WallpaperModule.getWallpaperPath().then(r => {
      if (r.exists && r.path) setWallpaperPath(r.path)
    }).catch(() => {})
    AsyncStorage.getItem('monkmode:commitment').then(raw => {
      if (!raw) return
      try {
        const parsed = JSON.parse(raw)
        setCommitmentReason(parsed.reason ?? '')
        setCommitmentGoal(parsed.goal ?? 'deep_work')
      } catch { /* ignore corrupt */ }
    }).catch(() => {})
    refreshRetentionState()
  }, [])

  if (status === 'active') {
    return activeSessionKind === 'multiDay' ? <MultiDayActiveScreen /> : <FocusActiveScreen />
  }
  if (showGuide) {
    return (
      <ScreenTimeGuideScreen
        onComplete={() => {
          setScreenTimeConfigured(true)
          setShowGuide(false)
        }}
        onSkip={() => setShowGuide(false)}
      />
    )
  }

  const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT']
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  const dateStr = `${DAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()}`

  const allowedCount = allowedTokens.size
  const blockedCount = Math.max(0, installedApps.length - allowedCount)

  const handleBeginSession = async () => {
    if (!useIAPStore.getState().canStartSession()) {
      onNeedPurchase?.('session_limit')
      return
    }
    const enabledSchedules = useScheduleStore.getState().schedules.filter(s => s.enabled)
    let intention = null
    for (const s of enabledSchedules) {
      intention = await getIntentionForSchedule(s.id)
      if (intention) break
    }
    const firstSession = allTime.totalSessions === 0
    const result = await beginSession(intention)
    const eventPayload: Record<string, string | number | boolean> = {
      durationMinutes: config.sessionKind === 'multiDay' ? config.durationDays * 24 * 60 : config.durationMinutes,
      sessionKind: config.sessionKind,
      goal: commitmentGoal,
    }
    if (config.sessionKind === 'multiDay') eventPayload.durationDays = config.durationDays
    await trackEvent(firstSession ? 'first_session_started' : 'session_started', eventPayload)
    if (result.wallpaperMethod === 'photos_fallback') {
      setWallpaperFeedback(
        'Wallpaper saved to your Camera Roll. Open Photos and set it as your wallpaper to complete the immersion.'
      )
      setTimeout(() => setWallpaperFeedback(null), 6000)
    }
  }

  return (
    <ScrollView
      style={S.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" />

      {/* Clock */}
      <Text style={styles.clock}>{timeStr}</Text>
      <Text style={styles.date}>{dateStr}</Text>
      <View style={styles.positioningCard}>
        <Text style={styles.positioningTitle}>PROTECT FOCUS. PROVE DISCIPLINE.</Text>
        <Text style={styles.positioningBody}>
          MonkMode is your behavior system: commitment, lock friction, and weekly proof.
        </Text>
      </View>

      {/* Status pill */}
      <View style={styles.pillRow}>
        <View style={S.pill}>
          <View style={styles.idleDot} />
          <Text style={S.pillText}>NO SESSION ACTIVE</Text>
        </View>
      </View>

      {/* Screen Time setup banner */}
      {!screenTimeConfigured && (
        <TouchableOpacity
          style={styles.setupBanner}
          onPress={() => setShowGuide(true)}
          activeOpacity={0.7}
        >
          <View style={styles.setupBannerLeft}>
            <Text style={styles.setupBannerTitle}>SCREEN TIME NOT CONFIGURED</Text>
            <Text style={styles.setupBannerSub}>
              Set up once to enable app blocking. 90 seconds.
            </Text>
          </View>
          <Text style={styles.setupBannerArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Wallpaper feedback */}
      {wallpaperFeedback && (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackText}>{wallpaperFeedback}</Text>
        </View>
      )}

      {/* Whitelist summary */}
      <View style={styles.section}>
        <Text style={S.sectionLabel}>
          WHITELIST — {allowedCount} ALLOWED · {blockedCount} BLOCKED
        </Text>
        <View style={styles.chipRow}>
          {installedApps.slice(0, 8).map(app => (
            <View
              key={app.token}
              style={[styles.chip, allowedTokens.has(app.token) && styles.chipAllowed]}
            >
              <Text style={[
                styles.chipText,
                allowedTokens.has(app.token) && styles.chipTextAllowed,
              ]}>
                {app.displayName.toUpperCase().slice(0, 8)}
              </Text>
            </View>
          ))}
          {installedApps.length === 0 && (
            <Text style={styles.emptyNote}>No apps configured — edit whitelist</Text>
          )}
        </View>
      </View>

      <View style={S.divider} />

      {commitmentReason.length > 0 && (
        <View style={styles.section}>
          <Text style={S.sectionLabel}>MISSION ANCHOR</Text>
          <View style={styles.anchorCard}>
            <Text style={styles.anchorGoal}>PRIMARY GOAL · {commitmentGoal.replace(/_/g, ' ').toUpperCase()}</Text>
            <Text style={styles.anchorText}>"{commitmentReason}"</Text>
          </View>
        </View>
      )}

      <View style={S.divider} />

      {/* Wallpaper preview */}
      <View style={styles.section}>
        <Text style={S.sectionLabel}>SESSION WALLPAPER</Text>
        <View style={styles.wallpaperPreview}>
          {wallpaperPath ? (
            <Image
              source={{ uri: wallpaperPath }}
              style={styles.wallpaperThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.wallpaperPlaceholder}>
              <Text style={styles.wallpaperPlaceholderText}>MONK MODE</Text>
              <Text style={styles.wallpaperPlaceholderSub}>Generated on first session</Text>
            </View>
          )}
          <Text style={styles.wallpaperCaption}>
            Applied when session starts. Restored when it ends.
          </Text>
        </View>
      </View>

      <View style={S.divider} />

      <View style={styles.streakRow}>
        <View style={styles.streakItem}>
          <Text style={styles.streakNum}>{allTime.totalSessions}</Text>
          <Text style={styles.streakLabel}>SESSIONS</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakItem}>
          <Text style={styles.streakNum}>{allTime.totalHours}h</Text>
          <Text style={styles.streakLabel}>ENFORCED</Text>
        </View>
      </View>

      <View style={S.divider} />

      <View style={styles.section}>
        <Text style={S.sectionLabel}>QUICK START BLOCKS (UNDER 2 MIN)</Text>
        <View style={styles.quickRow}>
          {[25, 50, 90].map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={[styles.quickBtn, config.sessionKind === 'timed' && config.durationMinutes === minutes && styles.quickBtnActive]}
              onPress={() => updateConfig({ sessionKind: 'timed', durationMinutes: minutes })}
              activeOpacity={0.7}
            >
              <Text style={[styles.quickBtnText, config.sessionKind === 'timed' && config.durationMinutes === minutes && styles.quickBtnTextActive]}>
                {minutes} MIN
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={S.divider} />

      <MultiDaySessionConfig />

      <View style={S.divider} />

      {recoveryMissionActive && (
        <View style={styles.recoveryCard}>
          <Text style={styles.recoveryTitle}>RECOVERY MISSION ACTIVE</Text>
          <Text style={styles.recoveryBody}>
            Complete one focus session today to clear recovery.
          </Text>
          <TouchableOpacity
            style={styles.recoveryAction}
            onPress={useGraceSkip}
            activeOpacity={0.7}
            disabled={graceSkipsRemaining <= 0}
          >
            <Text style={styles.recoveryActionText}>
              {graceSkipsRemaining > 0
                ? `USE WEEKLY GRACE SKIP (${graceSkipsRemaining} LEFT)`
                : 'NO GRACE SKIPS LEFT THIS WEEK'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={S.divider} />

      {/* Deep Focus */}
      <DeepFocusMode onSessionStart={() => {
        if (!useIAPStore.getState().canStartSession()) onNeedPurchase?.('session_limit')
      }} />

      {/* Begin */}
      <TouchableOpacity
        style={[S.primaryBtn, styles.beginBtn]}
        onPress={handleBeginSession}
        activeOpacity={0.7}
      >
        <Text style={S.primaryBtnText}>
          {config.sessionKind === 'multiDay' ? `BEGIN ${config.durationDays}-DAY LOCK →` : 'BEGIN SESSION →'}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20,
  },
  clock: {
    ...T.display,
    fontSize: 88,
    lineHeight: 80,
    letterSpacing: -1,
  },
  date: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: -4,
  },
  positioningCard: {
    borderWidth: 1,
    borderColor: Colors.borderMid,
    borderRadius: 2,
    padding: 12,
    gap: 6,
  },
  positioningTitle: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textHi,
    letterSpacing: 1.5,
  },
  positioningBody: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textSub,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  pillRow: { flexDirection: 'row' },
  idleDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.textMid,
  },
  setupBanner: {
    borderWidth: 1,
    borderColor: Colors.borderMid,
    borderRadius: 2,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setupBannerLeft: { flex: 1, gap: 4 },
  setupBannerTitle: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textHi,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  setupBannerSub: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 0.5,
  },
  setupBannerArrow: {
    ...T.mono,
    fontSize: 14,
    color: Colors.textMid,
  },
  feedbackBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 12,
  },
  feedbackText: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textSub,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  section: { gap: 10 },
  anchorCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 12,
    gap: 8,
  },
  anchorGoal: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 1.5,
  },
  anchorText: {
    ...T.sans,
    fontSize: 14,
    color: Colors.textSub,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 2, paddingHorizontal: 8, paddingVertical: 4,
  },
  chipAllowed: { borderColor: Colors.borderHi },
  chipText: { ...T.mono, fontSize: 9, color: Colors.textMid, letterSpacing: 1 },
  chipTextAllowed: { color: Colors.textHi },
  emptyNote: { ...T.mono, fontSize: 10, color: Colors.textMid },
  wallpaperPreview: { gap: 8 },
  wallpaperThumb: {
    width: '100%',
    height: 120,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wallpaperPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  wallpaperPlaceholderText: {
    ...T.display,
    fontSize: 28,
    color: Colors.borderHi,
    letterSpacing: 4,
  },
  wallpaperPlaceholderSub: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  wallpaperCaption: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakItem: { flex: 1, alignItems: 'center', gap: 4 },
  streakNum: { ...T.display, fontSize: 28, color: Colors.textHi },
  streakLabel: {
    ...T.mono, fontSize: 8, color: Colors.textMid,
    letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center',
  },
  streakDivider: {
    width: StyleSheet.hairlineWidth, height: 32, backgroundColor: Colors.border,
  },
  beginBtn: { marginTop: 4 },
  recoveryCard: {
    borderWidth: 1,
    borderColor: Colors.borderMid,
    borderRadius: 2,
    padding: 12,
    gap: 8,
  },
  recoveryTitle: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textHi,
    letterSpacing: 1.5,
  },
  recoveryBody: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textSub,
    lineHeight: 16,
  },
  recoveryAction: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    paddingVertical: 9,
    alignItems: 'center',
  },
  recoveryActionText: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 1.2,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    paddingVertical: 10,
    alignItems: 'center',
  },
  quickBtnActive: {
    borderColor: Colors.borderHi,
    backgroundColor: Colors.bgCard,
  },
  quickBtnText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 1.2,
  },
  quickBtnTextActive: {
    color: Colors.textHi,
  },
})
