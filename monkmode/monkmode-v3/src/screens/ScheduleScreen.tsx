/**
 * ScheduleScreen.tsx
 *
 * Configure recurring focus windows.
 * Minimal UI: time picker rows, day toggles, enable switch.
 * No calendar view, no color coding — just the raw schedule.
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native'
import { useScheduleStore, Schedule, DayOfWeek } from '../store/scheduleStore'
import { Colors, T, S } from '../utils/styles'
import { useGrowthStore } from '../store/growthStore'
import {
  ImplementationIntentionModal,
  getIntentionForSchedule,
} from '../components/ImplementationIntentionModal'

interface ScheduleScreenProps {
  onNeedPurchase?: () => void
}

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
]

const pad = (n: number) => String(n).padStart(2, '0')
const fmtTime = (h: number, m: number) => `${pad(h)}:${pad(m)}`

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ onNeedPurchase }) => {
  const { schedules, toggleSchedule, updateSchedule, addSchedule, deleteSchedule } = useScheduleStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [intentionFor, setIntentionFor] = useState<{ id: string; name: string } | null>(null)
  const { trackEvent } = useGrowthStore()

  const toggleExpand = (id: string) =>
    setExpandedId(prev => prev === id ? null : id)

  const toggleDay = (schedule: Schedule, day: DayOfWeek) => {
    const days = schedule.days.includes(day)
      ? schedule.days.filter(d => d !== day)
      : [...schedule.days, day]
    updateSchedule(schedule.id, { days })
  }

  const nudgeTime = (
    schedule: Schedule,
    field: 'startHour' | 'startMinute' | 'endHour' | 'endMinute',
    delta: number
  ) => {
    const isHour = field.endsWith('Hour')
    const current = schedule[field]
    const max = isHour ? 23 : 59
    const next = ((current + delta + max + 1) % (max + 1))
    updateSchedule(schedule.id, { [field]: next })
  }

  const handleNewSchedule = () => {
    addSchedule({
      name: `Block ${schedules.length + 1}`,
      enabled: false,
      days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      startHour: 9, startMinute: 0,
      endHour: 12, endMinute: 0,
      whitelistPresetId: null,
    })
    trackEvent('schedule_created')
  }

  return (
    <ScrollView style={S.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {intentionFor && (
        <ImplementationIntentionModal
          scheduleId={intentionFor.id}
          scheduleName={intentionFor.name}
          onComplete={() => setIntentionFor(null)}
          onSkip={() => setIntentionFor(null)}
        />
      )}

      <Text style={styles.pageTitle}>SCHEDULES.</Text>
      <Text style={styles.pageSubtitle}>
        PLAN THE WINDOWS.{'\n'}
        SCREEN TIME ENFORCES THE LIMITS.
      </Text>

      {schedules.map(schedule => (
        <View key={schedule.id} style={styles.card}>

          {/* Header row */}
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => toggleExpand(schedule.id)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.scheduleName}>{schedule.name.toUpperCase()}</Text>
              <Text style={styles.scheduleTime}>
                {fmtTime(schedule.startHour, schedule.startMinute)} → {fmtTime(schedule.endHour, schedule.endMinute)}{' '}
                · {schedule.days.map(d => d.toUpperCase().slice(0, 1)).join(' ')}
              </Text>
            </View>
            <Switch
              value={schedule.enabled}
              onValueChange={async (v) => {
                if (v) {
                  const r = await toggleSchedule(schedule.id, true)
                  if (!r.ok && r.needsPurchase) {
                    onNeedPurchase?.()
                    return
                  }
                  await trackEvent('schedule_enabled')
                  const existing = await getIntentionForSchedule(schedule.id)
                  if (!existing) {
                    setIntentionFor({ id: schedule.id, name: schedule.name })
                  }
                } else {
                  await toggleSchedule(schedule.id, false)
                }
              }}
              trackColor={{ false: Colors.border, true: Colors.borderHi }}
              thumbColor={schedule.enabled ? Colors.textHi : Colors.textMid}
              ios_backgroundColor={Colors.border}
            />
          </TouchableOpacity>

          {/* Expanded editor */}
          {expandedId === schedule.id && (
            <View style={styles.cardBody}>
              <View style={S.divider} />

              {/* Time pickers */}
              <View style={styles.timeRow}>
                <TimeField
                  label="FROM"
                  value={fmtTime(schedule.startHour, schedule.startMinute)}
                  onUp={() => nudgeTime(schedule, 'startHour', 1)}
                  onDown={() => nudgeTime(schedule, 'startHour', -1)}
                  onUpMin={() => nudgeTime(schedule, 'startMinute', 15)}
                  onDownMin={() => nudgeTime(schedule, 'startMinute', -15)}
                />
                <Text style={styles.timeSep}>→</Text>
                <TimeField
                  label="TO"
                  value={fmtTime(schedule.endHour, schedule.endMinute)}
                  onUp={() => nudgeTime(schedule, 'endHour', 1)}
                  onDown={() => nudgeTime(schedule, 'endHour', -1)}
                  onUpMin={() => nudgeTime(schedule, 'endMinute', 15)}
                  onDownMin={() => nudgeTime(schedule, 'endMinute', -15)}
                />
              </View>

              {/* Day toggles */}
              <View style={styles.daysRow}>
                {DAYS.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.dayBtn, schedule.days.includes(key) && styles.dayBtnActive]}
                    onPress={() => toggleDay(schedule, key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayBtnText, schedule.days.includes(key) && styles.dayBtnTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Delete */}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteSchedule(schedule.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteBtnText}>DELETE SCHEDULE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity style={[S.ghostBtn, styles.addBtn]} onPress={handleNewSchedule} activeOpacity={0.7}>
        <Text style={S.ghostBtnText}>+ ADD SCHEDULE</Text>
      </TouchableOpacity>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Personal build mode stores your intended focus windows. Pair these with iOS Screen Time schedules, Downtime, or supervised-device profiles for enforcement.
        </Text>
      </View>
    </ScrollView>
  )
}

interface TimeFieldProps {
  label: string
  value: string
  onUp: () => void
  onDown: () => void
  onUpMin: () => void
  onDownMin: () => void
}

const TimeField: React.FC<TimeFieldProps> = ({ label, value, onUp, onDown, onUpMin, onDownMin }) => {
  const [h, m] = value.split(':')
  return (
    <View style={styles.timeField}>
      <Text style={styles.timeFieldLabel}>{label}</Text>
      <View style={styles.timeFieldInner}>
        <View style={styles.timeUnit}>
          <TouchableOpacity onPress={onUp} style={styles.nudgeBtn}><Text style={styles.nudgeText}>▴</Text></TouchableOpacity>
          <Text style={styles.timeDigit}>{h}</Text>
          <TouchableOpacity onPress={onDown} style={styles.nudgeBtn}><Text style={styles.nudgeText}>▾</Text></TouchableOpacity>
        </View>
        <Text style={styles.timeColon}>:</Text>
        <View style={styles.timeUnit}>
          <TouchableOpacity onPress={onUpMin} style={styles.nudgeBtn}><Text style={styles.nudgeText}>▴</Text></TouchableOpacity>
          <Text style={styles.timeDigit}>{m}</Text>
          <TouchableOpacity onPress={onDownMin} style={styles.nudgeBtn}><Text style={styles.nudgeText}>▾</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 72,
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 12,
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
    letterSpacing: 2,
    textTransform: 'uppercase',
    lineHeight: 16,
    marginBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  scheduleName: {
    ...T.display,
    fontSize: 18,
    letterSpacing: 2,
  },
  scheduleTime: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    letterSpacing: 1,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 12,
  },
  timeField: {
    flex: 1,
    gap: 6,
  },
  timeFieldLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  timeFieldInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timeUnit: {
    alignItems: 'center',
    gap: 4,
  },
  nudgeBtn: {
    padding: 4,
  },
  nudgeText: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
  },
  timeDigit: {
    ...T.display,
    fontSize: 28,
    color: Colors.textHi,
    letterSpacing: 1,
    minWidth: 36,
    textAlign: 'center',
  },
  timeColon: {
    ...T.display,
    fontSize: 28,
    color: Colors.textMid,
    marginBottom: 2,
  },
  timeSep: {
    ...T.mono,
    fontSize: 12,
    color: Colors.textMid,
    marginTop: 20,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayBtn: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
  },
  dayBtnActive: {
    borderColor: Colors.borderHi,
    backgroundColor: Colors.bgCard,
  },
  dayBtnText: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    letterSpacing: 0,
  },
  dayBtnTextActive: {
    color: Colors.textHi,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  deleteBtnText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  addBtn: {
    marginTop: 4,
  },
  note: {
    paddingTop: 8,
  },
  noteText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    lineHeight: 16,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
})
