import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type GrowthEventName =
  | 'app_opened'
  | 'onboarding_started'
  | 'onboarding_goal_selected'
  | 'onboarding_completed'
  | 'first_session_started'
  | 'session_started'
  | 'session_completed'
  | 'schedule_created'
  | 'schedule_enabled'
  | 'friend_lock_opened'
  | 'friend_invite_generated'

interface GrowthEvent {
  name: GrowthEventName
  timestamp: string
  properties?: Record<string, string | number | boolean>
}

/** Monday 00:00 local → next Monday 00:00 (exclusive end), in ms. */
export function getLocalWeekRangeMs(now = new Date()): { start: number; end: number } {
  const d = new Date(now)
  const day = d.getDay() // 0 Sun … 6 Sat
  const diffToMonday = (day + 6) % 7
  d.setDate(d.getDate() - diffToMonday)
  d.setHours(0, 0, 0, 0)
  const start = d.getTime()
  return { start, end: start + 7 * 86400000 }
}

interface GrowthState {
  events: GrowthEvent[]
  activation: {
    firstSessionStartedAt: string | null
    firstSessionCompletedAt: string | null
    onboardingCompletedAt: string | null
  }
  trackEvent: (
    name: GrowthEventName,
    properties?: Record<string, string | number | boolean>
  ) => Promise<void>
  getEventCount: (name: GrowthEventName) => number
  /** app_opened events with ISO timestamp falling in current local week */
  getWeeklyAppOpenCount: () => number
  load: () => Promise<void>
}

const EVENT_KEY = 'monkmode:growth_events'
const ACTIVATION_KEY = 'monkmode:growth_activation'
const MAX_EVENTS = 300

export const useGrowthStore = create<GrowthState>()((set, get) => ({
  events: [],
  activation: {
    firstSessionStartedAt: null,
    firstSessionCompletedAt: null,
    onboardingCompletedAt: null,
  },

  load: async () => {
    const [eventsRaw, activationRaw] = await Promise.all([
      AsyncStorage.getItem(EVENT_KEY),
      AsyncStorage.getItem(ACTIVATION_KEY),
    ])
    const events: GrowthEvent[] = eventsRaw ? JSON.parse(eventsRaw) : []
    const activation = activationRaw
      ? JSON.parse(activationRaw)
      : {
          firstSessionStartedAt: null,
          firstSessionCompletedAt: null,
          onboardingCompletedAt: null,
        }
    set({ events, activation })
  },

  getEventCount: (name) => get().events.filter((event) => event.name === name).length,

  getWeeklyAppOpenCount: () => {
    const { start, end } = getLocalWeekRangeMs()
    return get().events.filter(e => {
      if (e.name !== 'app_opened') return false
      const t = new Date(e.timestamp).getTime()
      return t >= start && t < end
    }).length
  },

  trackEvent: async (name, properties) => {
    const nowIso = new Date().toISOString()
    const event: GrowthEvent = { name, timestamp: nowIso, properties }
    const nextEvents = [...get().events, event].slice(-MAX_EVENTS)
    const activation = { ...get().activation }

    if (name === 'onboarding_completed' && !activation.onboardingCompletedAt) {
      activation.onboardingCompletedAt = nowIso
    }
    if (name === 'first_session_started' && !activation.firstSessionStartedAt) {
      activation.firstSessionStartedAt = nowIso
    }
    if (name === 'session_completed' && !activation.firstSessionCompletedAt) {
      activation.firstSessionCompletedAt = nowIso
    }

    set({ events: nextEvents, activation })
    await Promise.all([
      AsyncStorage.setItem(EVENT_KEY, JSON.stringify(nextEvents)),
      AsyncStorage.setItem(ACTIVATION_KEY, JSON.stringify(activation)),
    ])
  },
}))
