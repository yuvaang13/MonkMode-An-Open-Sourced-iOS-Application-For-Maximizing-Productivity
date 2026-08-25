/**
 * components/DeepFocusMode.tsx
 *
 * First-class "nuclear option" mode.
 * One button. Blocks everything except Phone.
 * No whitelist setup, no duration picker — just silence.
 *
 * Designed for sessions where you need total quiet and don't want
 * to think about configuration.
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native'
import { ScreenTimeModule } from '../native/ScreenTimeModule'
import { useWhitelistStore } from '../store/whitelistStore'
import { useSessionStore } from '../store/sessionStore'
import { Colors, T, S } from '../utils/styles'

interface Props {
  onSessionStart: () => void
}

export const DeepFocusMode: React.FC<Props> = ({ onSessionStart }) => {
  const [armed, setArmed] = useState(false)
  const [pressing, setPressing] = useState(false)
  const holdAnim = React.useRef(new Animated.Value(0)).current
  const holdAnimation = React.useRef<Animated.CompositeAnimation | null>(null)
  const holdTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const { installedApps } = useWhitelistStore()
  const { beginSession, config } = useSessionStore()

  const handlePressIn = () => {
    if (!armed) return
    setPressing(true)
    holdAnimation.current = Animated.timing(holdAnim, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: false,
    })
    holdAnimation.current.start(({ finished }) => {
      if (finished) activateDeepFocus()
    })
  }

  const handlePressOut = () => {
    if (!pressing) return
    setPressing(false)
    holdAnimation.current?.stop()
    Animated.timing(holdAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start()
  }

  const activateDeepFocus = async () => {
    // Block everything except Phone app (bundleId: com.apple.mobilephone)
    const blocked = installedApps
      .filter(a => !a.bundleId?.includes('mobilephone'))
      .map(a => a.token)

    await beginSession(blocked, { ...config, durationMinutes: 999 })
    onSessionStart()
  }

  const barWidth = holdAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DEEP FOCUS</Text>
      <Text style={styles.subtitle}>
        CALL ONLY. EVERYTHING ELSE BLOCKED.{'\n'}
        NO TIMER. NO WHITELIST. JUST SILENCE.
      </Text>

      {!armed ? (
        <TouchableOpacity
          style={styles.armBtn}
          onPress={() => setArmed(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.armBtnText}>ARM →</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.holdArea}>
          <Text style={styles.holdInstructions}>HOLD TO ACTIVATE</Text>
          <TouchableOpacity
            style={styles.holdBtn}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          >
            <Animated.View style={[styles.holdFill, { width: barWidth }]} />
            <Text style={styles.holdBtnText}>
              {pressing ? '■ ■ ■' : '▶ HOLD'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setArmed(false)} style={styles.disarmBtn}>
            <Text style={styles.disarmText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 20,
    gap: 14,
  },
  title: {
    ...T.display,
    fontSize: 24,
    letterSpacing: 3,
  },
  subtitle: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  armBtn: {
    ...S.ghostBtn,
  },
  armBtnText: {
    ...S.ghostBtnText,
  },
  holdArea: {
    gap: 10,
    alignItems: 'center',
  },
  holdInstructions: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  holdBtn: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: Colors.borderHi,
    borderRadius: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.borderHi,
  },
  holdBtnText: {
    ...T.display,
    fontSize: 14,
    color: Colors.textHi,
    letterSpacing: 4,
    zIndex: 1,
  },
  disarmBtn: {
    paddingVertical: 6,
  },
  disarmText: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
})
