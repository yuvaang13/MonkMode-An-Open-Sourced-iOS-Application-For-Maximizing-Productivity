/**
 * Optional public URL monkmode.app/u/{username} — streak + hours (synced from stats).
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

const WORKER_URL = 'https://monkmode-profile.your-subdomain.workers.dev'

interface PublicProfileState {
  enabled: boolean
  username: string | null
  writeSecret: string | null
  lastSyncedAt: string | null
  syncError: string | null

  enable: (username: string) => Promise<{ success: boolean; error?: string }>
  disable: () => Promise<void>
  sync: (streak: number, hoursThisWeek: number, totalSessions: number) => Promise<void>
  checkUsernameAvailable: (username: string) => Promise<boolean>
  getPublicUrl: () => string | null
}

function generateSecret(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join('')
}

export const usePublicProfileStore = create<PublicProfileState>()(
  persist(
    (set, get) => ({
      enabled: false,
      username: null,
      writeSecret: null,
      lastSyncedAt: null,
      syncError: null,

      enable: async (username: string) => {
        const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)
        if (clean.length < 3) {
          return { success: false, error: 'Username must be at least 3 characters (a-z, 0-9, _)' }
        }

        const available = await get().checkUsernameAvailable(clean)
        if (!available) {
          return { success: false, error: 'Username already taken' }
        }

        const secret = generateSecret()

        try {
          const res = await fetch(`${WORKER_URL}/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: clean, secret }),
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            return { success: false, error: (body as any).error ?? 'Failed to claim username' }
          }
        } catch {
          return { success: false, error: 'Network error — check connection' }
        }

        set({ enabled: true, username: clean, writeSecret: secret, syncError: null })
        return { success: true }
      },

      disable: async () => {
        const { username, writeSecret } = get()
        if (username && writeSecret) {
          try {
            await fetch(`${WORKER_URL}/delete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, secret: writeSecret }),
            })
          } catch {
            /* best-effort */
          }
        }
        set({ enabled: false, username: null, writeSecret: null, lastSyncedAt: null })
      },

      sync: async (streak, hoursThisWeek, totalSessions) => {
        const { username, writeSecret, enabled } = get()
        if (!enabled || !username || !writeSecret) return

        try {
          const res = await fetch(`${WORKER_URL}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username,
              secret: writeSecret,
              streak,
              hoursThisWeek,
              totalSessions,
              updatedAt: new Date().toISOString(),
            }),
          })
          if (res.ok) {
            set({ lastSyncedAt: new Date().toISOString(), syncError: null })
          } else {
            set({ syncError: 'Sync failed — will retry' })
          }
        } catch {
          set({ syncError: 'Network error' })
        }
      },

      checkUsernameAvailable: async (username: string): Promise<boolean> => {
        try {
          const res = await fetch(`${WORKER_URL}/check?username=${encodeURIComponent(username)}`)
          if (!res.ok) return false
          const body = await res.json()
          return (body as any).available === true
        } catch {
          return true
        }
      },

      getPublicUrl: () => {
        const { username, enabled } = get()
        if (!enabled || !username) return null
        return `https://monkmode.app/u/${username}`
      },
    }),
    {
      name: 'monkmode-public-profile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
