/**
 * Implementation intentions (Gollwitzer) — asked when a schedule is enabled.
 */

import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, T, S } from '../utils/styles'
import type { ImplementationIntention } from '../types/implementationIntention'
import { DeviceActivityModule } from '../native/DeviceActivityModule'

export type { ImplementationIntention }

interface Props {
  scheduleName: string
  scheduleId: string
  onComplete: () => void
  onSkip: () => void
}

const STORAGE_KEY = 'monkmode:implementation_intentions'

export async function getIntentionForSchedule(
  scheduleId: string
): Promise<ImplementationIntention | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const all: ImplementationIntention[] = JSON.parse(raw)
  return all.find(i => i.scheduleId === scheduleId) ?? null
}

export async function saveIntention(intention: ImplementationIntention): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  const all: ImplementationIntention[] = raw ? JSON.parse(raw) : []
  const filtered = all.filter(i => i.scheduleId !== intention.scheduleId)
  const next = [...filtered, intention]
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  await DeviceActivityModule.setAppGroupJSON('monk_implementation_intentions_json', next)
}

export const ImplementationIntentionModal: React.FC<Props> = ({
  scheduleName, scheduleId, onComplete, onSkip,
}) => {
  const [location, setLocation] = useState('')
  const [task, setTask] = useState('')
  const [step, setStep] = useState<'location' | 'task'>('location')

  const handleSave = async () => {
    if (task.trim().length < 2) return
    await saveIntention({
      scheduleId,
      scheduleName,
      location: location.trim(),
      task: task.trim(),
      createdAt: new Date().toISOString(),
    })
    onComplete()
  }

  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.modalWrap}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modal}>

            <Text style={styles.eyebrow}>IMPLEMENTATION INTENTION</Text>
            <Text style={styles.scienceNote}>
              Users who answer this are 2× more likely to complete sessions.
            </Text>

            {step === 'location' && (
              <View style={styles.stepWrap}>
                <Text style={styles.question}>
                  When "{scheduleName}" starts,{'\n'}where will you be?
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="At my desk at home"
                  placeholderTextColor={Colors.textDim}
                  value={location}
                  onChangeText={setLocation}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => location.trim().length > 0 && setStep('task')}
                />
                <TouchableOpacity
                  style={[S.primaryBtn, location.trim().length < 2 && { borderColor: Colors.border }]}
                  onPress={() => location.trim().length >= 2 && setStep('task')}
                  activeOpacity={0.7}
                >
                  <Text style={S.primaryBtnText}>NEXT →</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'task' && (
              <View style={styles.stepWrap}>
                <Text style={styles.question}>
                  What will you be working on?
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Chapter 3 of my thesis"
                  placeholderTextColor={Colors.textDim}
                  value={task}
                  onChangeText={setTask}
                  autoFocus
                  maxLength={80}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
                <TouchableOpacity
                  style={[S.primaryBtn, task.trim().length < 2 && { borderColor: Colors.border }]}
                  onPress={handleSave}
                  activeOpacity={0.7}
                >
                  <Text style={S.primaryBtnText}>LOCK IT IN →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStep('location')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backBtnText}>← BACK</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
              <Text style={styles.skipText}>SKIP THIS</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export const IntentionAnchorBanner: React.FC<{
  intention: ImplementationIntention
  timeLabel?: string
}> = ({ intention, timeLabel }) => (
  <View style={bannerStyles.wrap}>
    <Text style={bannerStyles.label}>YOUR INTENTION FOR THIS BLOCK</Text>
    {timeLabel ? (
      <Text style={bannerStyles.timeLine}>{timeLabel}</Text>
    ) : null}
    <Text style={bannerStyles.location}>{intention.location}</Text>
    <Text style={bannerStyles.task}>"{intention.task}"</Text>
  </View>
)

const bannerStyles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: Colors.borderMid,
    borderRadius: 2,
    padding: 12,
    gap: 4,
    marginBottom: 12,
  },
  label: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  timeLine: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textHi,
    letterSpacing: 0.5,
  },
  location: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  task: {
    ...T.sans,
    fontSize: 13,
    color: Colors.textSub,
    lineHeight: 20,
    fontStyle: 'italic',
  },
})

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'flex-end',
  },
  modalWrap: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.bgSurface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    padding: 28,
    paddingBottom: 48,
    gap: 16,
  },
  eyebrow: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  scienceNote: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    lineHeight: 16,
    letterSpacing: 0.3,
    borderLeftWidth: 1,
    borderLeftColor: Colors.borderMid,
    paddingLeft: 10,
  },
  stepWrap: {
    gap: 14,
  },
  question: {
    ...T.display,
    fontSize: 26,
    color: Colors.textHi,
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  input: {
    ...T.sans,
    fontSize: 15,
    color: Colors.textHi,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMid,
    paddingVertical: 10,
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backBtnText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 2,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  skipText: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
})
