/**
 * screens/SettingsScreen.tsx
 *
 * Configuration screen. Sections:
 *   - Session defaults (duration, break rhythm)
 *   - Enforcement (hard lock, override passcode, friend lock)
 *   - Aesthetics (grayscale, reduce motion)
 *   - Data (export, reset)
 *
 * No decorative elements. Every row does something real.
 */

import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSessionStore } from '../store/sessionStore'
import { hasOverridePasscode, clearOverridePasscode } from '../utils/keychain'
import { getFriendLockState } from '../utils/friendLock'
import { Colors, T, S } from '../utils/styles'

interface RowProps {
  label: string
  value?: string
  onPress?: () => void
  children?: React.ReactNode
  danger?: boolean
}

const Row: React.FC<RowProps> = ({ label, value, onPress, children, danger }) => (
  <TouchableOpacity
    style={styles.row}
    onPress={onPress}
    activeOpacity={onPress ? 0.6 : 1}
    disabled={!onPress && !children}
  >
    <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
    {children ?? (value !== undefined && <Text style={styles.rowValue}>{value}</Text>)}
  </TouchableOpacity>
)

export const SettingsScreen: React.FC = () => {
  const { config, updateSchedule } = useSessionStore() as any
  const sessionConfig = useSessionStore(s => s.config)
  const updateConfig = useSessionStore(s => s.updateConfig as any)

  const [hasPasscode, setHasPasscode] = useState(false)
  const [friendLockActive, setFriendLockActive] = useState(false)
  const [grayscale, setGrayscale] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    hasOverridePasscode().then(setHasPasscode)
    getFriendLockState().then(s => setFriendLockActive(s.active))
    AsyncStorage.getItem('monkmode:grayscale').then(v => setGrayscale(v === 'true'))
    AsyncStorage.getItem('monkmode:reduce_motion').then(v => setReduceMotion(v === 'true'))
  }, [])

  const toggleGrayscale = async (val: boolean) => {
    setGrayscale(val)
    await AsyncStorage.setItem('monkmode:grayscale', String(val))
    // In production: UIAccessibility.setGrayscale or Accessibility shortcut guidance
  }

  const toggleReduceMotion = async (val: boolean) => {
    setReduceMotion(val)
    await AsyncStorage.setItem('monkmode:reduce_motion', String(val))
  }

  const handleClearPasscode = () => {
    Alert.alert(
      'REMOVE PASSCODE',
      'Sessions can be ended without a code. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await clearOverridePasscode()
            setHasPasscode(false)
          },
        },
      ]
    )
  }

  const handleReset = () => {
    Alert.alert(
      'FULL RESET',
      'This clears all sessions, stats, schedules, and your commitment. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear()
            await clearOverridePasscode()
          },
        },
      ]
    )
  }

  const cycleDuration = () => {
    const options = [25, 45, 60, 90, 120]
    const idx = options.indexOf(sessionConfig.durationMinutes)
    const next = options[(idx + 1) % options.length]
    updateConfig?.({ durationMinutes: next })
  }

  const cycleBreak = () => {
    const options = [{ work: 25, rest: 5 }, { work: 50, rest: 10 }, { work: 90, rest: 20 }]
    const idx = options.findIndex(o => o.work === sessionConfig.breakIntervalMinutes)
    const next = options[(idx + 1) % options.length]
    updateConfig?.({ breakIntervalMinutes: next.work, breakDurationMinutes: next.rest })
  }

  return (
    <ScrollView style={S.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>CONFIG.</Text>

      {/* ── Session ── */}
      <Text style={S.sectionLabel}>SESSION</Text>
      <View style={styles.group}>
        <Row
          label="Default duration"
          value={`${sessionConfig.durationMinutes} MIN`}
          onPress={cycleDuration}
        />
        <View style={S.divider} />
        <Row
          label="Break rhythm"
          value={`${sessionConfig.breakIntervalMinutes}/${sessionConfig.breakDurationMinutes} MIN`}
          onPress={cycleBreak}
        />
      </View>

      {/* ── Enforcement ── */}
      <Text style={S.sectionLabel}>ENFORCEMENT</Text>
      <View style={styles.group}>
        <Row label="Hard lock (no early override)">
          <Switch
            value={sessionConfig.hardLock}
            onValueChange={v => updateConfig?.({ hardLock: v })}
            trackColor={{ false: Colors.border, true: Colors.borderHi }}
            thumbColor={sessionConfig.hardLock ? Colors.textHi : Colors.textMid}
            ios_backgroundColor={Colors.border}
          />
        </Row>
        <View style={S.divider} />
        <Row
          label="Override passcode"
          value={hasPasscode ? 'SET ••••' : 'NOT SET'}
          onPress={hasPasscode ? handleClearPasscode : undefined}
        />
        <View style={S.divider} />
        <Row
          label="Friend lock"
          value={friendLockActive ? 'ACTIVE' : 'OFF'}
        />
      </View>

      {/* ── Aesthetics ── */}
      <Text style={S.sectionLabel}>AESTHETICS</Text>
      <View style={styles.group}>
        <Row label="Grayscale during sessions">
          <Switch
            value={grayscale}
            onValueChange={toggleGrayscale}
            trackColor={{ false: Colors.border, true: Colors.borderHi }}
            thumbColor={grayscale ? Colors.textHi : Colors.textMid}
            ios_backgroundColor={Colors.border}
          />
        </Row>
        <View style={S.divider} />
        <Row label="Reduce motion">
          <Switch
            value={reduceMotion}
            onValueChange={toggleReduceMotion}
            trackColor={{ false: Colors.border, true: Colors.borderHi }}
            thumbColor={reduceMotion ? Colors.textHi : Colors.textMid}
            ios_backgroundColor={Colors.border}
          />
        </Row>
      </View>

      {/* ── Data ── */}
      <Text style={S.sectionLabel}>DATA</Text>
      <View style={styles.group}>
        <Row label="All data stored on-device only" value="NO CLOUD" />
        <View style={S.divider} />
        <Row label="Export session log" value="→" onPress={() => {}} />
      </View>

      {/* ── Danger Zone ── */}
      <Text style={S.sectionLabel}>DANGER ZONE</Text>
      <View style={styles.group}>
        <Row label="Full reset — clear all data" onPress={handleReset} danger />
      </View>

      <Text style={styles.version}>MONKMODE · BUILD 1</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 72,
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 10,
  },
  pageTitle: {
    ...T.display,
    fontSize: 56,
    lineHeight: 52,
    marginBottom: 20,
  },
  group: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    ...T.sans,
    fontSize: 13,
    color: Colors.textBody,
    fontWeight: '300',
    flex: 1,
  },
  rowLabelDanger: {
    color: Colors.textMid,
  },
  rowValue: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    letterSpacing: 1,
  },
  version: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 8,
  },
})
