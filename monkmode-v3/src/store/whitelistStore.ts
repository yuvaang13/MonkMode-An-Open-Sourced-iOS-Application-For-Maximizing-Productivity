// src/store/whitelistStore.ts
// Manages the set of allowed (whitelisted) app tokens.
// App tokens are opaque base64 strings from FamilyActivityPicker.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface AppEntry {
  token: string           // base64 ApplicationToken
  displayName: string     // from FamilyActivityPicker metadata
  bundleCategory: string  // 'social' | 'productivity' | 'utilities' | etc.
}

export interface WhitelistPreset {
  id: string
  name: string            // e.g. "Deep Work", "Morning"
  tokens: string[]
}

interface WhitelistState {
  installedApps: AppEntry[]         // populated by AppInventoryModule
  allowedTokens: Set<string>        // currently whitelisted
  presets: WhitelistPreset[]

  setInstalledApps: (apps: AppEntry[]) => void
  toggleApp: (token: string) => void
  allowOnly: (tokens: string[]) => void
  savePreset: (name: string) => void
  loadPreset: (id: string) => void
  getBlockedTokens: () => string[]  // tokens NOT in allowedTokens
}

export const useWhitelistStore = create<WhitelistState>()(
  persist(
    (set, get) => ({
      installedApps: [],
      allowedTokens: new Set(),
      presets: [
        { id: 'deep-work', name: 'Deep Work', tokens: [] },
        { id: 'morning', name: 'Morning', tokens: [] },
      ],

      setInstalledApps: (apps) => set({ installedApps: apps }),

      toggleApp: (token) =>
        set((state) => {
          const next = new Set(state.allowedTokens)
          if (next.has(token)) next.delete(token)
          else next.add(token)
          return { allowedTokens: next }
        }),

      allowOnly: (tokens) => set({ allowedTokens: new Set(tokens) }),

      savePreset: (name) => {
        const { allowedTokens, presets } = get()
        const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
        set({
          presets: [...presets, { id, name, tokens: Array.from(allowedTokens) }],
        })
      },

      loadPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id)
        if (preset) set({ allowedTokens: new Set(preset.tokens) })
      },

      getBlockedTokens: () => {
        const { installedApps, allowedTokens } = get()
        return installedApps
          .filter((app) => !allowedTokens.has(app.token))
          .map((app) => app.token)
      },
    }),
    {
      name: 'monkmode-whitelist',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        allowedTokens: Array.from(state.allowedTokens),
        presets: state.presets,
      }),
      merge: (persisted: any, current) => ({
        ...current,
        ...(persisted || {}),
        allowedTokens: new Set(persisted?.allowedTokens ?? []),
      }),
    }
  )
)
