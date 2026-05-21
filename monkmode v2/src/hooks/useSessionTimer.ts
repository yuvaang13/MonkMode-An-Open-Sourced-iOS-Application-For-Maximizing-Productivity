/**
 * hooks/useSessionTimer.ts
 *
 * Global timer hook. Mount once at the app root.
 * Calls sessionStore.tick() every second while a session is active.
 * Also handles auto-recording session completion in statsStore.
 */

import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useSessionStore } from '../store/sessionStore'
import { useStatsStore } from '../store/statsStore'

export function useSessionTimer() {
  const { status, durationMinutes, tick } = useSessionStore()
  const prevStatus = useRef(status)
  const { recordSessionComplete } = useStatsStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (status === 'active') {
      intervalRef.current = setInterval(tick, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      // Detect natural session end (not early override)
      if (prevStatus.current === 'active' && status === 'idle') {
        recordSessionComplete(durationMinutes)
      }
    }
    prevStatus.current = status
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [status])

  // Re-sync when app comes back to foreground
  // (DeviceActivity may have ended session while app was backgrounded)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') tick()
    })
    return () => sub.remove()
  }, [])
}
