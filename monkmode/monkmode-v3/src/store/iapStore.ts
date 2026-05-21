/**
 * store/iapStore.ts
 *
 * One-time purchase via RevenueCat. $4.99 lifetime.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const MONKMODE_PRODUCT_ID = 'monkmode_lifetime_499'
export const REVENUECAT_API_KEY = 'appl_XXXXXXXXXXXXXXXX' // replace at launch
const PERSONAL_BUILD_UNLOCKED = REVENUECAT_API_KEY.includes('XXXX')

export type PurchaseStatus = 'unknown' | 'not_purchased' | 'purchased' | 'restoring'

interface IAPState {
  status: PurchaseStatus
  purchasedAt: string | null
  freeSessionsUsed: number
  FREE_SESSION_LIMIT: number

  checkEntitlement: () => Promise<void>
  purchase: () => Promise<{ success: boolean; error?: string }>
  restore: () => Promise<{ success: boolean; restored: boolean }>
  incrementFreeSession: () => void
  hasPurchased: () => boolean
  canStartSession: () => boolean
  canUseSchedules: () => boolean
  canUsePublicProfile: () => boolean
  canUseWebhooks: () => boolean
  freeSessionsRemaining: () => number
}

export const useIAPStore = create<IAPState>()(
  persist(
    (set, get) => ({
      status: 'unknown',
      purchasedAt: null,
      freeSessionsUsed: 0,
      FREE_SESSION_LIMIT: 3,

      checkEntitlement: async () => {
        if (PERSONAL_BUILD_UNLOCKED) {
          set({ status: 'purchased', purchasedAt: new Date().toISOString() })
          return
        }
        try {
          const Purchases = await importPurchases()
          if (!Purchases) {
            set({ status: 'not_purchased' })
            return
          }

          const customerInfo = await Purchases.getCustomerInfo()
          const active = customerInfo.entitlements.active['monkmode_pro']
          if (active) {
            set({ status: 'purchased', purchasedAt: active.latestPurchaseDate })
          } else {
            set({ status: 'not_purchased' })
          }
        } catch {
          // keep cached
        }
      },

      purchase: async () => {
        if (PERSONAL_BUILD_UNLOCKED) {
          set({ status: 'purchased', purchasedAt: new Date().toISOString() })
          return { success: true }
        }
        try {
          const Purchases = await importPurchases()
          if (!Purchases) {
            set({ status: 'purchased', purchasedAt: new Date().toISOString() })
            return { success: true }
          }

          const offerings = await Purchases.getOfferings()
          const pkg = offerings.current?.availablePackages.find(
            (p: any) => p.product.identifier === MONKMODE_PRODUCT_ID
          )
          if (!pkg) return { success: false, error: 'Product not found' }

          const { customerInfo } = await Purchases.purchasePackage(pkg)
          const active = customerInfo.entitlements.active['monkmode_pro']
          if (active) {
            set({ status: 'purchased', purchasedAt: active.latestPurchaseDate })
            return { success: true }
          }
          return { success: false, error: 'Purchase not verified' }
        } catch (e: any) {
          if (e?.userCancelled) return { success: false, error: 'cancelled' }
          return { success: false, error: e?.message ?? 'Purchase failed' }
        }
      },

      restore: async () => {
        if (PERSONAL_BUILD_UNLOCKED) {
          set({ status: 'purchased', purchasedAt: new Date().toISOString() })
          return { success: true, restored: true }
        }
        try {
          const Purchases = await importPurchases()
          if (!Purchases) return { success: true, restored: false }

          const customerInfo = await Purchases.restorePurchases()
          const active = customerInfo.entitlements.active['monkmode_pro']
          if (active) {
            set({ status: 'purchased', purchasedAt: active.latestPurchaseDate })
            return { success: true, restored: true }
          }
          return { success: true, restored: false }
        } catch {
          return { success: false, restored: false }
        }
      },

      incrementFreeSession: () =>
        set(s => ({ freeSessionsUsed: s.freeSessionsUsed + 1 })),

      hasPurchased: () => PERSONAL_BUILD_UNLOCKED || get().status === 'purchased',

      canStartSession: () => {
        if (PERSONAL_BUILD_UNLOCKED) return true
        const { status, freeSessionsUsed, FREE_SESSION_LIMIT } = get()
        if (status === 'purchased') return true
        return freeSessionsUsed < FREE_SESSION_LIMIT
      },

      canUseSchedules: () => PERSONAL_BUILD_UNLOCKED || get().status === 'purchased',
      canUsePublicProfile: () => PERSONAL_BUILD_UNLOCKED || get().status === 'purchased',
      canUseWebhooks: () => PERSONAL_BUILD_UNLOCKED || get().status === 'purchased',

      freeSessionsRemaining: () => {
        if (PERSONAL_BUILD_UNLOCKED) return Infinity
        const { status, freeSessionsUsed, FREE_SESSION_LIMIT } = get()
        if (status === 'purchased') return Infinity
        return Math.max(0, FREE_SESSION_LIMIT - freeSessionsUsed)
      },
    }),
    {
      name: 'monkmode-iap',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        status: state.status,
        purchasedAt: state.purchasedAt,
        freeSessionsUsed: state.freeSessionsUsed,
      }),
    }
  )
)

async function importPurchases(): Promise<any | null> {
  try {
    const mod = await import('react-native-purchases')
    return mod.default ?? mod
  } catch {
    return null
  }
}
