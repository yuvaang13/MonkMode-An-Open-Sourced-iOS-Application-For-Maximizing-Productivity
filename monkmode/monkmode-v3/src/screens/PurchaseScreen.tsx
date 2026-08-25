/**
 * One-time $4.99 lifetime purchase screen.
 */

import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { useIAPStore } from '../store/iapStore'
import { Colors, T, S } from '../utils/styles'

interface Props {
  onPurchased?: () => void
  onDismiss?: () => void
  onBack?: () => void
  trigger?: 'session_limit' | 'schedule' | 'profile' | 'webhook' | 'manual'
}

export const PurchaseScreen: React.FC<Props> = ({
  onPurchased, onDismiss, onBack, trigger = 'manual',
}) => {
  const { purchase, restore, freeSessionsRemaining } = useIAPStore()
  const [purchasing, setPurchasing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const remaining = freeSessionsRemaining()

  const triggerMessages: Record<NonNullable<Props['trigger']>, string> = {
    session_limit: `You've used your 3 free sessions.`,
    schedule:      `Recurring schedules require MonkMode.`,
    profile:       `Public profiles require MonkMode.`,
    webhook:       `The developer API requires MonkMode.`,
    manual:        '',
  }

  const handlePurchase = async () => {
    setPurchasing(true)
    setError(null)
    const result = await purchase()
    setPurchasing(false)
    if (result.success) {
      onPurchased?.()
    } else if (result.error !== 'cancelled') {
      setError(result.error ?? 'Something went wrong')
    }
  }

  const handleRestore = async () => {
    setRestoring(true)
    setError(null)
    const result = await restore()
    setRestoring(false)
    if (result.restored) {
      onPurchased?.()
    } else if (result.success) {
      setError('No previous purchase found')
    } else {
      setError('Restore failed — check connection')
    }
  }

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

      {trigger !== 'manual' && (
        <View style={styles.triggerBanner}>
          <Text style={styles.triggerText}>{triggerMessages[trigger]}</Text>
        </View>
      )}

      <Text style={styles.pageTitle}>MONK{'\n'}MODE.</Text>

      <View style={styles.pitchBlock}>
        <Text style={styles.pitchLine}>
          One payment. Yours forever.
        </Text>
        <Text style={styles.pitchLine}>
          No subscription. No trial that nags you.
          No "Pro" tier with features withheld.
        </Text>
        <Text style={styles.pitchLine}>
          No ads in this app. Ever. No analytics sent anywhere.
          No cloud account required.
        </Text>
      </View>

      <View style={styles.priceCard}>
        <Text style={styles.priceAmount}>$4.99</Text>
        <Text style={styles.priceLabel}>ONE TIME · LIFETIME</Text>
        <Text style={styles.priceNote}>
          Price of one coffee. Protects every session after.
        </Text>
      </View>

      <View style={styles.includedSection}>
        <Text style={S.sectionLabel}>EVERYTHING, UNLOCKED</Text>
        {[
          'Unlimited focus sessions',
          'Recurring auto-enforced schedules',
          'Public accountability profile',
          'Friend Lock — delegate your passcode',
          'Developer webhook API',
          'All future features, no extra charge',
        ].map((item, i) => (
          <View key={i} style={styles.includedRow}>
            <View style={styles.includedDot} />
            <Text style={styles.includedText}>{item}</Text>
          </View>
        ))}
      </View>

      {remaining < Infinity && remaining > 0 && (
        <View style={styles.remainingNote}>
          <Text style={styles.remainingText}>
            {remaining} free {remaining === 1 ? 'session' : 'sessions'} remaining before purchase is required.
          </Text>
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>{error.toUpperCase()}</Text>
      )}

      <TouchableOpacity
        style={[S.primaryBtn, purchasing && { borderColor: Colors.border }]}
        onPress={handlePurchase}
        disabled={purchasing || restoring}
        activeOpacity={0.7}
      >
        {purchasing ? (
          <ActivityIndicator color={Colors.textHi} size="small" />
        ) : (
          <Text style={S.primaryBtnText}>UNLOCK FOR $4.99 →</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.restoreBtn}
        onPress={handleRestore}
        disabled={purchasing || restoring}
        activeOpacity={0.7}
      >
        <Text style={styles.restoreBtnText}>
          {restoring ? 'RESTORING...' : 'RESTORE PREVIOUS PURCHASE'}
        </Text>
      </TouchableOpacity>

      {onDismiss && (
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.7}>
          <Text style={styles.dismissBtnText}>
            {remaining > 0 ? `MAYBE LATER (${remaining} FREE LEFT)` : 'CANCEL'}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.legalText}>
        Payment charged to your Apple ID account at confirmation of purchase.
        One-time, non-recurring. No refunds except as required by law.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 56,
    paddingHorizontal: 28,
    paddingBottom: 60,
    gap: 20,
  },
  backRow: {
    marginBottom: 4,
  },
  backText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 2,
  },
  triggerBanner: {
    borderWidth: 1,
    borderColor: Colors.borderMid,
    borderRadius: 2,
    padding: 12,
  },
  triggerText: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textSub,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  pageTitle: {
    ...T.display,
    fontSize: 72,
    lineHeight: 68,
    marginTop: 8,
  },
  pitchBlock: {
    gap: 12,
    borderLeftWidth: 1,
    borderLeftColor: Colors.borderMid,
    paddingLeft: 14,
  },
  pitchLine: {
    ...T.mono,
    fontSize: 12,
    color: Colors.textSub,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  priceCard: {
    borderWidth: 1,
    borderColor: Colors.borderHi,
    borderRadius: 2,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  priceAmount: {
    ...T.display,
    fontSize: 56,
    color: Colors.textHi,
    letterSpacing: -1,
  },
  priceLabel: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  priceNote: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 4,
  },
  includedSection: {
    gap: 10,
  },
  includedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  includedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMid,
    marginTop: 6,
    flexShrink: 0,
  },
  includedText: {
    ...T.mono,
    fontSize: 11,
    color: Colors.textSub,
    lineHeight: 18,
    flex: 1,
    letterSpacing: 0.3,
  },
  remainingNote: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 10,
  },
  remainingText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  errorText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 1,
    textAlign: 'center',
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  restoreBtnText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dismissBtnText: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  legalText: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    lineHeight: 14,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
})
