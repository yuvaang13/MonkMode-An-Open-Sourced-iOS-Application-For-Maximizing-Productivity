/**
 * App.tsx
 *
 * Root entry point. Handles:
 *   - First-launch routing to CommitmentScreen
 *   - Tab navigation (Home, Stats, Schedules, Settings)
 *   - Deep link handling for Friend Lock QR redemption
 */

import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'

import { CommitmentScreen } from './src/screens/CommitmentScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { StatsScreen } from './src/screens/StatsScreen'
import { ScheduleScreen } from './src/screens/ScheduleScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'
import { Colors, T } from './src/utils/styles'

type Tab = 'home' | 'stats' | 'schedule' | 'settings'

const TABS: { key: Tab; label: string }[] = [
  { key: 'home',     label: 'HOME' },
  { key: 'stats',    label: 'RECORD' },
  { key: 'schedule', label: 'BLOCKS' },
  { key: 'settings', label: 'CONFIG' },
]

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('home')

  useEffect(() => {
    AsyncStorage.getItem('monkmode:onboarded').then(v => setOnboarded(v === 'true'))
  }, [])

  // Handle Friend Lock deep links: monkmode://friendlock?token=...
  useEffect(() => {
    const handleURL = ({ url }: { url: string }) => {
      if (url.startsWith('monkmode://friendlock')) {
        setActiveTab('settings')
        // Pass token to SettingsScreen via navigation params in a real nav stack
      }
    }
    const sub = Linking.addEventListner('url', handleURL)
    return () => sub.remove()
  }, [])

  if (onboarded === null) return null // loading

  if (!onboarded) {
    return (
      <SafeAreaProvider>
        <CommitmentScreen onComplete={() => setOnboarded(true)} />
      </SafeAreaProvider>
    )
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':     return <HomeScreen />
      case 'stats':    return <StatsScreen />
      case 'schedule': return <ScheduleScreen />
      case 'settings': return <SettingsScreen />
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.content}>{renderScreen()}</View>
        <SafeAreaView style={styles.tabBar} edges={['bottom']}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {activeTab === tab.key && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </SafeAreaView>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: Colors.textHi,
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 1,
    backgroundColor: Colors.textHi,
  },
})
