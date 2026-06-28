export type PlanId = 'free' | 'ble' | 'premium'

export type PlanFeature = {
  label: string
  included: boolean
}

export type SubscriptionPlan = {
  id: PlanId
  name: string
  price: number          // ₹ per month (0 for free)
  trialMonths: number    // 0 = no trial
  maxDevices: number
  features: PlanFeature[]
  tagline: string
  popular?: boolean
}

export const PLANS: Record<PlanId, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    trialMonths: 0,
    maxDevices: 0,
    tagline: 'Basic access to SPORS',
    features: [
      { label: 'Community device scanner', included: true },
      { label: 'Anonymous chat', included: true },
      { label: 'Alert notifications', included: true },
      { label: 'BLE broadcasting', included: false },
      { label: 'Family device sharing', included: false },
      { label: 'Parental controls', included: false },
      { label: 'PDF reports', included: false },
    ],
  },
  ble: {
    id: 'ble',
    name: 'BLE',
    price: 49,
    trialMonths: 3,
    maxDevices: 1,
    tagline: '1 device • BLE broadcast tracking',
    features: [
      { label: 'Community device scanner', included: true },
      { label: 'Anonymous chat', included: true },
      { label: 'Alert notifications', included: true },
      { label: 'BLE broadcasting (1 device)', included: true },
      { label: 'Family device sharing', included: false },
      { label: 'Parental controls', included: false },
      { label: 'PDF reports', included: false },
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 99,
    trialMonths: 0,
    maxDevices: 10,
    tagline: 'Full family protection',
    popular: true,
    features: [
      { label: 'Community device scanner', included: true },
      { label: 'Anonymous chat', included: true },
      { label: 'Alert notifications', included: true },
      { label: 'BLE broadcasting (family)', included: true },
      { label: 'Up to 10 devices', included: true },
      { label: 'Family & parental controls', included: true },
      { label: 'Child tracking', included: true },
      { label: 'PDF lost & found reports', included: true },
    ],
  },
} as const

export const PLAN_LIST: SubscriptionPlan[] = [PLANS.ble, PLANS.premium]

export const RAZORPAY_KEY_ID = 'rzp_test_Ywd9gWBWFV1zVA'
