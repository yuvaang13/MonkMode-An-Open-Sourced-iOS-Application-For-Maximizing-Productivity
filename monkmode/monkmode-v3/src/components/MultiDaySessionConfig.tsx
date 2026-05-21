import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useSessionStore } from '../store/sessionStore'
import { Colors, T, S } from '../utils/styles'

const DAY_PRESETS = [1, 3, 7, 14, 30, 100]

export const MultiDaySessionConfig: React.FC = () => {
  const { config, updateConfig } = useSessionStore()
  const active = config.sessionKind === 'multiDay'

  const setTimed = () => updateConfig({ sessionKind: 'timed' })
  const setMultiDay = () => updateConfig({ sessionKind: 'multiDay' })

  const stepDays = (delta: number) => {
    const next = Math.max(1, Math.min(100, (config.durationDays ?? 1) + delta))
    updateConfig({ sessionKind: 'multiDay', durationDays: next })
  }

  return (
    <View style={styles.wrap}>
      <Text style={S.sectionLabel}>SESSION TYPE</Text>
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, !active && styles.modeBtnActive]}
          onPress={setTimed}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeText, !active && styles.modeTextActive]}>MINUTES</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, active && styles.modeBtnActive]}
          onPress={setMultiDay}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeText, active && styles.modeTextActive]}>DAYS</Text>
        </TouchableOpacity>
      </View>

      {active && (
        <View style={styles.dayPanel}>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => stepDays(-1)} activeOpacity={0.7}>
              <Text style={styles.stepText}>-</Text>
            </TouchableOpacity>
            <View style={styles.dayValue}>
              <Text style={styles.dayNum}>{config.durationDays}</Text>
              <Text style={styles.dayLabel}>DAYS</Text>
            </View>
            <TouchableOpacity style={styles.stepBtn} onPress={() => stepDays(1)} activeOpacity={0.7}>
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.presetRow}>
            {DAY_PRESETS.map(days => (
              <TouchableOpacity
                key={days}
                style={[styles.preset, config.durationDays === days && styles.presetActive]}
                onPress={() => updateConfig({ sessionKind: 'multiDay', durationDays: days })}
                activeOpacity={0.7}
              >
                <Text style={[styles.presetText, config.durationDays === days && styles.presetTextActive]}>
                  {days}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.note}>Daily check-ins keep the streak honest. Emergency exit still requires justification.</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeBtnActive: {
    borderColor: Colors.borderHi,
    backgroundColor: Colors.bgCard,
  },
  modeText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 1.5,
  },
  modeTextActive: {
    color: Colors.textHi,
  },
  dayPanel: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 12,
    gap: 12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    ...T.display,
    fontSize: 22,
    color: Colors.textHi,
  },
  dayValue: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dayNum: {
    ...T.display,
    fontSize: 38,
    lineHeight: 38,
  },
  dayLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 2,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  preset: {
    width: 38,
    height: 30,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetActive: {
    borderColor: Colors.borderHi,
  },
  presetText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
  },
  presetTextActive: {
    color: Colors.textHi,
  },
  note: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    lineHeight: 15,
    letterSpacing: 0.4,
  },
})
