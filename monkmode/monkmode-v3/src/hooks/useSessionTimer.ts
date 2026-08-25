/**
 * Global timer: calls sessionStore.tick while active (e.g. AppState resume).
 * Session completion is handled in FocusActiveScreen.
 */

import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useSessionStore } from '../store/sessionStore'

export function useSessionTimer() {
  const { status, tick } = useSessionStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (status === 'active') {
      intervalRef.current = setInterval(tick, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
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
