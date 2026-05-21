/**
 * store/scheduleStore.ts
 *
 * Manages recurring focus schedules that enforce themselves automatically —
 * no daily interaction required after initial setup.
 *
 * Each schedule entry maps to a DeviceActivitySchedule registered with iOS.
 * The DeviceActivityMonitor extension starts/stops restrictions without
 * the main app needing to be open or running.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DeviceActivityModule } from '../native/DeviceActivityModule'

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface Schedule {
  id: string
  name: string
  enabled: boolean
  days: DayOfWeek[]
  startHour: number    // 0–23
  startMinute: number
  endHour: number
  endMinute: number
  whitelistPresetId: string | null
}

const DEFAULT_SCHEDULES: Schedule[] = [
  {
    id: 'deep-work',
    name: 'Deep Work',
    enabled: false,
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startHour: 9, startMinute: 0,
    endHour: 12, endMinute: 0,
    whitelistPresetId: null,
  },
  {
    id: 'evening-wind',
    name: 'Evening Wind-Down',
    enabled: false,
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    startHour: 21, startMinute: 0,
    endHour: 23, endMinute: 59,
    whitelistPresetId: null,
  },
]

interface ScheduleState {
  schedules: Schedule[]

  addSchedule: (schedule: Omit<Schedule, 'id'>) => Promise<void>
  updateSchedule: (id: string, patch: Partial<Schedule>) => Promise<void>
  toggleSchedule: (id: string, enabled: boolean) => Promise<void>
  deleteSchedule: (id: string) => Promise<void>
  syncAllToOS: () => Promise<void>
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      schedules: DEFAULT_SCHEDULES,

      addSchedule: async (schedule) => {
        const id = `schedule_${Date.now()}`
        const next = [...get().schedules, { ...schedule, id }]
        set({ schedules: next })
        if (schedule.enabled) await registerWithOS({ ...schedule, id })
      },

      updateSchedule: async (id, patch) => {
        const next = get().schedules.map(s => s.id === id ? { ...s, ...patch } : s)
        set({ schedules: next })
        const updated = next.find(s => s.id === id)
        if (updated?.enabled) await registerWithOS(updated)
        else await DeviceActivityModule.cancelSchedule(id)
      },

      toggleSchedule: async (id, enabled) => {
        const next = get().schedules.map(s => s.id === id ? { ...s, enabled } : s)
        set({ schedules: next })
        const schedule = next.find(s => s.id === id)
        if (!schedule) return
        if (enabled) await registerWithOS(schedule)
        else await DeviceActivityModule.cancelSchedule(id)
      },

      deleteSchedule: async (id) => {
        await DeviceActivityModule.cancelSchedule(id)
        set({ schedules: get().schedules.filter(s => s.id !== id) })
      },

      syncAllToOS: async () => {
        const enabled = get().schedules.filter(s => s.enabled)
        await Promise.all(enabled.map(registerWithOS))
      },
    }),
    {
      name: 'monkmode-schedules',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

// ─── OS Registration ──────────────────────────────────────────────────────────

async function registerWithOS(schedule: Schedule): Promise<void> {
  // Build DateComponents arrays for each active day
  // DeviceActivitySchedule supports repeating daily windows
  await DeviceActivityModule.scheduleRecurring({
    id: schedule.id,
    days: schedule.days,
    startHour: schedule.startHour,
    startMinute: schedule.startMinute,
    endHour: schedule.endHour,
    endMinute: schedule.endMinute,
    whitelistPresetId: schedule.whitelistPresetId,
  })
}
