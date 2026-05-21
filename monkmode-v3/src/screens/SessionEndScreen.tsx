/**
 * Session end — contrast, not celebration. No streaks.
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Share, ScrollView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, T, S } from '../utils/styles'

interface Props {
  durationMinutes: number
  wasEarlyEnd: boolean
  onDismiss: () => void
}

const PHONE_CHECKS_PER_HOUR = 14.7
const INSTAGRAM_POSTS_PER_HOUR = 3600
const AVERAGE_SCROLL_METERS_PER_HOUR = 88

function buildContrasts(minutes: number) {
  const hours = minutes / 60
  const checks = Math.round(PHONE_CHECKS_PER_HOUR * hours)
  const posts = Math.round(INSTAGRAM_POSTS_PER_HOUR * hours)
  const scrollMeters = Math.round(AVERAGE_SCROLL_METERS_PER_HOUR * hours)

  return [
    {
      number: String(checks),
      line: `times the average person checked their phone.`,
      sub: 'You checked: 0.',
    },
    {
      number: String(posts),
      line: `posts Instagram served to your demographic.`,
      sub: 'You saw none of them.',
    },
    {
      number: `${scrollMeters}m`,
      line: `of feed the average user scrolled.`,
      sub: 'Your thumb rested.',
    },
  ]
}

function formatDuration(minutes: number) {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440
    return `${days} ${days === 1 ? 'day' : 'days'}`
  }
  return `${minutes} minutes`
}

export const SessionEndScreen: React.FC<Props> = ({
  durationMinutes, wasEarlyEnd, onDismiss,
}) => {
  const [commitment, setCommitment] = useState<{ reason: string } | null>(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const contrasts = buildContrasts(durationMinutes)
  const durationLabel = formatDuration(durationMinutes)

  useEffect(() => {
    AsyncStorage.getItem('monkmode:commitment').then(raw => {
      if (raw) setCommitment(JSON.parse(raw))
    })
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [])

  const handleShare = async () => {
    const text = [
      `You protected ${durationLabel}.`,
      ``,
      `During that time, the average person checked their phone ${contrasts[0].number} times.`,
      `Instagram served ${contrasts[1].number} posts to your demographic.`,
      `You saw none of them.`,
      ``,
      commitment ? `"${commitment.reason}"` : '',
      ``,
      `— MonkMode`,
    ].filter(Boolean).join('\n')

    await Share.share({ message: text })
  }

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.label}>
            {wasEarlyEnd ? 'ENDED EARLY' : 'SESSION COMPLETE'}
          </Text>
        </View>

        <Text style={styles.lead}>
          You protected <Text style={styles.leadNum}>{durationLabel}</Text>.
        </Text>

        <View style={styles.rule} />

        <Text style={styles.contrastIntro}>DURING THAT TIME:</Text>
        {contrasts.map((c, i) => (
          <View key={i} style={styles.contrastBlock}>
            <Text style={styles.contrastNumber}>{c.number}</Text>
            <Text style={styles.contrastLine}>{c.line}</Text>
            <Text style={styles.contrastSub}>{c.sub}</Text>
          </View>
        ))}

        <View style={styles.rule} />

        {commitment && (
          <View style={styles.commitAnchor}>
            <Text style={styles.commitAnchorLabel}>YOUR COMMITMENT</Text>
            <Text style={styles.commitAnchorText}>"{commitment.reason}"</Text>
            <Text style={styles.commitAnchorNote}>Still worth it.</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Text style={styles.shareBtnText}>SHARE PROOF →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={onDismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissBtnText}>DONE</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingTop: 72,
    paddingHorizontal: 28,
    paddingBottom: 60,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  lead: {
    ...T.mono,
    fontSize: 18,
    color: Colors.textSub,
    lineHeight: 28,
    letterSpacing: 0.3,
    marginTop: 8,
  },
  leadNum: {
    ...T.display,
    fontSize: 22,
    color: Colors.textHi,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  contrastIntro: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  contrastBlock: {
    gap: 2,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  contrastNumber: {
    ...T.display,
    fontSize: 48,
    color: Colors.textHi,
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  contrastLine: {
    ...T.mono,
    fontSize: 11,
    color: Colors.textSub,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  contrastSub: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  commitAnchor: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 16,
    gap: 8,
  },
  commitAnchorLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  commitAnchorText: {
    ...T.sans,
    fontSize: 14,
    color: Colors.textSub,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  commitAnchorNote: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 1,
  },
  shareBtn: {
    ...S.primaryBtn,
    marginTop: 4,
  },
  shareBtnText: {
    ...S.primaryBtnText,
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dismissBtnText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
})
