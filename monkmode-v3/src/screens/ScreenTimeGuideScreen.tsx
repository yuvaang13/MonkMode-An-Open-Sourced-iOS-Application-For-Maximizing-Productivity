/**
 * screens/ScreenTimeGuideScreen.tsx
 *
 * Replaces the FamilyControls programmatic enforcement.
 * Walks the user through setting iOS Screen Time App Limits manually.
 *
 * Flow:
 *   Step 1 — Explain what we're doing and why
 *   Step 2 — Open Settings → Screen Time (deep link)
 *   Step 3 — Guide: App Limits → Add Limit → select blocked categories
 *   Step 4 — Set the limit to "1 minute" (effectively blocks during session)
 *   Step 5 — Enable "Block at End of Limit" + set a passcode
 *   Step 6 — Confirm setup, return to MonkMode
 *
 * The user's whitelist is used to generate the list of categories/apps
 * they should NOT add a limit to (i.e., their allowed apps).
 */

import React, { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Linking, Animated, Platform,
} from 'react-native'
import { useWhitelistStore } from '../store/whitelistStore'
import { Colors, T, S } from '../utils/styles'

interface Props {
  onComplete: () => void
  onSkip: () => void
}

type Step = 0 | 1 | 2 | 3 | 4 | 5

const STEPS = [
  {
    index: '01',
    title: 'HOW THIS\nWORKS.',
    body: "MonkMode pairs with iOS's built-in Screen Time — no paid developer account needed. Screen Time enforces the block; MonkMode runs the timer, check-ins, stats, and accountability.",
    action: 'START SETUP →',
    note: null,
  },
  {
    index: '02',
    title: 'OPEN\nSETTINGS.',
    body: 'Go to Settings → Screen Time. If Screen Time is off, tap "Turn On Screen Time" and follow the prompts. Select "This is My iPhone".',
    action: 'OPEN SETTINGS →',
    note: 'We\'ll open it for you.',
  },
  {
    index: '03',
    title: 'APP\nLIMITS.',
    body: 'Inside Screen Time, tap "App Limits" → "Add Limit". Select the apps or categories you want restricted when you are in MonkMode.\n\nLeave essential tools unrestricted.',
    action: 'GOT IT →',
    note: null,
  },
  {
    index: '04',
    title: 'SET TO\n1 MIN.',
    body: 'Set the time limit to 1 minute. After those apps hit the limit, iOS blocks them behind your Screen Time passcode.\n\nMake sure "Block at End of Limit" is turned ON.',
    action: 'DONE →',
    note: 'This is the key setting.',
  },
  {
    index: '05',
    title: 'SET A\nPASSCODE.',
    body: 'Back in Screen Time, tap "Use Screen Time Passcode". Set a 4-digit code.\n\nFor maximum effect: give this code to a trusted person and don\'t memorise it.',
    action: 'PASSCODE SET →',
    note: 'Do not set the same code as your phone unlock.',
  },
  {
    index: '06',
    title: 'ALL\nDONE.',
    body: "Screen Time is now configured. MonkMode will track your sessions and show the setup you committed to.\n\nFor strongest friction, have someone else hold the Screen Time passcode.",
    action: 'START USING MONKMODE →',
    note: null,
  },
]

export const ScreenTimeGuideScreen: React.FC<Props> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<Step>(0)
  const { installedApps, allowedTokens } = useWhitelistStore()
  const fadeAnim = useRef(new Animated.Value(1)).current

  const allowedApps = installedApps.filter(a => allowedTokens.has(a.token))

  const transition = (next: Step) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start()
    setTimeout(() => setStep(next), 140)
  }

  const handleAction = () => {
    if (step === 1) {
      Linking.openURL('App-prefs:SCREEN_TIME').catch(() =>
        Linking.openURL('app-settings:')
      )
    }
    if (step === 5) {
      onComplete()
      return
    }
    transition(((step + 1) as Step))
  }

  const current = STEPS[step]

  return (
    <ScrollView
      style={S.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>

        {/* Progress dots */}
        <View style={styles.progressRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.progressDot, i <= step && styles.progressDotActive]}
            />
          ))}
        </View>

        <Text style={styles.stepIndex}>{current.index} / 06</Text>
        <Text style={styles.heading}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>

        {/* Step 3: show the user's allowed apps so they know what NOT to limit */}
        {step === 2 && allowedApps.length > 0 && (
          <View style={styles.allowedBox}>
            <Text style={styles.allowedBoxLabel}>DO NOT LIMIT THESE APPS</Text>
            <Text style={styles.allowedBoxSub}>
              These are on your whitelist — leave them unrestricted.
            </Text>
            <View style={styles.chipRow}>
              {allowedApps.map(app => (
                <View key={app.token} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {app.displayName.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 4: visual diagram of the toggle */}
        {step === 3 && (
          <View style={styles.diagramBox}>
            <View style={styles.diagramRow}>
              <Text style={styles.diagramLabel}>Time</Text>
              <Text style={styles.diagramValue}>1 min</Text>
            </View>
            <View style={S.divider} />
            <View style={styles.diagramRow}>
              <Text style={styles.diagramLabel}>Block at End of Limit</Text>
              <View style={styles.diagramToggleOn}>
                <View style={styles.diagramThumb} />
              </View>
            </View>
          </View>
        )}

        {current.note && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{current.note.toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={S.primaryBtn} onPress={handleAction} activeOpacity={0.7}>
            <Text style={S.primaryBtnText}>{current.action}</Text>
          </TouchableOpacity>

          {step === 0 && (
            <TouchableOpacity style={styles.skipBtn} onPress={onSkip} activeOpacity={0.7}>
              <Text style={styles.skipText}>SKIP — I'LL SET UP LATER</Text>
            </TouchableOpacity>
          )}
        </View>

      </Animated.View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: 64,
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 28,
  },
  progressDot: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.textHi,
  },
  stepIndex: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 3,
    marginBottom: 16,
  },
  heading: {
    ...T.display,
    fontSize: 64,
    color: Colors.textHi,
    lineHeight: 60,
    marginBottom: 24,
  },
  body: {
    ...T.mono,
    fontSize: 12,
    color: Colors.textSub,
    lineHeight: 22,
    letterSpacing: 0.3,
    marginBottom: 24,
  },
  allowedBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 16,
    marginBottom: 20,
    gap: 8,
  },
  allowedBoxLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textHi,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  allowedBoxSub: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    lineHeight: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.borderHi,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textHi,
    letterSpacing: 1,
  },
  diagramBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  diagramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diagramLabel: {
    ...T.sans,
    fontSize: 13,
    color: Colors.textBody,
    fontWeight: '300',
  },
  diagramValue: {
    ...T.mono,
    fontSize: 12,
    color: Colors.textHi,
    letterSpacing: 1,
  },
  diagramToggleOn: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.textHi,
    justifyContent: 'center',
    paddingHorizontal: 2,
    alignItems: 'flex-end',
  },
  diagramThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.bg,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  noteText: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 2,
    lineHeight: 15,
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: Colors.borderMid,
    paddingLeft: 10,
  },
  actions: {
    marginTop: 'auto' as any,
    gap: 10,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
})
