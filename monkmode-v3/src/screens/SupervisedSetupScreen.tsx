import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { Colors, T, S } from '../utils/styles'

interface Props {
  onBack: () => void
}

const STEPS = [
  'Back up your iPhone first. Supervision normally erases the device.',
  'Open Apple Configurator on your Mac and connect your iPhone with USB.',
  'Choose Prepare, select Manual Configuration, and enable Supervise devices.',
  'Skip MDM enrollment unless you already use an MDM.',
  'After setup, add restriction and web content filter profiles for the apps and sites you want blocked.',
  'Install MonkMode from Xcode as your timer, ritual, stats, and check-in layer.',
]

export const SupervisedSetupScreen: React.FC<Props> = ({ onBack }) => {
  return (
    <ScrollView style={S.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
        <Text style={styles.backText}>← CONFIG</Text>
      </TouchableOpacity>

      <Text style={styles.pageTitle}>DEVICE.</Text>
      <Text style={styles.pageSubtitle}>SUPERVISED IPHONE MODE.</Text>

      <View style={styles.warning}>
        <Text style={styles.warningTitle}>READ FIRST</Text>
        <Text style={styles.warningBody}>
          This is the strongest no-developer-account path, but it is a device-management path. It can erase your iPhone during setup.
        </Text>
      </View>

      <Text style={S.sectionLabel}>CONFIGURATOR CHECKLIST</Text>
      <View style={styles.group}>
        {STEPS.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <Text style={styles.stepNum}>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <Text style={S.sectionLabel}>WHAT MONKMODE DOES HERE</Text>
      <View style={styles.group}>
        <Text style={styles.bodyText}>
          MonkMode keeps sessions, multi-day commitments, daily check-ins, stats, recovery missions, website lists, and accountability prompts. Apple Configurator handles the device restrictions.
        </Text>
      </View>

      <TouchableOpacity
        style={S.primaryBtn}
        onPress={() => Linking.openURL('https://support.apple.com/guide/apple-configurator-mac/supervise-devices-apd9e4f64088/mac')}
        activeOpacity={0.7}
      >
        <Text style={S.primaryBtnText}>OPEN APPLE GUIDE →</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 14,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 2,
  },
  pageTitle: {
    ...T.display,
    fontSize: 56,
    lineHeight: 52,
  },
  pageSubtitle: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 3,
  },
  warning: {
    borderWidth: 1,
    borderColor: Colors.borderHi,
    borderRadius: 2,
    padding: 14,
    gap: 8,
  },
  warningTitle: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textHi,
    letterSpacing: 1.5,
  },
  warningBody: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textSub,
    lineHeight: 17,
  },
  group: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 12,
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNum: {
    ...T.mono,
    width: 22,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  stepText: {
    ...T.mono,
    flex: 1,
    fontSize: 10,
    color: Colors.textSub,
    lineHeight: 17,
  },
  bodyText: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textSub,
    lineHeight: 18,
  },
})
