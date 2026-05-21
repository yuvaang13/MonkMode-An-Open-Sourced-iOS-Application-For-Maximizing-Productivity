/**
 * On-device session history, block attempts, overrides.
 */

import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { usePublicProfileStore } from './publicProfileStore'
import { sendWebhookIfEligible } from './webhookStore'

export interface DayBlockData {
  label: string
  date: string
  count: number
  apps: string[]
}

export interface Justification {
  date: string
  text: string
  sessionId: string
}

export type SessionSource = 'manual' | 'schedule' | 'multi_day'

interface SessionRecord {
  date: string
  duration: number
  overrideAttempts: number
  overrideGranted: boolean
  source: SessionSource
  scheduleId?: string
}

interface WeeklyStats {
  sessionsCompleted: number
  /** Completed via Device Activity schedules (extension), merged from App Group */
  automaticSessionsCompleted: number
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
  recordSessionComplete: (
    durationMinutes: number,
    opts?: { source?: SessionSource; scheduleId?: string }
  ) => Promise<void>
  recordBlockAttempt: (appName: string) => Promise<void>
  recordOverrideAttempt: (granted: boolean, justification?: string) => Promise<void>
  recordJustification: (sessionId: string, text: string) => Promise<void>
  ingestScheduledCompletions: (
    items: Array<{ scheduleId: string; durationMinutes: number; endedAt: number }>
  ) => Promise<void>
}

const KEYS = {
  sessions:       'stats:sessions',
  blockAttempts:  'stats:block_attempts',
  justifications: 'stats:justifications',
}

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function syncPublicProfileIfNeeded(state: {
  allTime: AllTimeStats
  weekly: WeeklyStats
}) {
  const pp = usePublicProfileStore.getState()
  if (pp.enabled) {
    void pp.sync(
      state.allTime.currentStreak,
      state.weekly.hoursEnforced,
      state.allTime.totalSessions
    )
  }
}

export const useStatsStore = create<StatsState>()((set, get) => ({
  weekly: {
    sessionsCompleted: 0,
    automaticSessionsCompleted: 0,
    hoursEnforced: 0,
    overrideAttempts: 0,
    overridesGranted: 0,
  },
  allTime: { totalSessions: 0, totalHours: 0, longestStreak: 0, currentStreak: 0, totalBlockAttempts: 0 },
  blockAttempts: [],
  justifications: [],

  loadStats: async () => {
    const [sessionsRaw, attemptsRaw, justRaw] = await Promise.all([
      AsyncStorage.getItem(KEYS.sessions),
      AsyncStorage.getItem(KEYS.blockAttempts),
      AsyncStorage.getItem(KEYS.justifications),
    ])

    const sessions: SessionRecord[] = sessionsRaw ? JSON.parse(sessionsRaw) : []
    const normalized = sessions.map(s => ({
      ...s,
      source: (s.source ?? 'manual') as SessionSource,
    }))

    const attempts: Array<{ date: string; app: string }> =
      attemptsRaw ? JSON.parse(attemptsRaw) : []

    const justifications: Justification[] =
      justRaw ? JSON.parse(justRaw) : []

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000)

    const recentSessions = normalized.filter(s => new Date(s.date) >= weekAgo)
    const autoRecent = recentSessions.filter(s => s.source === 'schedule')

    const weekly: WeeklyStats = {
      sessionsCompleted: recentSessions.length,
      automaticSessionsCompleted: autoRecent.length,
      hoursEnforced: Math.round(recentSessions.reduce((s, r) => s + r.duration, 0) / 60),
      overrideAttempts: recentSessions.reduce((s, r) => s + r.overrideAttempts, 0),
      overridesGranted: recentSessions.filter(r => r.overrideGranted).length,
    }

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

    const sessionDates = [...new Set(normalized.map(s => s.date.split('T')[0]))].sort()
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
      totalSessions: normalized.length,
      totalHours: Math.round(normalized.reduce((s, r) => s + r.duration, 0) / 60),
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

  recordSessionComplete: async (durationMinutes, opts) => {
    const raw = await AsyncStorage.getItem(KEYS.sessions)
    const sessions: SessionRecord[] = raw ? JSON.parse(raw) : []
    sessions.push({
      date: new Date().toISOString(),
      duration: durationMinutes,
      overrideAttempts: 0,
      overrideGranted: false,
      source: opts?.source ?? 'manual',
      scheduleId: opts?.scheduleId,
    })
    await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions))
    await get().loadStats()
    syncPublicProfileIfNeeded(get())
  },

  ingestScheduledCompletions: async items => {
    if (items.length === 0) return
    const raw = await AsyncStorage.getItem(KEYS.sessions)
    const sessions: SessionRecord[] = raw ? JSON.parse(raw) : []
    for (const c of items) {
      const date = new Date(c.endedAt * 1000).toISOString()
      sessions.push({
        date,
        duration: c.durationMinutes,
        overrideAttempts: 0,
        overrideGranted: false,
        source: 'schedule',
        scheduleId: c.scheduleId === 'session' ? undefined : c.scheduleId,
      })
    }
    await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions))
    await get().loadStats()
    syncPublicProfileIfNeeded(get())
    for (const c of items) {
      void sendWebhookIfEligible('session/end', {
        source: 'schedule',
        scheduleId: c.scheduleId,
        durationMinutes: c.durationMinutes,
        endedAt: new Date(c.endedAt * 1000).toISOString(),
      })
    }
  },

  recordBlockAttempt: async (appName) => {
    const raw = await AsyncStorage.getItem(KEYS.blockAttempts)
    const attempts = raw ? JSON.parse(raw) : []
    attempts.push({ date: new Date().toISOString(), app: appName })
    await AsyncStorage.setItem(KEYS.blockAttempts, JSON.stringify(attempts))
  },

  recordOverrideAttempt: async (granted, justification) => {
    const raw = await AsyncStorage.getItem(KEYS.sessions)
    if (!raw) return
    const sessions = JSON.parse(raw)
    if (sessions.length > 0) {
      sessions[sessions.length - 1].overrideAttempts += 1
      if (granted) sessions[sessions.length - 1].overrideGranted = true
    }
    await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions))
    if (justification) get().recordJustification('', justification)
    await get().loadStats()
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
