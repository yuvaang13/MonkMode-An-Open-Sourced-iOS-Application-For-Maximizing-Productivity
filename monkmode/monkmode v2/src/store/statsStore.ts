/**
 * store/statsStore.ts
 *
 * Tracks session history, block attempts, and override justifications.
 * All data is on-device only — no network, no analytics.
 *
 * In production this would use SQLCipher (react-native-quick-sqlite).
 * For scaffold clarity, AsyncStorage keys are used with the same interface.
 */

import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface DayBlockData {
  label: string    // 'MON', 'TUE', etc.
  date: string     // ISO date
  count: number
  apps: string[]   // app display names attempted
}

export interface Justification {
  date: string     // formatted display date
  text: string
  sessionId: string
}

interface WeeklyStats {
  sessionsCompleted: number
  hoursEnforced: number
  overrideAttempts: number
  overridesGranted: number
}

interface AllTimeStats {
  totalSessions: number
  totalHours: number
  longestStreak: number
  currentStreak: number
  totalBlockAttempts: number
}

interface StatsState {
  weekly: WeeklyStats
  allTime: AllTimeStats
  blockAttempts: DayBlockData[]
  justifications: Justification[]

  loadStats: () => Promise<void>
  recordSessionComplete: (durationMinutes: number) => Promise<void>
  recordBlockAttempt: (appName: string) => Promise<void>
  recordOverrideAttempt: (granted: boolean, justification?: string) => Promise<void>
  recordJustification: (sessionId: string, text: string) => Promise<void>
}

const KEYS = {
  sessions:       'stats:sessions',
  blockAttempts:  'stats:block_attempts',
  justifications: 'stats:justifications',
}

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export const useStatsStore = create<StatsState>()((set, get) => ({
  weekly: { sessionsCompleted: 0, hoursEnforced: 0, overrideAttempts: 0, overridesGranted: 0 },
  allTime: { totalSessions: 0, totalHours: 0, longestStreak: 0, currentStreak: 0, totalBlockAttempts: 0 },
  blockAttempts: [],
  justifications: [],

  loadStats: async () => {
    const [sessionsRaw, attemptsRaw, justRaw] = await Promise.all([
      AsyncStorage.getItem(KEYS.sessions),
      AsyncStorage.getItem(KEYS.blockAttempts),
      AsyncStorage.getItem(KEYS.justifications),
    ])

    const sessions: Array<{ date: string; duration: number; overrideAttempts: number; overrideGranted: boolean }> =
      sessionsRaw ? JSON.parse(sessionsRaw) : []

    const attempts: Array<{ date: string; app: string }> =
      attemptsRaw ? JSON.parse(attemptsRaw) : []

    const justifications: Justification[] =
      justRaw ? JSON.parse(justRaw) : []

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000)

    const recentSessions = sessions.filter(s => new Date(s.date) >= weekAgo)
    const weekly: WeeklyStats = {
      sessionsCompleted: recentSessions.length,
      hoursEnforced: Math.round(recentSessions.reduce((s, r) => s + r.duration, 0) / 60),
      overrideAttempts: recentSessions.reduce((s, r) => s + r.overrideAttempts, 0),
      overridesGranted: recentSessions.filter(r => r.overrideGranted).length,
    }

    // Build 7-day block attempt data
    const dayMap: Record<string, DayBlockData> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      const key = d.toISOString().split('T')[0]
      dayMap[key] = { label: DAY_LABELS[d.getDay()], date: key, count: 0, apps: [] }
    }
    for (const a of attempts) {
      const key = a.date.split('T')[0]
      if (dayMap[key]) {
        dayMap[key].count += 1
        if (!dayMap[key].apps.includes(a.app)) dayMap[key].apps.push(a.app)
      }
    }

    // Streak calculation
    const sessionDates = [...new Set(sessions.map(s => s.date.split('T')[0]))].sort()
    let currentStreak = 0
    let longestStreak = 0
    let streak = 0
    let prev: string | null = null
    for (const date of sessionDates) {
      if (prev) {
        const diff = (new Date(date).getTime() - new Date(prev).getTime()) / 86400000
        streak = diff === 1 ? streak + 1 : 1
      } else {
        streak = 1
      }
      longestStreak = Math.max(longestStreak, streak)
      prev = date
    }
    const todayStr = now.toISOString().split('T')[0]
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0]
    const lastDate = sessionDates[sessionDates.length - 1]
    currentStreak = (lastDate === todayStr || lastDate === yesterdayStr) ? streak : 0

    const allTime: AllTimeStats = {
      totalSessions: sessions.length,
      totalHours: Math.round(sessions.reduce((s, r) => s + r.duration, 0) / 60),
      longestStreak,
      currentStreak,
      totalBlockAttempts: attempts.length,
    }

    set({
      weekly,
      allTime,
      blockAttempts: Object.values(dayMap),
      justifications: justifications.slice().reverse().slice(0, 10),
    })
  },

  recordSessionComplete: async (durationMinutes) => {
    const raw = await AsyncStorage.getItem(KEYS.sessions)
    const sessions = raw ? JSON.parse(raw) : []
    sessions.push({ date: new Date().toISOString(), duration: durationMinutes, overrideAttempts: 0, overrideGranted: false })
    await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions))
    get().loadStats()
  },

  recordBlockAttempt: async (appName) => {
    const raw = await AsyncStorage.getItem(KEYS.blockAttempts)
    const attempts = raw ? JSON.parse(raw) : []
    attempts.push({ date: new Date().toISOString(), app: appName })
    await AsyncStorage.setItem(KEYS.blockAttempts, JSON.stringify(attempts))
  },

  recordOverrideAttempt: async (granted, justification) => {
    // Update last session's override count
    const raw = await AsyncStorage.getItem(KEYS.sessions)
    if (!raw) return
    const sessions = JSON.parse(raw)
    if (sessions.length > 0) {
      sessions[sessions.length - 1].overrideAttempts += 1
      if (granted) sessions[sessions.length - 1].overrideGranted = true
    }
    await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions))
    if (justification) get().recordJustification('', justification)
    get().loadStats()
  },

  recordJustification: async (sessionId, text) => {
    const raw = await AsyncStorage.getItem(KEYS.justifications)
    const list: Justification[] = raw ? JSON.parse(raw) : []
    list.push({
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      text,
      sessionId,
    })
    await AsyncStorage.setItem(KEYS.justifications, JSON.stringify(list))
  },
}))
