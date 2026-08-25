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

    let sessions: SessionRecord[] = []
    let attempts: Array<{ date: string; app: string }> = []
    let justifications: Justification[] = []
    try { sessions = sessionsRaw ? JSON.parse(sessionsRaw) : [] } catch { sessions = [] }
    try { attempts = attemptsRaw ? JSON.parse(attemptsRaw) : [] } catch { attempts = [] }
    try { justifications = justRaw ? JSON.parse(justRaw) : [] } catch { justifications = [] }
    if (!Array.isArray(sessions)) sessions = []
    if (!Array.isArray(attempts)) attempts = []
    if (!Array.isArray(justifications)) justifications = []

    const normalized = sessions.map(s => ({
      ...s,
      source: (s.source ?? 'manual') as SessionSource,
    }))

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000)

    const recentSessions = normalized.filter(s => new Date(s.date) >= weekAgo)
    const autoRecent = recentSessions.filter(s => s.source === 'schedule')

    const weekly: WeeklyStats = {
      sessionsCompleted: recentSessions.length,
      automaticSessionsCompleted: autoRecent.length,
      hoursEnforced: Number((recentSessions.reduce((s, r) => s + r.duration, 0) / 60).toFixed(1)),
      overrideAttempts: recentSessions.reduce((s, r) => s + r.overrideAttempts, 0),
      overridesGranted: recentSessions.filter(r => r.overrideGranted).length,
    }

    // Use local calendar dates for block-attempt aggregation (fixes UTC misalignment)
    const toLocalKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const dayMap: Record<string, DayBlockData> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      const key = toLocalKey(d)
      dayMap[key] = { label: DAY_LABELS[d.getDay()], date: key, count: 0, apps: [] }
    }
    for (const a of attempts) {
      try {
        const dt = new Date(a.date)
        const key = toLocalKey(dt)
        if (dayMap[key]) {
          dayMap[key].count += 1
          if (!dayMap[key].apps.includes(a.app)) dayMap[key].apps.push(a.app)
        }
      } catch { /* ignore malformed dates */ }
    }

    // Calendar-aware streak (handles DST correctly)
    const calendarDiffDays = (a: string, b: string) => {
      const da = new Date(a + 'T00:00:00')
      const db = new Date(b + 'T00:00:00')
      return Math.round((da.getTime() - db.getTime()) / 86400000)
    }
    const toLocalKey2 = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const localSessionDates = [...new Set(normalized.map(s => {
      try { return toLocalKey2(new Date(s.date)) } catch { return '' }
    }).filter(Boolean))].sort()
    let currentStreak = 0
    let longestStreak = 0
    let streak = 0
    let prev: string | null = null
    for (const date of localSessionDates) {
      if (prev) {
        const diff = calendarDiffDays(date, prev)
        streak = diff === 1 ? streak + 1 : 1
      } else {
        streak = 1
      }
      longestStreak = Math.max(longestStreak, streak)
      prev = date
    }
    const todayStr = toLocalKey2(now)
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate()-1)
    const yesterdayStr = toLocalKey2(yesterday)
    const lastDate = localSessionDates[localSessionDates.length - 1]
    currentStreak = (lastDate === todayStr || lastDate === yesterdayStr) ? streak : 0

    const allTime: AllTimeStats = {
      totalSessions: normalized.length,
      totalHours: Number((normalized.reduce((s, r) => s + r.duration, 0) / 60).toFixed(1)),
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
    let sessions: SessionRecord[] = []
    try {
      const raw = await AsyncStorage.getItem(KEYS.sessions)
      sessions = raw ? JSON.parse(raw) : []
      if (!Array.isArray(sessions)) sessions = []
    } catch { sessions = [] }
    sessions.push({
      date: new Date().toISOString(),
      duration: durationMinutes,
      overrideAttempts: 0,
      overrideGranted: false,
      source: opts?.source ?? 'manual',
      scheduleId: opts?.scheduleId,
    })
    // keep storage bounded: retain last 500 sessions
    if (sessions.length > 500) sessions = sessions.slice(-500)
    await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions))
    await get().loadStats()
    syncPublicProfileIfNeeded(get())
  },

  ingestScheduledCompletions: async items => {
    if (items.length === 0) return
    let sessions: SessionRecord[] = []
    try {
      const raw = await AsyncStorage.getItem(KEYS.sessions)
      sessions = raw ? JSON.parse(raw) : []
      if (!Array.isArray(sessions)) sessions = []
    } catch { sessions = [] }
    for (const c of items) {
      // Handle both ms and seconds timestamps gracefully
      const ts = c.endedAt > 1e12 ? c.endedAt : c.endedAt > 1e10 ? c.endedAt : c.endedAt * 1000
      const date = new Date(ts).toISOString()
      sessions.push({
        date,
        duration: c.durationMinutes,
        overrideAttempts: 0,
        overrideGranted: false,
        source: 'schedule',
        scheduleId: c.scheduleId === 'session' ? undefined : c.scheduleId,
      })
    }
    if (sessions.length > 500) sessions = sessions.slice(-500)
    await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions))
    await get().loadStats()
    syncPublicProfileIfNeeded(get())
    for (const c of items) {
      const ts = c.endedAt > 1e12 ? c.endedAt : c.endedAt > 1e10 ? c.endedAt : c.endedAt * 1000
      void sendWebhookIfEligible('session/end', {
        source: 'schedule',
        scheduleId: c.scheduleId,
        durationMinutes: c.durationMinutes,
        endedAt: new Date(ts).toISOString(),
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
    try {
      const raw = await AsyncStorage.getItem(KEYS.sessions)
      if (!raw) return
      const sessions = JSON.parse(raw)
      if (Array.isArray(sessions) && sessions.length > 0) {
        sessions[sessions.length - 1].overrideAttempts += 1
        if (granted) sessions[sessions.length - 1].overrideGranted = true
        await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions))
      }
      if (justification) await get().recordJustification('', justification)
      await get().loadStats()
    } catch { /* ignore corrupted storage */ }
  },

  recordJustification: async (sessionId, text) => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.justifications)
      const list: Justification[] = raw ? JSON.parse(raw) : []
      const safeList = Array.isArray(list) ? list : []
      safeList.push({
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        text,
        sessionId,
      })
      // cap justifications
      const trimmed = safeList.slice(-50)
      await AsyncStorage.setItem(KEYS.justifications, JSON.stringify(trimmed))
    } catch { /* ignore */ }
  },
}))
