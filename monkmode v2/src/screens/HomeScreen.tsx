/**
 * screens/HomeScreen.tsx
 *
 * Primary screen. Two states:
 *   - Idle: clock, whitelist summary, Deep Focus card, Begin Session button
 *   - Active: delegates to FocusActiveScreen
 */

import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar,
} from 'react-native'
import { useSessionStore } from '../store/sessionStore'
import { useWhitelistStore } from '../store/whitelistStore'
import { useStatsStore } from '../store/statsStore'
import { FocusActiveScreen } from './FocusActiveScreen'
import { DeepFocusMode } from '../components/DeepFocusMode'
import { Colors, T, S } from '../utils/styles'

const pad = (n: number) => String(n).padStart(2, '0')

export const HomeScreen: React.FC = () => {
  const { status, config, beginSession } = useSessionStore()
  const { allowedTokens, installedApps } = useWhitelistStore()
  const { allTime } = useStatsStore()

  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(t)
  }, [])

  if (status === 'active') return <FocusActiveScreen />

  const allowedCount = allowedTokens.size
  const totalCount = installedApps.length
  const blockedCount = totalCount - allowedCount

  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  const dateStr = `${DAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()}`

  const handleBeginSession = async () => {
    const blockedTokens = installedApps
      .filter(a => !allowedTokens.has(a.token))
      .map(a => a.token)
    await beginSession(blockedTokens, config)
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

      {/* Status summary */}
      <View style={styles.summaryRow}>
        <View style={S.pill}>
          <View style={styles.dimDot} />
          <Text style={S.pillText}>NO SESSION ACTIVE</Text>
        </View>
      </View>

      {/* Whitelist snapshot */}
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
              <Text style={[styles.chipText, allowedTokens.has(app.token) && styles.chipTextAllowed]}>
                {app.displayName.toUpperCase().slice(0, 8)}
              </Text>
            </View>
          ))}
          {installedApps.length === 0 && (
            <Text style={styles.emptyChip}>Configure whitelist in settings →</Text>
          )}
        </View>
      </View>

      <View style={S.divider} />

      {/* Streak */}
      <View style={styles.streakRow}>
        <View style={styles.streakItem}>
          <Text style={styles.streakNum}>{allTime.currentStreak}</Text>
          <Text style={styles.streakLabel}>DAY STREAK</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakItem}>
          <Text style={styles.streakNum}>{allTime.totalSessions}</Text>
          <Text style={styles.streakLabel}>TOTAL SESSIONS</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakItem}>
          <Text style={styles.streakNum}>{allTime.totalHours}h</Text>
          <Text style={styles.streakLabel}>TOTAL ENFORCED</Text>
        </View>
      </View>

      <View style={S.divider} />

      {/* Deep Focus card */}
      <DeepFocusMode onSessionStart={() => {}} />

      {/* Begin Session */}
      <TouchableOpacity
        style={[S.primaryBtn, styles.beginBtn]}
        onPress={handleBeginSession}
        activeOpacity={0.7}
      >
        <Text style={S.primaryBtnText}>BEGIN SESSION →</Text>
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
  summaryRow: {
    flexDirection: 'row',
  },
  dimDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.textMid,
  },
  section: { gap: 10 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipAllowed: {
    borderColor: Colors.borderHi,
  },
  chipText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 1,
  },
  chipTextAllowed: {
    color: Colors.textHi,
  },
  emptyChip: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    letterSpacing: 0.5,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  streakNum: {
    ...T.display,
    fontSize: 28,
    color: Colors.textHi,
  },
  streakLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  streakDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: Colors.border,
  },
  beginBtn: {
    marginTop: 4,
  },
})
