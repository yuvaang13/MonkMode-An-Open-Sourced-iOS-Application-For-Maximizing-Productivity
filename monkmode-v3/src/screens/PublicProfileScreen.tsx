/**
 * Optional public accountability URL — streak + hours this week.
 */

import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Share, Alert,
} from 'react-native'
import { usePublicProfileStore } from '../store/publicProfileStore'
import { useStatsStore } from '../store/statsStore'
import { Colors, T, S } from '../utils/styles'

interface Props {
  onBack?: () => void
}

export const PublicProfileScreen: React.FC<Props> = ({ onBack }) => {
  const {
    enabled, username, lastSyncedAt, syncError,
    enable, disable, sync, checkUsernameAvailable, getPublicUrl,
  } = usePublicProfileStore()
  const { allTime, weekly, loadStats } = useStatsStore()

  const [inputUsername, setInputUsername] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [checkResult, setCheckResult] = useState<'available' | 'taken' | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    if (!enabled) return
    void (async () => {
      await loadStats()
      const s = useStatsStore.getState()
      await usePublicProfileStore.getState().sync(
        s.allTime.currentStreak,
        s.weekly.hoursEnforced,
        s.allTime.totalSessions
      )
    })()
  }, [enabled, loadStats])

  const handleCheckUsername = async () => {
    const clean = inputUsername.toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (clean.length < 3) return
    setChecking(true)
    const available = await checkUsernameAvailable(clean)
    setCheckResult(available ? 'available' : 'taken')
    setChecking(false)
  }

  const handleClaim = async () => {
    setClaiming(true)
    setClaimError(null)
    const result = await enable(inputUsername)
    if (!result.success) {
      setClaimError(result.error ?? 'Failed')
      setClaiming(false)
      return
    }
    await sync(allTime.currentStreak, weekly.hoursEnforced, allTime.totalSessions)
    setClaiming(false)
  }

  const handleShare = async () => {
    const url = getPublicUrl()
    if (!url) return
    await Share.share({
      message: `${allTime.currentStreak}-day streak · ${weekly.hoursEnforced}h this week\n\n${url}`,
    })
  }

  const handleDisable = () => {
    Alert.alert(
      'REMOVE PUBLIC PROFILE',
      'Your profile URL will be deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: disable },
      ]
    )
  }

  const publicUrl = getPublicUrl()

  return (
    <ScrollView
      style={S.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {onBack && (
        <TouchableOpacity style={styles.backRow} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.pageTitle}>PUBLIC{'\n'}PROFILE.</Text>
      <Text style={styles.pageSubtitle}>
        OPTIONAL. ONE URL. TWO NUMBERS.{'\n'}
        NO FEED. NO FOLLOWS. NO ADS.
      </Text>

      {!enabled ? (
        <>
          <View style={styles.explainerCard}>
            <Text style={styles.explainerTitle}>WHAT THIS IS</Text>
            <Text style={styles.explainerBody}>
              A single public page — monkmode.app/u/yourname — that shows your
              current streak and hours focused this week.
            </Text>
            <Text style={styles.explainerBody}>
              Put it in your Twitter bio. Your Notion header. Your Discord status.
              Let the number speak for you.
            </Text>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>WHAT OTHERS SEE</Text>
            <View style={styles.previewInner}>
              <View style={styles.previewStat}>
                <Text style={styles.previewNum}>{allTime.currentStreak}</Text>
                <Text style={styles.previewStatLabel}>DAY STREAK</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.previewStat}>
                <Text style={styles.previewNum}>{weekly.hoursEnforced}h</Text>
                <Text style={styles.previewStatLabel}>THIS WEEK</Text>
              </View>
            </View>
            <Text style={styles.previewNote}>Nothing else. No name. No history.</Text>
          </View>

          <View style={styles.claimSection}>
            <Text style={S.sectionLabel}>CHOOSE YOUR USERNAME</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputPrefix}>monkmode.app/u/</Text>
              <TextInput
                style={styles.usernameInput}
                value={inputUsername}
                onChangeText={v => {
                  setInputUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))
                  setCheckResult(null)
                }}
                placeholder="yourname"
                placeholderTextColor={Colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={handleCheckUsername}
              />
            </View>

            {checkResult === 'available' && (
              <Text style={styles.availableText}>✓ AVAILABLE</Text>
            )}
            {checkResult === 'taken' && (
              <Text style={styles.takenText}>TAKEN — TRY ANOTHER</Text>
            )}
            {checking && (
              <Text style={styles.checkingText}>CHECKING...</Text>
            )}
            {claimError && (
              <Text style={styles.takenText}>{claimError.toUpperCase()}</Text>
            )}

            <TouchableOpacity
              style={[
                S.primaryBtn,
                (inputUsername.length < 3 || claiming) && { borderColor: Colors.border },
              ]}
              onPress={handleClaim}
              disabled={inputUsername.length < 3 || claiming}
              activeOpacity={0.7}
            >
              <Text style={S.primaryBtnText}>
                {claiming ? 'CLAIMING...' : 'CLAIM USERNAME →'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.privacyNote}>
            <Text style={styles.privacyText}>
              Only your streak and weekly hours are stored.
              No name. No email. No tracking.
              Delete at any time.
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.activeCard}>
            <Text style={styles.activeLabel}>YOUR PROFILE IS LIVE</Text>
            <Text style={styles.activeUrl}>{publicUrl}</Text>
            {syncError && (
              <Text style={styles.syncError}>{syncError.toUpperCase()}</Text>
            )}
            {lastSyncedAt && !syncError && (
              <Text style={styles.syncTime}>
                LAST SYNCED {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>CURRENTLY SHOWING</Text>
            <View style={styles.previewInner}>
              <View style={styles.previewStat}>
                <Text style={styles.previewNum}>{allTime.currentStreak}</Text>
                <Text style={styles.previewStatLabel}>DAY STREAK</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.previewStat}>
                <Text style={styles.previewNum}>{weekly.hoursEnforced}h</Text>
                <Text style={styles.previewStatLabel}>THIS WEEK</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={S.primaryBtn} onPress={handleShare} activeOpacity={0.7}>
            <Text style={S.primaryBtnText}>SHARE YOUR URL →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.syncBtn}
            onPress={() => sync(allTime.currentStreak, weekly.hoursEnforced, allTime.totalSessions)}
            activeOpacity={0.7}
          >
            <Text style={styles.syncBtnText}>SYNC NOW</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDisable} activeOpacity={0.7}>
            <Text style={styles.deleteBtnText}>DELETE PROFILE</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 20,
  },
  backRow: { marginBottom: 4 },
  backText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
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
    letterSpacing: 2,
    textTransform: 'uppercase',
    lineHeight: 16,
  },
  explainerCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 16,
    gap: 10,
  },
  explainerTitle: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  explainerBody: {
    ...T.mono,
    fontSize: 11,
    color: Colors.textSub,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  previewCard: {
    borderWidth: 1,
    borderColor: Colors.borderHi,
    borderRadius: 2,
    padding: 16,
    gap: 12,
  },
  previewLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  previewInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  previewNum: {
    ...T.display,
    fontSize: 40,
    color: Colors.textHi,
    letterSpacing: -0.5,
  },
  previewStatLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  previewDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: Colors.border,
  },
  previewNote: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 1,
    textAlign: 'center',
  },
  claimSection: {
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMid,
    paddingBottom: 8,
  },
  inputPrefix: {
    ...T.mono,
    fontSize: 11,
    color: Colors.textDim,
    letterSpacing: 0.3,
  },
  usernameInput: {
    ...T.mono,
    fontSize: 14,
    color: Colors.textHi,
    flex: 1,
    letterSpacing: 0.5,
    paddingVertical: 4,
  },
  availableText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textSub,
    letterSpacing: 2,
  },
  takenText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 1,
  },
  checkingText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 2,
  },
  privacyNote: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    paddingLeft: 12,
  },
  privacyText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  activeCard: {
    borderWidth: 1,
    borderColor: Colors.borderHi,
    borderRadius: 2,
    padding: 16,
    gap: 8,
  },
  activeLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  activeUrl: {
    ...T.mono,
    fontSize: 13,
    color: Colors.textHi,
    letterSpacing: 0.5,
  },
  syncError: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 1,
  },
  syncTime: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  syncBtn: {
    ...S.ghostBtn,
  },
  syncBtnText: {
    ...S.ghostBtnText,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  deleteBtnText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
})
