import { useCallback, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Header } from '../components/ui/Header'
import { Toast } from '../components/ui/Toast'
import { Colors } from '../constants/colors'
import { PLAN_LIST, PLANS, PlanId, SubscriptionPlan } from '../constants/subscription'
import { FontFamily } from '../constants/typography'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { openCheckout } from '../services/razorpay.service'

/* ─── Feature row inside plan card ────────────────────────────────────────── */
function FeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <View style={featStyles.row}>
      <MaterialIcons
        name={included ? 'check-circle' : 'cancel'}
        size={17}
        color={included ? Colors.secondary : Colors.outline}
      />
      <Text
        style={[
          featStyles.label,
          !included && { color: Colors.outline, textDecorationLine: 'line-through' },
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

const featStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  label: {
    flex: 1,
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
})

/* ─── Plan Card ───────────────────────────────────────────────────────────── */
function PlanCard({
  plan,
  isCurrentPlan,
  isDowngrade,
  onSubscribe,
  processing,
}: {
  plan: SubscriptionPlan
  isCurrentPlan: boolean
  isDowngrade: boolean
  onSubscribe: (planId: PlanId) => void
  processing: boolean
}) {
  const isPremium = plan.popular

  return (
    <View
      style={[
        cardStyles.card,
        isPremium && cardStyles.premiumCard,
        isCurrentPlan && cardStyles.activeCard,
      ]}
    >
      {/* Popular badge */}
      {isPremium && (
        <LinearGradient
          colors={[Colors.secondary, '#0ad9a0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cardStyles.popularBadge}
        >
          <MaterialIcons name="star" size={12} color={Colors.onSecondary} />
          <Text style={cardStyles.popularText}>POPULAR</Text>
        </LinearGradient>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && (
        <View style={cardStyles.currentBadge}>
          <MaterialIcons name="check-circle" size={14} color={Colors.secondary} />
          <Text style={cardStyles.currentText}>CURRENT PLAN</Text>
        </View>
      )}

      {/* Plan name + tagline */}
      <Text style={cardStyles.planName}>{plan.name}</Text>
      <Text style={cardStyles.tagline}>{plan.tagline}</Text>

      {/* Price */}
      <View style={cardStyles.priceRow}>
        <Text style={cardStyles.rupee}>₹</Text>
        <Text style={cardStyles.priceValue}>{plan.price}</Text>
        <Text style={cardStyles.perMonth}>/month</Text>
      </View>

      {/* Trial badge */}
      {plan.trialMonths > 0 && (
        <View style={cardStyles.trialBadge}>
          <MaterialIcons name="card-giftcard" size={14} color={Colors.tertiary} />
          <Text style={cardStyles.trialText}>
            First {plan.trialMonths} months FREE
          </Text>
        </View>
      )}

      {/* Features */}
      <View style={cardStyles.featureList}>
        {plan.features.map((f) => (
          <FeatureRow key={f.label} label={f.label} included={f.included} />
        ))}
      </View>

      {/* CTA */}
      {isCurrentPlan ? (
        <View style={cardStyles.currentCta}>
          <MaterialIcons name="check" size={18} color={Colors.secondary} />
          <Text style={[cardStyles.ctaLabel, { color: Colors.secondary }]}>Active</Text>
        </View>
      ) : (
        <Pressable
          style={[cardStyles.ctaButton, processing && { opacity: 0.6 }]}
          disabled={processing}
          onPress={() => onSubscribe(plan.id)}
        >
          <LinearGradient
            colors={
              isPremium
                ? [Colors.secondary, '#0ad9a0']
                : [Colors.primary, Colors.inversePrimary]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={cardStyles.ctaGradient}
          >
            <Text style={cardStyles.ctaLabel}>
              {isDowngrade ? 'Switch Plan' : plan.trialMonths > 0 ? 'Start Free Trial' : 'Subscribe'}
            </Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  )
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 8,
  },
  premiumCard: {
    borderColor: 'rgba(70,241,187,0.35)',
    backgroundColor: 'rgba(70,241,187,0.04)',
  },
  activeCard: {
    borderColor: 'rgba(170,199,255,0.45)',
    backgroundColor: 'rgba(170,199,255,0.06)',
  },
  popularBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  popularText: {
    color: Colors.onSecondary,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  currentBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(70,241,187,0.12)',
  },
  currentText: {
    color: Colors.secondary,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  planName: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    marginTop: 4,
  },
  tagline: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 13,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginTop: 4,
  },
  rupee: {
    color: Colors.primary,
    fontFamily: FontFamily.headingBold,
    fontSize: 18,
    marginBottom: 2,
  },
  priceValue: {
    color: Colors.primary,
    fontFamily: FontFamily.headingBold,
    fontSize: 36,
    lineHeight: 40,
  },
  perMonth: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 14,
    marginBottom: 4,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,185,95,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  trialText: {
    color: Colors.tertiary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
  },
  featureList: {
    marginTop: 8,
    gap: 2,
  },
  ctaButton: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaGradient: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  ctaLabel: {
    color: Colors.onPrimary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  currentCta: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(70,241,187,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(70,241,187,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
})

/* ─── FAQ Item ────────────────────────────────────────────────────────────── */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Pressable style={faqStyles.container} onPress={() => setOpen(!open)}>
      <View style={faqStyles.header}>
        <Text style={faqStyles.question}>{question}</Text>
        <MaterialIcons
          name={open ? 'expand-less' : 'expand-more'}
          size={22}
          color={Colors.outline}
        />
      </View>
      {open && <Text style={faqStyles.answer}>{answer}</Text>}
    </Pressable>
  )
}

const faqStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 14,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  question: {
    flex: 1,
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
  },
  answer: {
    marginTop: 8,
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
  },
})

/* ─── Main Screen ─────────────────────────────────────────────────────────── */
export default function SubscriptionScreen() {
  const router = useRouter()
  const { profile, user } = useAuth()
  const sub = useSubscription()
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  const handleSubscribe = useCallback(
    async (planId: PlanId) => {
      if (processing) return

      const plan = PLANS[planId]

      // If it's a trial plan, skip payment
      if (plan.trialMonths > 0) {
        Alert.alert(
          'Start Free Trial',
          `Start your ${plan.trialMonths}-month free trial of the ${plan.name} plan?\n\nYou won't be charged until the trial ends.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Start Trial',
              onPress: async () => {
                await sub.subscribe(planId, 'trial_' + Date.now())
                setToast({
                  message: `🎉 ${plan.name} trial started! ${plan.trialMonths} months free.`,
                  type: 'success',
                })
              },
            },
          ]
        )
        return
      }

      // Paid plan — go through Razorpay checkout
      setProcessing(true)
      try {
        const result = await openCheckout(plan.price, plan.name, {
          name: profile?.full_name || 'SPORS User',
          email: user?.email || 'user@spors.app',
        })

        if (result.success && result.paymentId) {
          await sub.subscribe(planId, result.paymentId)
          setToast({
            message: `✅ Subscribed to ${plan.name}! Payment: ${result.paymentId}`,
            type: 'success',
          })
        } else {
          setToast({
            message: result.error || 'Payment was not completed',
            type: 'error',
          })
        }
      } catch (error) {
        setToast({
          message: error instanceof Error ? error.message : 'Payment failed',
          type: 'error',
        })
      } finally {
        setProcessing(false)
      }
    },
    [processing, profile?.full_name, sub, user?.email]
  )

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel? You will lose access to premium features.',
      [
        { text: 'Keep Plan', style: 'cancel' },
        {
          text: 'Cancel Plan',
          style: 'destructive',
          onPress: async () => {
            await sub.cancelSubscription()
            setToast({ message: 'Subscription cancelled', type: 'info' })
          },
        },
      ]
    )
  }, [sub])

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Subscription" onBackPress={() => router.back()} rightIcon="workspace-premium" />

      <Toast
        visible={!!toast}
        message={toast?.message ?? ''}
        type={toast?.type ?? 'info'}
        onHide={() => setToast(null)}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Current Plan Banner ── */}
        <LinearGradient
          colors={
            sub.isPaid
              ? ['rgba(70,241,187,0.12)', 'rgba(70,241,187,0.03)']
              : ['rgba(170,199,255,0.12)', 'rgba(170,199,255,0.03)']
          }
          style={styles.currentBanner}
        >
          <View style={styles.bannerTop}>
            <MaterialIcons
              name={sub.isPaid ? 'workspace-premium' : 'shield'}
              size={28}
              color={sub.isPaid ? Colors.secondary : Colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>
                {sub.isPaid ? `${sub.currentPlan.name} Plan` : 'Free Plan'}
              </Text>
              <Text style={styles.bannerSub}>
                {sub.isPaid
                  ? sub.isTrialActive
                    ? `Trial active • ${sub.trialDaysRemaining} days remaining`
                    : `₹${sub.currentPlan.price}/month • ${sub.currentPlan.maxDevices} device${sub.currentPlan.maxDevices > 1 ? 's' : ''}`
                  : 'Upgrade to unlock BLE tracking and more'}
              </Text>
            </View>
          </View>

          {sub.isPaid && (
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel Plan</Text>
            </Pressable>
          )}
        </LinearGradient>

        {/* ── Plan Cards ── */}
        <Text style={styles.sectionTitle}>Choose Your Plan</Text>

        {PLAN_LIST.map((plan) => {
          const isCurrent = sub.planId === plan.id
          const isDowngrade =
            sub.planId === 'premium' && plan.id === 'ble'

          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={isCurrent}
              isDowngrade={isDowngrade}
              onSubscribe={handleSubscribe}
              processing={processing}
            />
          )
        })}

        {/* ── FAQ ── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          Frequently Asked Questions
        </Text>
        <View style={styles.faqList}>
          <FaqItem
            question="What happens after the free trial?"
            answer="After the 3-month free trial on the BLE plan, you'll be charged ₹49/month. You can cancel anytime before the trial ends."
          />
          <FaqItem
            question="Can I switch between plans?"
            answer="Yes! You can upgrade from BLE to Premium at any time. Downgrading is also possible — your current billing cycle will be honoured."
          />
          <FaqItem
            question="What's included in family controls?"
            answer="Premium plan includes the ability to track up to 10 family devices, set parental controls for child devices, and generate PDF reports for lost & found incidents."
          />
          <FaqItem
            question="Is my payment secure?"
            answer="All payments are processed through Razorpay, India's leading payment gateway. We never store your card details."
          />
          <FaqItem
            question="How do I cancel?"
            answer="You can cancel your subscription anytime from this page. Tap 'Cancel Plan' at the top."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 120,
    gap: 14,
  },
  currentBanner: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(170,199,255,0.18)',
    gap: 12,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 17,
  },
  bannerSub: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 13,
    marginTop: 2,
  },
  cancelButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,78,78,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,78,78,0.25)',
  },
  cancelText: {
    color: Colors.error,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
  },
  sectionTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 18,
    marginTop: 8,
  },
  faqList: {
    gap: 8,
  },
})
