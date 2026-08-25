import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Vibration,
} from 'react-native'
import { useSessionStore } from '../store/sessionStore'
import { useStatsStore } from '../store/statsStore'
import { verifyOverridePasscode } from '../utils/keychain'
import { OverrideModal } from '../components/OverrideModal'
import { IntentionAnchorBanner } from '../components/ImplementationIntentionModal'
import { SessionEndScreen } from './SessionEndScreen'
import { Colors, T, S } from '../utils/styles'

const dayMs = 24 * 60 * 60 * 1000

function localDateKey(date = new Date()) {
  return date.toISOString().split('T')[0]
}

export const MultiDayActiveScreen: React.FC = () => {
  const {
    startedAt, endsAt, activeTotalDays, dailyCheckIns, config, intentionAnchor,
    markDailyCheckIn, endSession,
  } = useSessionStore()
  const { recordOverrideAttempt, recordJustification, recordSessionComplete } = useStatsStore()

  const [now, setNow] = useState(Date.now())
  const [showOverride, setShowOverride] = useState(false)
  const [phase, setPhase] = useState<'active' | 'ended'>('active')
  const pulseAnim = useRef(new Animated.Value(0.35)).current
  const completedRef = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 3200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 3200, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  useEffect(() => {
    if (!endsAt || now < endsAt || completedRef.current || phase !== 'active') return
    completedRef.current = true
    ;(async () => {
      await recordSessionComplete(activeTotalDays * 24 * 60, { source: 'multi_day' })
      setPhase('ended')
    })()
  }, [activeTotalDays, endsAt, now, phase, recordSessionComplete])

  const today = localDateKey()
  const checkedInToday = dailyCheckIns.includes(today)
  const dayNumber = useMemo(() => {
    if (!startedAt) return 1
    return Math.max(1, Math.min(activeTotalDays, Math.floor((now - startedAt) / dayMs) + 1))
  }, [activeTotalDays, now, startedAt])
  const progress = startedAt && endsAt
    ? Math.max(0, Math.min(1, (now - startedAt) / (endsAt - startedAt)))
    : 0
  const daysRemaining = Math.max(0, activeTotalDays - dayNumber)

  const handleEmergencyExit = () => {
    if (config.hardLock) { Vibration.vibrate(80); return }
    recordOverrideAttempt(false)
    setShowOverride(true)
  }

  if (phase === 'ended') {
    return (
      <SessionEndScreen
        durationMinutes={activeTotalDays * 24 * 60}
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
        <Text style={styles.headerTitle}>MONK MODE</Text>
        <View style={S.pill}>
          <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
          <Text style={S.pillText}>DAY LOCK</Text>
        </View>
      </View>

      {intentionAnchor && (
        <IntentionAnchorBanner intention={intentionAnchor} />
      )}

      <View style={styles.hero}>
        <Text style={styles.dayText}>DAY {dayNumber}</Text>
        <Text style={styles.totalText}>OF {activeTotalDays}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
        <Text style={styles.remaining}>
          {daysRemaining === 0 ? 'FINAL DAY' : `${daysRemaining} DAYS REMAINING`}
        </Text>
      </View>

      <View style={styles.checkInCard}>
        <Text style={styles.checkInTitle}>DAILY CHECK-IN</Text>
        <Text style={styles.checkInBody}>
          Confirm you are still choosing the lock today. This records discipline without ending the session.
        </Text>
        <TouchableOpacity
          style={[S.primaryBtn, checkedInToday && styles.checkInDone]}
          onPress={markDailyCheckIn}
          activeOpacity={0.7}
          disabled={checkedInToday}
        >
          <Text style={S.primaryBtnText}>
            {checkedInToday ? 'CHECKED IN' : 'CHECK IN'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.checkInStrip}>
        {Array.from({ length: activeTotalDays }).slice(0, 100).map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dayDot,
              idx + 1 < dayNumber && styles.dayDotPast,
              idx + 1 === dayNumber && styles.dayDotCurrent,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.endBtn} onPress={handleEmergencyExit} activeOpacity={0.5}>
        <Text style={styles.endBtnText}>
          {config.hardLock ? 'HARD LOCK ACTIVE' : 'EMERGENCY EXIT'}
        </Text>
      </TouchableOpacity>

      {showOverride && (
        <OverrideModal
          verifyPasscode={verifyOverridePasscode}
          onConfirmedEnd={async () => {
            await endSession()
            setShowOverride(false)
          }}
          onDismiss={() => setShowOverride(false)}
          onJustification={text => {
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
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...T.display,
    fontSize: 22,
    letterSpacing: 3,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textHi,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dayText: {
    ...T.display,
    fontSize: 74,
    lineHeight: 76,
    letterSpacing: 3,
  },
  totalText: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    letterSpacing: 3,
  },
  progressBar: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: 1,
    backgroundColor: Colors.borderHi,
  },
  remaining: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 2,
  },
  checkInCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 14,
    gap: 12,
  },
  checkInTitle: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textHi,
    letterSpacing: 1.5,
  },
  checkInBody: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textSub,
    lineHeight: 16,
  },
  checkInDone: {
    borderColor: Colors.borderHi,
    backgroundColor: Colors.bgCard,
  },
  checkInStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dayDotPast: {
    backgroundColor: Colors.borderMid,
  },
  dayDotCurrent: {
    backgroundColor: Colors.textHi,
  },
  endBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtnText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
})
