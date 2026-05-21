/**
 * screens/SettingsScreen.tsx  (v3)
 *
 * Option C settings. Enforcement section replaced with
 * Screen Time configuration entry point.
 * Wallpaper toggle added.
 */


import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, TextInput,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSessionStore } from '../store/sessionStore'
import { hasOverridePasscode, clearOverridePasscode } from '../utils/keychain'
import { getFriendLockState } from '../utils/friendLock'
import { ScreenTimeGuideScreen } from './ScreenTimeGuideScreen'
import { WebsiteBlockScreen } from './WebsiteBlockScreen'
import { SupervisedSetupScreen } from './SupervisedSetupScreen'
import { Colors, T, S } from '../utils/styles'
import { useGrowthStore } from '../store/growthStore'
import { useWebhookStore } from '../store/webhookStore'
import { useIAPStore } from '../store/iapStore'

interface SettingsScreenProps {
  onOpenPublicProfile?: () => void
  onOpenPurchase?: (trigger?: 'manual' | 'profile') => void
}

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

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onOpenPublicProfile,
  onOpenPurchase,
}) => {
  const {
    config, updateConfig,
    screenTimeConfigured, setScreenTimeConfigured,
  } = useSessionStore()

  const purchased = useIAPStore(s => s.status === 'purchased')
  const { startUrl, endUrl, secret, setStartUrl, setEndUrl, setSecret } = useWebhookStore()

  const [hasPasscode, setHasPasscode] = useState(false)
  const [friendLockActive, setFriendLockActive] = useState(false)
  const [grayscale, setGrayscale] = useState(false)
  const [wallpaperEnabled, setWallpaperEnabled] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const [showWebsiteBlocks, setShowWebsiteBlocks] = useState(false)
  const [showSupervisedSetup, setShowSupervisedSetup] = useState(false)
  const { trackEvent } = useGrowthStore()

  useEffect(() => {
    hasOverridePasscode().then(setHasPasscode)
    getFriendLockState().then(s => setFriendLockActive(s.active))
    AsyncStorage.getItem('monkmode:grayscale').then(v => setGrayscale(v === 'true'))
    AsyncStorage.getItem('monkmode:wallpaper_enabled').then(v =>
      setWallpaperEnabled(v !== 'false')  // default true
    )
  }, [])

  const toggleWallpaper = async (val: boolean) => {
    setWallpaperEnabled(val)
    await AsyncStorage.setItem('monkmode:wallpaper_enabled', String(val))
  }

  const toggleGrayscale = async (val: boolean) => {
    setGrayscale(val)
    await AsyncStorage.setItem('monkmode:grayscale', String(val))
  }

  const handleClearPasscode = () => {
    Alert.alert(
      'REMOVE PASSCODE',
      'Early session exit will require no code. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => { await clearOverridePasscode(); setHasPasscode(false) },
        },
      ]
    )
  }

  const handleReset = () => {
    Alert.alert(
      'FULL RESET',
      'Clears all sessions, stats, schedules, and your commitment. Cannot be undone.',
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
    const next = options[(options.indexOf(config.durationMinutes) + 1) % options.length]
    updateConfig({ sessionKind: 'timed', durationMinutes: next })
  }

  const cycleSessionMode = () => {
    updateConfig({ sessionKind: config.sessionKind === 'multiDay' ? 'timed' : 'multiDay' })
  }

  const cycleBreak = () => {
    const options = [{ work: 25, rest: 5 }, { work: 50, rest: 10 }, { work: 90, rest: 20 }]
    const idx = options.findIndex(o => o.work === config.breakIntervalMinutes)
    const next = options[(idx + 1) % options.length]
    updateConfig({ breakIntervalMinutes: next.work, breakDurationMinutes: next.rest })
  }

  const handleReferralInvite = async () => {
    await trackEvent('friend_lock_opened')
    await trackEvent('friend_invite_generated')
    Alert.alert(
      'INVITE GENERATED',
      'Share your Friend Lock QR from this device in the next build step. Referral credit will tie to invite acceptance.'
    )
  }

  if (showGuide) {
    return (
      <ScreenTimeGuideScreen
        onComplete={() => { setScreenTimeConfigured(true); setShowGuide(false) }}
        onSkip={() => setShowGuide(false)}
      />
    )
  }

  if (showWebsiteBlocks) {
    return <WebsiteBlockScreen onBack={() => setShowWebsiteBlocks(false)} />
  }

  if (showSupervisedSetup) {
    return <SupervisedSetupScreen onBack={() => setShowSupervisedSetup(false)} />
  }

  return (
    <ScrollView
      style={S.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>CONFIG.</Text>

      {/* ── Screen Time ── */}
      <Text style={S.sectionLabel}>SCREEN TIME ENFORCEMENT</Text>
      <View style={styles.group}>
        <Row
          label="Setup status"
          value={screenTimeConfigured ? 'CONFIGURED ✓' : 'NOT SET UP'}
        />
        <View style={S.divider} />
        <Row
          label={screenTimeConfigured ? 'Reconfigure Screen Time' : 'Set up Screen Time →'}
          onPress={() => setShowGuide(true)}
        />
        <View style={S.divider} />
        <Row
          label="Website blocking lists →"
          onPress={() => setShowWebsiteBlocks(true)}
        />
        <View style={S.divider} />
        <Row
          label="Supervised iPhone setup →"
          onPress={() => setShowSupervisedSetup(true)}
        />
      </View>

      {/* ── Session ── */}
      <Text style={S.sectionLabel}>SESSION</Text>
      <View style={styles.group}>
        <Row
          label="Default mode"
          value={config.sessionKind === 'multiDay' ? `${config.durationDays} DAYS` : 'MINUTES'}
          onPress={cycleSessionMode}
        />
        <View style={S.divider} />
        <Row
          label="Default duration"
          value={`${config.durationMinutes} MIN`}
          onPress={cycleDuration}
        />
        <View style={S.divider} />
        <Row
          label="Break rhythm"
          value={`${config.breakIntervalMinutes}/${config.breakDurationMinutes} MIN`}
          onPress={cycleBreak}
        />
        <View style={S.divider} />
        <Row label="Hard lock (prevent early exit)">
          <Switch
            value={config.hardLock}
            onValueChange={v => updateConfig({ hardLock: v })}
            trackColor={{ false: Colors.border, true: Colors.borderHi }}
            thumbColor={config.hardLock ? Colors.textHi : Colors.textMid}
            ios_backgroundColor={Colors.border}
          />
        </Row>
      </View>

      {/* ── Passcode ── */}
      <Text style={S.sectionLabel}>OVERRIDE PASSCODE</Text>
      <View style={styles.group}>
        <Row
          label="MonkMode override passcode"
          value={hasPasscode ? 'SET ••••' : 'NOT SET'}
          onPress={hasPasscode ? handleClearPasscode : undefined}
        />
        <View style={S.divider} />
        <Row
          label="Friend lock"
          value={friendLockActive ? 'ACTIVE' : 'OFF'}
        />
        <View style={S.divider} />
        <Row
          label="Generate friend accountability invite →"
          onPress={handleReferralInvite}
        />
      </View>

      {/* ── Wallpaper ── */}
      <Text style={S.sectionLabel}>WALLPAPER</Text>
      <View style={styles.group}>
        <Row label="Apply MonkMode wallpaper on session start">
          <Switch
            value={wallpaperEnabled}
            onValueChange={toggleWallpaper}
            trackColor={{ false: Colors.border, true: Colors.borderHi }}
            thumbColor={wallpaperEnabled ? Colors.textHi : Colors.textMid}
            ios_backgroundColor={Colors.border}
          />
        </Row>
        <View style={S.divider} />
        <Row label="Restore original wallpaper on end">
          <Switch
            value={wallpaperEnabled}
            onValueChange={toggleWallpaper}
            trackColor={{ false: Colors.border, true: Colors.borderHi }}
            thumbColor={wallpaperEnabled ? Colors.textHi : Colors.textMid}
            ios_backgroundColor={Colors.border}
          />
        </Row>
      </View>

      {/* ── Public & purchase ── */}
      <Text style={S.sectionLabel}>PUBLIC & UNLOCK</Text>
      <View style={styles.group}>
        <Row
          label="Public accountability page (URL)"
          value="→"
          onPress={() => {
            if (!purchased) {
              onOpenPurchase?.('profile')
              return
            }
            onOpenPublicProfile?.()
          }}
        />
        <View style={S.divider} />
        <Row
          label="Lifetime unlock — $4.99"
          value="→"
          onPress={() => onOpenPurchase?.('manual')}
        />
      </View>

      {purchased && (
        <>
          <Text style={S.sectionLabel}>WEBHOOKS (DEVELOPER)</Text>
          <View style={styles.group}>
            <Text style={styles.whLabel}>POST · session/start</Text>
            <TextInput
              style={styles.whInput}
              value={startUrl}
              onChangeText={setStartUrl}
              placeholder="https://…"
              placeholderTextColor={Colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={S.divider} />
            <Text style={styles.whLabel}>POST · session/end</Text>
            <TextInput
              style={styles.whInput}
              value={endUrl}
              onChangeText={setEndUrl}
              placeholder="https://…"
              placeholderTextColor={Colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={S.divider} />
            <Text style={styles.whLabel}>Shared secret (optional header)</Text>
            <TextInput
              style={styles.whInput}
              value={secret}
              onChangeText={setSecret}
              placeholder="X-MonkMode-Secret"
              placeholderTextColor={Colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </>
      )}

      {/* ── Aesthetics ── */}
      <Text style={S.sectionLabel}>AESTHETICS</Text>
      <View style={styles.group}>
        <Row label="Grayscale mode reminder">
          <Switch
            value={grayscale}
            onValueChange={toggleGrayscale}
            trackColor={{ false: Colors.border, true: Colors.borderHi }}
            thumbColor={grayscale ? Colors.textHi : Colors.textMid}
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

      {/* ── Danger ── */}
      <Text style={S.sectionLabel}>DANGER ZONE</Text>
      <View style={styles.group}>
        <Row label="Full reset — clear all data" onPress={handleReset} danger />
      </View>

      <Text style={styles.version}>MONKMODE · OPTION C BUILD</Text>
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
  rowLabelDanger: { color: Colors.textMid },
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
  whLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  whInput: {
    ...T.mono,
    fontSize: 11,
    color: Colors.textHi,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
})
