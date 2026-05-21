/**
 * Optional outbound webhooks for session/start and session/end (paid).
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useIAPStore } from './iapStore'

export type WebhookEvent = 'session/start' | 'session/end'

interface QueuedWebhook {
  event: WebhookEvent
  payload: Record<string, unknown>
  createdAt: string
}

interface WebhookState {
  startUrl: string
  endUrl: string
  secret: string

  setStartUrl: (url: string) => void
  setEndUrl: (url: string) => void
  setSecret: (secret: string) => void
  enqueue: (event: WebhookEvent, payload: Record<string, unknown>) => Promise<void>
  flushQueue: () => Promise<void>
}

const QUEUE_KEY = 'monkmode:webhook_queue'

async function readQueue(): Promise<QueuedWebhook[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  return raw ? JSON.parse(raw) : []
}

async function writeQueue(q: QueuedWebhook[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50)))
}

async function postJson(url: string, body: object, secret: string): Promise<boolean> {
  if (!url.trim()) return true
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (secret.trim()) headers['X-MonkMode-Secret'] = secret.trim()
    const res = await fetch(url.trim(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

export const useWebhookStore = create<WebhookState>()(
  persist(
    (set, get) => ({
      startUrl: '',
      endUrl: '',
      secret: '',

      setStartUrl: url => set({ startUrl: url }),
      setEndUrl: url => set({ endUrl: url }),
      setSecret: secret => set({ secret }),

      enqueue: async (event, payload) => {
        const q = await readQueue()
        q.push({ event, payload, createdAt: new Date().toISOString() })
        await writeQueue(q)
      },

      flushQueue: async () => {
        const { startUrl, endUrl, secret } = get()
        let q = await readQueue()
        if (q.length === 0) return

        const remaining: QueuedWebhook[] = []
        for (const item of q) {
          const url = item.event === 'session/start' ? startUrl : endUrl
          const ok = await postJson(url, { event: item.event, ...item.payload }, secret)
          if (!ok) remaining.push(item)
        }
        await writeQueue(remaining)
      },
    }),
    {
      name: 'monkmode-webhooks',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

export async function sendWebhookNow(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const { startUrl, endUrl, secret, enqueue, flushQueue } = useWebhookStore.getState()
  const url = event === 'session/start' ? startUrl : endUrl
  if (!url.trim()) {
    await enqueue(event, payload)
    return
  }
  const ok = await postJson(url, { event, ...payload }, secret)
  if (!ok) await enqueue(event, payload)
  await flushQueue()
}

export async function sendWebhookIfEligible(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  if (!useIAPStore.getState().canUseWebhooks()) return
  await sendWebhookNow(event, payload)
}
