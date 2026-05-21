/**
 * store/sessionStore.ts  (v3 — Option C)
 *
 * Session state without FamilyControls enforcement.
 * Enforcement is handled by the user's manually configured Screen Time limits.
 *
 * MonkMode's role:
 *   1. Track session state (timer, streak, config)
 *   2. Set/restore device wallpaper on session start/end
 *   3. Show commitment anchor and justification capture on override
 *   4. Log all session data to statsStore
 *
 * The actual app blocking is done by iOS Screen Time (set up by user).
 * MonkMode is the timer, the ritual, the record — not the enforcer.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { WallpaperModule } from '../native/WallpaperModule'
import { ScreenTimeModule } from '../native/ScreenTimeModule'
import type { ImplementationIntention } from '../types/implementationIntention'
import { sendWebhookIfEligible } from './webhookStore'
import { useWhitelistStore } from './whitelistStore'

export type SessionStatus = 'idle' | 'active' | 'break'
export type SessionKind = 'timed' | 'multiDay'

export interface SessionConfig {
  sessionKind: SessionKind
  durationMinutes: number
  durationDays: number
  breakIntervalMinutes: number
  breakDurationMinutes: number
  hardLock: boolean
  dailyCheckInRequired: boolean
}

export type WallpaperMethod = 'programmatic' | 'photos_fallback' | 'none'

export interface BeginSessionOptions {
  intention?: ImplementationIntention | null
  configOverride?: Partial<SessionConfig>
}

interface SessionState {
  status: SessionStatus
  startedAt: number | null
  endsAt: number | null
  durationMinutes: number
  activeSessionKind: SessionKind
  activeTotalDays: number
  dailyCheckIns: string[]
  streak: number
  lastSessionDate: string | null
  config: SessionConfig
  wallpaperMethod: WallpaperMethod
  screenTimeConfigured: boolean   // user has confirmed Screen Time is set up
  graceSkipsRemaining: number
  recoveryMissionActive: boolean
  graceWeekKey: string | null
  /** Shown on Focus screen — from first matching enabled schedule intention */
  intentionAnchor: ImplementationIntention | null

  beginSession: (
    intention?: ImplementationIntention | BeginSessionOptions | null
  ) => Promise<{ wallpaperMethod: WallpaperMethod }>
  endSession: () => Promise<void>
  updateConfig: (patch: Partial<SessionConfig>) => void
  markDailyCheckIn: () => void
  setScreenTimeConfigured: (v: boolean) => void
  useGraceSkip: () => void
  refreshRetentionState: () => void
  tick: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      startedAt: null,
      endsAt: null,
      durationMinutes: 90,
      activeSessionKind: 'timed',
      activeTotalDays: 1,
      dailyCheckIns: [],
      streak: 0,
      lastSessionDate: null,
      wallpaperMethod: 'none',
      screenTimeConfigured: false,
      graceSkipsRemaining: 1,
      recoveryMissionActive: false,
      graceWeekKey: null,
      intentionAnchor: null,
      config: {
        sessionKind: 'timed',
        durationMinutes: 90,
        durationDays: 1,
        breakIntervalMinutes: 25,
        breakDurationMinutes: 5,
        hardLock: false,
        dailyCheckInRequired: true,
      },

      beginSession: async (input = null) => {
        const options: BeginSessionOptions =
          input && typeof input === 'object' && ('configOverride' in input || 'intention' in input)
            ? input as BeginSessionOptions
            : { intention: input as ImplementationIntention | null }
        get().refreshRetentionState()
        const config = { ...get().config, ...(options.configOverride ?? {}) }
        const now = Date.now()
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(now - 86400000).toISOString().split('T')[0]
        const { streak, lastSessionDate } = get()

        const newStreak =
          lastSessionDate === yesterday ? streak + 1 :
          lastSessionDate === today    ? streak      : 1

        // Set MonkMode wallpaper
        let method: WallpaperMethod = 'none'
        try {
          const result = await WallpaperModule.setMonkModeWallpaper()
          method = result.method
        } catch {
          // Non-fatal — session continues without wallpaper change
        }

        const activeSessionKind = config.sessionKind ?? 'timed'
        const activeTotalDays = Math.max(1, Math.min(100, config.durationDays ?? 1))
        const durationMinutes =
          activeSessionKind === 'multiDay'
            ? activeTotalDays * 24 * 60
            : config.durationMinutes
        const endsAt =
          activeSessionKind === 'multiDay'
            ? now + activeTotalDays * 24 * 60 * 60 * 1000
            : now + config.durationMinutes * 60 * 1000

        if (activeSessionKind === 'timed') {
          const blockedTokens = useWhitelistStore.getState().getBlockedTokens()
          if (blockedTokens.length > 0) {
            try {
              await ScreenTimeModule.applyRestrictions(blockedTokens, config.durationMinutes)
            } catch {
              // Keep the ritual usable even if FamilyControls permission/setup is missing.
            }
          }
        }

        set({
          status: 'active',
          startedAt: now,
          endsAt,
          durationMinutes,
          activeSessionKind,
          activeTotalDays,
          dailyCheckIns: activeSessionKind === 'multiDay' ? [today] : [],
          streak: newStreak,
          lastSessionDate: today,
          wallpaperMethod: method,
          recoveryMissionActive: false,
          intentionAnchor: options.intention ?? null,
        })

        void sendWebhookIfEligible('session/start', {
          durationMinutes,
          durationDays: activeSessionKind === 'multiDay' ? activeTotalDays : undefined,
          sessionKind: activeSessionKind,
          startedAt: new Date(now).toISOString(),
        })

        return { wallpaperMethod: method }
      },

      endSession: async () => {
        const { startedAt, durationMinutes } = get()
        void sendWebhookIfEligible('session/end', {
          durationMinutes,
          startedAt: startedAt ? new Date(startedAt).toISOString() : null,
          endedAt: new Date().toISOString(),
        })

        try {
          await WallpaperModule.restoreOriginalWallpaper()
        } catch {
          // Non-fatal
        }

        try {
          await ScreenTimeModule.clearRestrictions()
        } catch {
          // Non-fatal
        }

        set({
          status: 'idle',
          startedAt: null,
          endsAt: null,
          activeSessionKind: 'timed',
          activeTotalDays: 1,
          dailyCheckIns: [],
          wallpaperMethod: 'none',
          intentionAnchor: null,
        })
      },

      updateConfig: (patch) =>
        set(state => ({ config: { ...state.config, ...patch } })),

      markDailyCheckIn: () => {
        const today = new Date().toISOString().split('T')[0]
        set(state => (
          state.dailyCheckIns.includes(today)
            ? state
            : { dailyCheckIns: [...state.dailyCheckIns, today] }
        ))
      },

      setScreenTimeConfigured: (v) =>
        set({ screenTimeConfigured: v }),

      useGraceSkip: () => {
        get().refreshRetentionState()
        const { graceSkipsRemaining, recoveryMissionActive } = get()
        if (graceSkipsRemaining <= 0 || !recoveryMissionActive) return
        set({ graceSkipsRemaining: graceSkipsRemaining - 1, recoveryMissionActive: false })
      },

      refreshRetentionState: () => {
        const now = new Date()
        const weekKey = `${now.getUTCFullYear()}-${Math.ceil(
          (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
            Date.UTC(now.getUTCFullYear(), 0, 1) +
            86400000) /
            604800000
        )}`

        const state = get()
        const today = now.toISOString().split('T')[0]
        const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0]
        const needsRecovery =
          !!state.lastSessionDate &&
          state.lastSessionDate !== today &&
          state.lastSessionDate !== yesterday

        const persistedWeekKey = state.graceWeekKey
        const nextGrace = persistedWeekKey !== weekKey ? 1 : state.graceSkipsRemaining

        set({
          graceSkipsRemaining: nextGrace,
          recoveryMissionActive: needsRecovery,
          graceWeekKey: weekKey,
        })
      },

      tick: () => {
        /* Session end + stats are handled in FocusActiveScreen when the timer hits zero. */
      },
    }),
    {
      name: 'monkmode-session-v3',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        streak: state.streak,
        status: state.status,
        startedAt: state.startedAt,
        endsAt: state.endsAt,
        durationMinutes: state.durationMinutes,
        activeSessionKind: state.activeSessionKind,
        activeTotalDays: state.activeTotalDays,
        dailyCheckIns: state.dailyCheckIns,
        lastSessionDate: state.lastSessionDate,
        config: state.config,
        screenTimeConfigured: state.screenTimeConfigured,
        graceSkipsRemaining: state.graceSkipsRemaining,
        recoveryMissionActive: state.recoveryMissionActive,
        graceWeekKey: state.graceWeekKey,
      }),
    }
  )
)
