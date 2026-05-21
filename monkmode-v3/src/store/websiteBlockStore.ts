import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type WebsiteMode = 'blocklist' | 'allowlist'

export interface WebsitePreset {
  id: string
  name: string
  domains: string[]
}

interface WebsiteBlockState {
  mode: WebsiteMode
  blockedDomains: string[]
  allowedDomains: string[]
  presets: WebsitePreset[]
  setMode: (mode: WebsiteMode) => void
  addBlockedDomain: (domain: string) => void
  removeBlockedDomain: (domain: string) => void
  addAllowedDomain: (domain: string) => void
  removeAllowedDomain: (domain: string) => void
  loadPreset: (id: string) => void
  exportList: () => string
}

const DEFAULT_PRESETS: WebsitePreset[] = [
  {
    id: 'social',
    name: 'Social',
    domains: ['instagram.com', 'tiktok.com', 'x.com', 'twitter.com', 'reddit.com', 'facebook.com', 'snapchat.com'],
  },
  {
    id: 'video',
    name: 'Video',
    domains: ['youtube.com', 'netflix.com', 'twitch.tv', 'hulu.com', 'disneyplus.com'],
  },
  {
    id: 'news',
    name: 'News',
    domains: ['cnn.com', 'foxnews.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com'],
  },
]

function normalizeDomain(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
}

function appendUnique(list: string[], domain: string) {
  const normalized = normalizeDomain(domain)
  if (!normalized || list.includes(normalized)) return list
  return [...list, normalized]
}

export const useWebsiteBlockStore = create<WebsiteBlockState>()(
  persist(
    (set, get) => ({
      mode: 'blocklist',
      blockedDomains: DEFAULT_PRESETS[0].domains,
      allowedDomains: ['icloud.com', 'apple.com', 'maps.apple.com'],
      presets: DEFAULT_PRESETS,

      setMode: mode => set({ mode }),
      addBlockedDomain: domain => set(state => ({ blockedDomains: appendUnique(state.blockedDomains, domain) })),
      removeBlockedDomain: domain => set(state => ({
        blockedDomains: state.blockedDomains.filter(d => d !== normalizeDomain(domain)),
      })),
      addAllowedDomain: domain => set(state => ({ allowedDomains: appendUnique(state.allowedDomains, domain) })),
      removeAllowedDomain: domain => set(state => ({
        allowedDomains: state.allowedDomains.filter(d => d !== normalizeDomain(domain)),
      })),
      loadPreset: id => {
        const preset = get().presets.find(p => p.id === id)
        if (!preset) return
        set(state => ({
          blockedDomains: Array.from(new Set([...state.blockedDomains, ...preset.domains])),
        }))
      },
      exportList: () => {
        const { mode, blockedDomains, allowedDomains } = get()
        const list = mode === 'blocklist' ? blockedDomains : allowedDomains
        return list.map(domain => domain.trim()).filter(Boolean).join('\n')
      },
    }),
    {
      name: 'monkmode-website-blocks',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
