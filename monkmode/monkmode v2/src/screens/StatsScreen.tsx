/**
 * StatsScreen.tsx
 *
 * The anti-dashboard. Raw, unforgiving usage numbers.
 * No charts, no "you improved 12%!", no color coding.
 * Just the truth in monospace.
 *
 * Data is sourced entirely from on-device SQLite via the statsStore.
 */

import React, { useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { useStatsStore } from '../store/statsStore'
import { Colors, T, S } from '../utils/styles'

export const StatsScreen: React.FC = () => {
  const { weekly, allTime, blockAttempts, justifications, loadStats } = useStatsStore()

  useEffect(() => { loadStats() }, [])

  const thisWeekAttempts = blockAttempts.slice(0, 7)
  const totalAttempts = thisWeekAttempts.reduce((s, d) => s + d.count, 0)
  const topOffender = blockAttempts
    .flatMap(d => d.apps)
    .reduce<Record<string, number>>((acc, app) => {
      acc[app] = (acc[app] ?? 0) + 1
      return acc
    }, {})
  const topApp = Object.entries(topOffender).sort((a, b) => b[1] - a[1])[0]

  return (
    <ScrollView style={S.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <Text style={styles.pageTitle}>RECORD.</Text>
      <Text style={styles.pageSubtitle}>NO SPIN. JUST NUMBERS.</Text>

      <View style={styles.section}>
        <Text style={S.sectionLabel}>THIS WEEK</Text>
        <View style={styles.statGrid}>
          <StatBlock label="Sessions completed" value={String(weekly.sessionsCompleted)} />
          <StatBlock label="Hours enforced" value={`${weekly.hoursEnforced}h`} />
          <StatBlock label="Override attempts" value={String(weekly.overrideAttempts)} />
          <StatBlock label="Successful overrides" value={String(weekly.overridesGranted)} />
        </View>
      </View>

      <View style={S.divider} />

      <View style={styles.section}>
        <Text style={S.sectionLabel}>BLOCK ATTEMPTS — PAST 7 DAYS</Text>
        <Text style={styles.brutalStat}>{totalAttempts}</Text>
        <Text style={styles.brutalLabel}>
          times you reached for a blocked app this week.
        </Text>
        {topApp && (
          <Text style={styles.brutalSub}>
            Most attempted: {topApp[0].toUpperCase()} — {topApp[1]}×
          </Text>
        )}
        <View style={styles.dayBars}>
          {thisWeekAttempts.map((day, i) => {
            const max = Math.max(...thisWeekAttempts.map(d => d.count), 1)
            return (
              <View key={i} style={styles.dayBarCol}>
                <View style={[styles.dayBar, { height: Math.max(2, (day.count / max) * 48) }]} />
                <Text style={styles.dayLabel}>{day.label}</Text>
              </View>
            )
          })}
        </View>
      </View>

      <View style={S.divider} />

      <View style={styles.section}>
        <Text style={S.sectionLabel}>YOUR OVERRIDE JUSTIFICATIONS</Text>
        <Text style={styles.contextNote}>
          Every time you ended a session early, you wrote why.
        </Text>
        {justifications.length === 0 ? (
          <Text style={styles.emptyNote}>No early exits. Good.</Text>
        ) : (
          justifications.slice(0, 5).map((j, i) => (
            <View key={i} style={styles.justificationRow}>
              <Text style={styles.justDate}>{j.date}</Text>
              <Text style={styles.justText}>"{j.text}"</Text>
            </View>
          ))
        )}
      </View>

      <View style={S.divider} />

      <View style={styles.section}>
        <Text style={S.sectionLabel}>ALL TIME</Text>
        <View style={styles.statGrid}>
          <StatBlock label="Total sessions" value={String(allTime.totalSessions)} />
          <StatBlock label="Total hours" value={`${allTime.totalHours}h`} />
          <StatBlock label="Longest streak" value={`${allTime.longestStreak}d`} />
          <StatBlock label="Current streak" value={`${allTime.currentStreak}d`} />
        </View>
        <View style={styles.singleStat}>
          <StatBlock
            label="Total block attempts (all time)"
            value={String(allTime.totalBlockAttempts)}
            wide
          />
        </View>
      </View>

    </ScrollView>
  )
}

interface StatBlockProps {
  label: string
  value: string
  wide?: boolean
}

const StatBlock: React.FC<StatBlockProps> = ({ label, value, wide }) => (
  <View style={[styles.statBlock, wide && styles.statBlockWide]}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
)

const styles = StyleSheet.create({
  content: {
    paddingTop: 72,
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 0,
  },
  pageTitle: {
    ...T.display,
    fontSize: 56,
    lineHeight: 52,
    marginBottom: 4,
  },
  pageSubtitle: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 36,
  },
  section: {
    paddingVertical: 24,
    gap: 0,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  singleStat: {
    marginTop: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 0,
  },
  statBlock: {
    width: '50%',
    padding: 14,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  statBlockWide: {
    width: '100%',
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  statValue: {
    ...T.display,
    fontSize: 32,
    color: Colors.textHi,
    marginBottom: 4,
  },
  statLabel: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
  brutalStat: {
    ...T.display,
    fontSize: 80,
    color: Colors.textHi,
    lineHeight: 76,
    letterSpacing: -1,
    marginTop: 12,
  },
  brutalLabel: {
    ...T.mono,
    fontSize: 12,
    color: Colors.textSub,
    lineHeight: 20,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  brutalSub: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    letterSpacing: 1,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  dayBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 20,
    height: 60,
  },
  dayBarCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  dayBar: {
    width: '100%',
    backgroundColor: Colors.borderHi,
    borderRadius: 1,
  },
  dayLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 1,
  },
  contextNote: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    lineHeight: 18,
    marginBottom: 16,
    marginTop: 4,
  },
  emptyNote: {
    ...T.mono,
    fontSize: 11,
    color: Colors.textMid,
    letterSpacing: 1,
  },
  justificationRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 4,
  },
  justDate: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  justText: {
    ...T.sans,
    fontSize: 13,
    color: Colors.textSub,
    lineHeight: 20,
    fontStyle: 'italic',
  },
})
