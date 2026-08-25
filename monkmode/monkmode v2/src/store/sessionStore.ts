/**
 * store/sessionStore.ts  (v2)
 *
 * Core session state. Manages lifecycle, timer, config, and
 * coordinates native restriction calls.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ScreenTimeModule } from '../native/ScreenTimeModule'
import { verifyOverridePasscode } from '../utils/keychain'

export type SessionStatus = 'idle' | 'active' | 'break'

export interface SessionConfig {
  durationMinutes: number
  breakIntervalMinutes: number
  breakDurationMinutes: number
  hardLock: boolean
}

interface SessionState {
  status: SessionStatus
  startedAt: number | null
  endsAt: number | null
  durationMinutes: number
  blockedTokenCount: number
  streak: number
  lastSessionDate: string | null
  config: SessionConfig

  beginSession: (blockedTokens: string[], cfg: SessionConfig) => Promise<void>
  endSession: (passcode?: string) => Promise<{ success: boolean; error?: string }>
  updateConfig: (patch: Partial<SessionConfig>) => void
  tick: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      startedAt: null,
      endsAt: null,
      durationMinutes: 90,
      blockedTokenCount: 0,
      streak: 0,
      lastSessionDate: null,
      config: {
        durationMinutes: 90,
        breakIntervalMinutes: 25,
        breakDurationMinutes: 5,
        hardLock: false,
      },

      beginSession: async (blockedTokens, cfg) => {
        const result = await ScreenTimeModule.applyRestrictions(blockedTokens, cfg.durationMinutes)
        const now = Date.now()
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(now - 86400000).toISOString().split('T')[0]
        const { streak, lastSessionDate } = get()
        const newStreak =
          lastSessionDate === yesterday ? streak + 1 :
          lastSessionDate === today    ? streak      : 1

        set({
          status: 'active',
          startedAt: now,
          endsAt: result.endsAt * 1000,
          durationMinutes: cfg.durationMinutes,
          blockedTokenCount: result.restricted,
          config: cfg,
          streak: newStreak,
          lastSessionDate: today,
        })
      },

      endSession: async (passcode) => {
        const { config, status } = get()
        if (status !== 'active') return { success: false, error: 'No active session' }
        if (config.hardLock) return { success: false, error: 'Hard lock is enabled.' }

        if (passcode && passcode !== '__post_cooldown_clear__') {
          const valid = await verifyOverridePasscode(passcode)
          if (!valid) return { success: false, error: 'Incorrect passcode' }
        }

        await ScreenTimeModule.clearRestrictions()
        set({ status: 'idle', startedAt: null, endsAt: null, blockedTokenCount: 0 })
        return { success: true }
      },

      updateConfig: (patch) =>
        set(state => ({ config: { ...state.config, ...patch } })),

      tick: () => {
        const { endsAt } = get()
        if (endsAt && Date.now() >= endsAt) {
          set({ status: 'idle', startedAt: null, endsAt: null, blockedTokenCount: 0 })
        }
      },
    }),
    {
      name: 'monkmode-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        streak: state.streak,
        lastSessionDate: state.lastSessionDate,
        config: state.config,
      }),
    }
  )
)
