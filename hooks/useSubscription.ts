import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { PLANS, PlanId } from '../constants/subscription'

const STORAGE_KEY = '@spors/subscription'

export type SubscriptionState = {
  planId: PlanId
  subscribedAt: string | null   // ISO date
  trialEndsAt: string | null    // ISO date (BLE only)
  lastPaymentId: string | null  // Razorpay payment id
}

const DEFAULT_STATE: SubscriptionState = {
  planId: 'free',
  subscribedAt: null,
  trialEndsAt: null,
  lastPaymentId: null,
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>(DEFAULT_STATE)
  const [loading, setLoading] = useState(true)

  // Load from AsyncStorage on mount
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (raw) {
          setState(JSON.parse(raw) as SubscriptionState)
        }
      } catch (error) {
        console.warn('[SPORS-SUB] Failed to load subscription state:', error)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const persist = useCallback(async (next: SubscriptionState) => {
    setState(next)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const subscribe = useCallback(
    async (planId: PlanId, paymentId?: string) => {
      const plan = PLANS[planId]
      const now = new Date()
      let trialEndsAt: string | null = null

      if (plan.trialMonths > 0) {
        const trialEnd = new Date(now)
        trialEnd.setMonth(trialEnd.getMonth() + plan.trialMonths)
        trialEndsAt = trialEnd.toISOString()
      }

      const next: SubscriptionState = {
        planId,
        subscribedAt: now.toISOString(),
        trialEndsAt,
        lastPaymentId: paymentId ?? null,
      }

      await persist(next)
    },
    [persist]
  )

  const cancelSubscription = useCallback(async () => {
    await persist(DEFAULT_STATE)
  }, [persist])

  // Derived state
  const currentPlan = PLANS[state.planId]
  const isTrialActive =
    state.trialEndsAt !== null && new Date(state.trialEndsAt) > new Date()

  const trialDaysRemaining = isTrialActive
    ? Math.max(
        0,
        Math.ceil(
          (new Date(state.trialEndsAt!).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0

  const isPaid = state.planId !== 'free'

  return {
    ...state,
    loading,
    currentPlan,
    isTrialActive,
    trialDaysRemaining,
    isPaid,
    subscribe,
    cancelSubscription,
  }
}
