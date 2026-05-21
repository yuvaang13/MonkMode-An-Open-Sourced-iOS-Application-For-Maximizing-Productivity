/**
 * CommitmentScreen.tsx
 *
 * First-launch onboarding. Not a tutorial — a ceremony.
 * The user writes *why* they want this. That reason surfaces
 * every time they attempt an early override.
 *
 * Steps:
 *   1. Intent — type your reason
 *   2. Setup — personal build Screen Time pairing
 *   3. Confirm — read it back, commit
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { T, S } from '../utils/styles'
import { useGrowthStore } from '../store/growthStore'
import { useSessionStore } from '../store/sessionStore'

type Step = 'intent' | 'permissions' | 'confirm'

interface Props {
  onComplete: () => void
}

export const CommitmentScreen: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('intent')
  const [reason, setReason] = useState('')
  const [goal, setGoal] = useState<'study' | 'deep_work' | 'build' | 'wellbeing'>('deep_work')
  const [authStatus, setAuthStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle')
  const fadeAnim = useRef(new Animated.Value(1)).current
  const { trackEvent } = useGrowthStore()
  const { updateConfig } = useSessionStore()

  useEffect(() => {
    trackEvent('onboarding_started')
  }, [])

  const transition = (next: Step) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start()
    setTimeout(() => setStep(next), 180)
  }

  const requestPermissions = async () => {
    setAuthStatus('pending')
    setAuthStatus('granted')
    setTimeout(() => transition('confirm'), 500)
  }

  const commit = async () => {
    const entry = {
      reason: reason.trim(),
      goal,
      date: new Date().toISOString(),
    }
    await AsyncStorage.setItem('monkmode:commitment', JSON.stringify(entry))
    await AsyncStorage.setItem('monkmode:onboarded', 'true')
    const recommendedMinutes = goal === 'study' ? 50 : goal === 'deep_work' ? 90 : goal === 'build' ? 60 : 25
    updateConfig({ durationMinutes: recommendedMinutes })
    await trackEvent('onboarding_goal_selected', { goal })
    await trackEvent('onboarding_completed', { goal })
    onComplete()
  }

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>

        {step === 'intent' && (
          <ScrollView
            contentContainerStyle={styles.stepContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepIndex}>01 / 03</Text>
            <Text style={styles.heading}>WHY ARE{'\n'}YOU HERE.</Text>
            <Text style={styles.body}>
              This is a behavior change system, not a timer. Pick your mission and write one honest sentence.
            </Text>
            <View style={styles.goalRow}>
              {[
                { key: 'study', label: 'EXAMS' },
                { key: 'deep_work', label: 'DEEP WORK' },
                { key: 'build', label: 'SHIP BUILD' },
                { key: 'wellbeing', label: 'RECLAIM TIME' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.goalChip, goal === item.key && styles.goalChipActive]}
                  onPress={() => setGoal(item.key as typeof goal)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.goalChipText, goal === item.key && styles.goalChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="I protect focus so I can finish what matters."
              placeholderTextColor="#2a2a2a"
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={140}
              autoFocus
              returnKeyType="done"
              blurOnSubmit
            />
            <Text style={styles.charCount}>{reason.length} / 140</Text>
            <TouchableOpacity
              style={[styles.btn, reason.trim().length < 8 && styles.btnDisabled]}
              onPress={() => reason.trim().length >= 8 && transition('permissions')}
              activeOpacity={0.7}
            >
              <Text style={styles.btnText}>CONTINUE →</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {step === 'permissions' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepIndex}>02 / 03</Text>
            <Text style={styles.heading}>PHONE{'\n'}SETUP.</Text>
            <Text style={styles.body}>
              This personal build does not need paid Apple entitlements. Pair it with iOS Screen Time, website blocking lists, or supervised-device profiles.
              No data leaves your device.
            </Text>

            <View style={styles.permissionList}>
              {[
                ['Screen Time', 'Manual app limits and passcode friction'],
                ['Website Lists', 'Domains to block or allow in filters'],
                ['Supervision Optional', 'Configurator profiles for stronger device rules'],
              ].map(([name, desc]) => (
                <View key={name} style={styles.permissionRow}>
                  <View style={[
                    styles.permissionDot,
                    authStatus === 'granted' && styles.permissionDotOn,
                  ]} />
                  <View>
                    <Text style={styles.permissionName}>{name}</Text>
                    <Text style={styles.permissionDesc}>{desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {authStatus === 'denied' && (
              <Text style={styles.errorText}>
                Setup can be finished later in Config.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.btn, authStatus === 'pending' && styles.btnDisabled]}
              onPress={requestPermissions}
              activeOpacity={0.7}
              disabled={authStatus === 'pending' || authStatus === 'granted'}
            >
              <Text style={styles.btnText}>
                {authStatus === 'pending' ? 'REQUESTING...' :
                 authStatus === 'granted' ? 'READY ✓' : 'I UNDERSTAND →'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'confirm' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepIndex}>03 / 03</Text>
            <Text style={styles.heading}>COMMIT.</Text>
            <Text style={styles.body}>
              Read this back. It will be your anchor.
            </Text>
            <View style={styles.commitCard}>
              <Text style={styles.commitDate}>{today}</Text>
              <Text style={styles.commitReason}>"{reason.trim()}"</Text>
            </View>
            <Text style={styles.body} numberOfLines={undefined}>
              This drives your lock friction, recovery missions, and weekly proof of discipline.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={commit} activeOpacity={0.7}>
              <Text style={styles.btnText}>I COMMIT →</Text>
            </TouchableOpacity>
          </View>
        )}

      </Animated.View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  inner: {
    flex: 1,
  },
  stepContainer: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  stepIndex: {
    ...T.mono,
    fontSize: 10,
    color: '#2a2a2a',
    letterSpacing: 3,
    marginBottom: 20,
  },
  heading: {
    ...T.display,
    fontSize: 64,
    color: '#f5f5f0',
    lineHeight: 60,
    letterSpacing: 1,
    marginBottom: 20,
  },
  body: {
    ...T.mono,
    fontSize: 11,
    color: '#444440',
    lineHeight: 20,
    letterSpacing: 0.5,
    marginBottom: 28,
  },
  input: {
    ...T.mono,
    fontSize: 15,
    color: '#f5f5f0',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    paddingVertical: 12,
    paddingHorizontal: 0,
    minHeight: 80,
    textAlignVertical: 'top',
    letterSpacing: 0.3,
  },
  goalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  goalChip: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 2,
  },
  goalChipActive: {
    borderColor: '#f5f5f0',
  },
  goalChipText: {
    ...T.mono,
    fontSize: 9,
    color: '#666',
    letterSpacing: 1.1,
  },
  goalChipTextActive: {
    color: '#f5f5f0',
  },
  charCount: {
    ...T.mono,
    fontSize: 9,
    color: '#2a2a2a',
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 28,
    letterSpacing: 1,
  },
  btn: {
    borderWidth: 1,
    borderColor: '#f5f5f0',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 2,
    marginTop: 'auto' as any,
  },
  btnDisabled: {
    borderColor: '#1f1f1f',
  },
  btnText: {
    ...T.display,
    fontSize: 14,
    color: '#f5f5f0',
    letterSpacing: 3,
  },
  permissionList: {
    gap: 16,
    marginBottom: 32,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  permissionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 4,
  },
  permissionDotOn: {
    backgroundColor: '#f5f5f0',
    borderColor: '#f5f5f0',
  },
  permissionName: {
    ...T.mono,
    fontSize: 11,
    color: '#888880',
    letterSpacing: 1,
  },
  permissionDesc: {
    ...T.mono,
    fontSize: 10,
    color: '#333',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  errorText: {
    ...T.mono,
    fontSize: 10,
    color: '#666',
    lineHeight: 18,
    marginBottom: 16,
  },
  commitCard: {
    borderWidth: 1,
    borderColor: '#1f1f1f',
    padding: 20,
    marginBottom: 28,
    borderRadius: 2,
  },
  commitDate: {
    ...T.mono,
    fontSize: 9,
    color: '#333',
    letterSpacing: 2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  commitReason: {
    ...T.sans,
    fontSize: 15,
    color: '#888880',
    lineHeight: 24,
    fontStyle: 'italic',
  },
})
