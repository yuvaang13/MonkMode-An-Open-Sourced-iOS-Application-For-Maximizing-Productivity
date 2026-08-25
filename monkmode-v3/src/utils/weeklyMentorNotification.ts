/**
 * One weekly local notification — plain mentor summary, no deep link.
 */

import { Platform } from 'react-native'
import { useStatsStore } from '../store/statsStore'
import { useGrowthStore } from '../store/growthStore'

const NOTIF_ID = 'monkmode_weekly_mentor_v1'

let handlerSet = false
export async function ensureWeeklyMentorNotification(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return
  try {
    const Notifications = await import('expo-notifications')
    if (!handlerSet) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      })
      handlerSet = true
    }
    const { status } = await Notifications.getPermissionsAsync()
    let granted = status === 'granted'
    if (status !== 'granted') {
      const res = await Notifications.requestPermissionsAsync()
      granted = res.status === 'granted'
    }
    if (!granted) return
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID)
    await useStatsStore.getState().loadStats()
    await useGrowthStore.getState().load()
    const body = buildMentorBody()
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID,
      content: {
        title: 'MonkMode',
        body,
      },
      trigger: {
        weekday: 1,
        hour: 20,
        minute: 0,
        repeats: true,
      } as any,
    })
  } catch {
    /* expo-notifications not installed or bare workflow */
  }
}

function buildMentorBody(): string {
  const { weekly, blockAttempts } = useStatsStore.getState()
  const opens = useGrowthStore.getState().getWeeklyAppOpenCount()
  const auto = weekly.automaticSessionsCompleted
  const days = blockAttempts.slice(0, 7)
  let best = days[0]
  for (const d of days) {
    if (!best) { best = d; continue }
    if (d && d.count < best.count) best = d
  }
  const bestDay = best?.label ?? '—'
  const topApps = days
    .flatMap(d => d.apps.map(a => ({ app: a, day: d.label })))
    .reduce<Record<string, number>>((acc, x) => {
      acc[x.app] = (acc[x.app] ?? 0) + 1
      return acc
    }, {})
  const topEntry = Object.entries(topApps).sort((a, b) => b[1] - a[1])[0]
  const topLine = topEntry
    ? `You reached for ${topEntry[0]} ${topEntry[1]} times on the record.`
    : 'No block attempts logged on the record.'

  return [
    `This week: ${weekly.sessionsCompleted} sessions, ${weekly.hoursEnforced}h enforced.`,
    `You opened MonkMode ${opens} times. Sessions ran automatically ${auto} times.`,
    topLine,
    `Your lightest block-attempt day was ${bestDay}.`,
  ].join(' ')
}
