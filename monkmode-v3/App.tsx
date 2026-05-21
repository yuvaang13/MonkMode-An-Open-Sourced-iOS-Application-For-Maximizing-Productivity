/**
 * Root: onboarding, tabs, purchase/profile overlays, schedule drain, weekly notification.
 */

import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'

import { CommitmentScreen } from './src/screens/CommitmentScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { StatsScreen } from './src/screens/StatsScreen'
import { ScheduleScreen } from './src/screens/ScheduleScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'
import { PurchaseScreen } from './src/screens/PurchaseScreen'
import { PublicProfileScreen } from './src/screens/PublicProfileScreen'
import { Colors, T } from './src/utils/styles'
import { useGrowthStore } from './src/store/growthStore'
import { useIAPStore } from './src/store/iapStore'
import { useStatsStore } from './src/store/statsStore'
import { useWebhookStore } from './src/store/webhookStore'
import { DeviceActivityModule } from './src/native/DeviceActivityModule'
import { ensureWeeklyMentorNotification } from './src/utils/weeklyMentorNotification'
import { useSessionTimer } from './src/hooks/useSessionTimer'

type Tab = 'home' | 'stats' | 'schedule' | 'settings'

type PurchaseTrigger = 'manual' | 'profile' | 'schedule' | 'session_limit'

const TABS: { key: Tab; label: string }[] = [
  { key: 'home',     label: 'HOME' },
  { key: 'stats',    label: 'RECORD' },
  { key: 'schedule', label: 'BLOCKS' },
  { key: 'settings', label: 'CONFIG' },
]

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [purchaseTrigger, setPurchaseTrigger] = useState<PurchaseTrigger>('manual')
  const [profileOpen, setProfileOpen] = useState(false)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const { load, trackEvent } = useGrowthStore()

  useSessionTimer()

  const isWeb = Platform.OS === 'web'

  useEffect(() => {
    if (isWeb) {
      try {
        const v = typeof localStorage !== 'undefined' ? localStorage.getItem('monkmode:onboarded') : null
        setOnboarded(v === 'true')
      } catch {
        setOnboarded(false)
      }
    } else {
      AsyncStorage.getItem('monkmode:onboarded').then(v => setOnboarded(v === 'true'))
    }
    load()
    trackEvent('app_opened')
  }, [])

  useEffect(() => {
    if (!onboarded) return
    void (async () => {
      if (isWeb) {
        try {
          if ('Notification' in window && (window as any).Notification?.permission === 'default') {
            await (window as any).Notification.requestPermission()
          }
        } catch { /* ignore */ }
        // Skip native-only integrations on web
        return
      }
      await useIAPStore.getState().checkEntitlement()
      const rawIntentions = await AsyncStorage.getItem('monkmode:implementation_intentions')
      if (rawIntentions) {
        try {
          await DeviceActivityModule.setAppGroupJSON(
            'monk_implementation_intentions_json',
            JSON.parse(rawIntentions)
          )
        } catch { /* ignore */ }
      }
      const { completions } = await DeviceActivityModule.drainPendingScheduleCompletions()
      if (completions.length > 0) {
        await useStatsStore.getState().ingestScheduledCompletions(completions)
      }
      await useWebhookStore.getState().flushQueue()
      await ensureWeeklyMentorNotification()
    })()
  }, [onboarded])

  useEffect(() => {
    const handleURL = ({ url }: { url: string }) => {
      if (url.startsWith('monkmode://friendlock')) {
        setActiveTab('settings')
      }
    }
    const sub = Linking.addEventListener('url', handleURL)
    return () => sub.remove()
  }, [])

  useEffect(() => {
    if (!isWeb) return
    const handle = () => {
      const href = window.location.href
      if (href.includes('friendlock')) {
        setActiveTab('settings')
      }
    }
    handle()
    window.addEventListener('hashchange', handle)
    window.addEventListener('popstate', handle)
    return () => {
      window.removeEventListener('hashchange', handle)
      window.removeEventListener('popstate', handle)
    }
  }, [])

  useEffect(() => {
    if (!isWeb) return
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => { /* ignore */ })
    }
  }, [])

  useEffect(() => {
    if (!isWeb) return
    const ua = navigator.userAgent || ''
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia?.('(display-mode: standalone)').matches
    if (isIOS && !isStandalone) {
      setShowInstallBanner(true)
    }
  }, [])

  useEffect(() => {
    if (!isWeb) return
    if (onboarded === true) {
      try { localStorage.setItem('monkmode:onboarded', 'true') } catch { /* ignore */ }
    }
  }, [onboarded])

  const openPurchase = (t: PurchaseTrigger) => {
    if (isWeb) return
    setPurchaseTrigger(t)
    setPurchaseOpen(true)
  }

  if (onboarded === null) return null

  if (!onboarded) {
    return (
      <SafeAreaProvider>
        <CommitmentScreen onComplete={() => setOnboarded(true)} />
      </SafeAreaProvider>
    )
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNeedPurchase={!isWeb ? () => openPurchase('session_limit') : undefined} />
      case 'stats':
        return <StatsScreen />
      case 'schedule':
        return <ScheduleScreen onNeedPurchase={!isWeb ? () => openPurchase('schedule') : undefined} />
      case 'settings':
        return (
          <SettingsScreen
            onOpenPublicProfile={() => {
              const hasPurchased = isWeb ? true : useIAPStore.getState().hasPurchased()
              if (!hasPurchased) {
                openPurchase('profile')
                return
              }
              setProfileOpen(true)
            }}
            onOpenPurchase={t => {
              if (isWeb) return
              openPurchase(t ?? 'manual')
            }}
          />
        )
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.content}>
          {isWeb && showInstallBanner && (
            <View style={styles.installBanner}>
              <Text style={styles.installText}>
                Install this app: tap Share, then "Add to Home Screen" on iPhone.
              </Text>
              <TouchableOpacity onPress={() => setShowInstallBanner(false)} style={styles.installClose} activeOpacity={0.7}>
                <Text style={styles.installCloseText}>×</Text>
              </TouchableOpacity>
            </View>
          )}
          {renderScreen()}
          {!isWeb && purchaseOpen && (
            <View style={styles.overlay}>
              <PurchaseScreen
                trigger={purchaseTrigger === 'manual' ? 'manual' : purchaseTrigger}
                onBack={() => setPurchaseOpen(false)}
                onDismiss={() => setPurchaseOpen(false)}
                onPurchased={() => setPurchaseOpen(false)}
              />
            </View>
          )}
          {profileOpen && (
            <View style={styles.overlay}>
              <PublicProfileScreen onBack={() => setProfileOpen(false)} />
            </View>
          )}
        </View>
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
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bg,
    zIndex: 100,
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
  installBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  installText: {
    ...T.mono,
    fontSize: 10,
    color: Colors.textMid,
    flex: 1,
  },
  installClose: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  installCloseText: {
    ...T.mono,
    fontSize: 16,
    color: Colors.textMid,
  },
})
