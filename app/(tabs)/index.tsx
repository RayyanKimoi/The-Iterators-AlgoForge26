import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { AadhaarVerifyModal } from '../../components/spors/AadhaarVerifyModal'
import { DeviceCard } from '../../components/spors/DeviceCard'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import { Colors } from '../../constants/colors'
import { FontFamily } from '../../constants/typography'
import { useAuth } from '../../hooks/useAuth'
import { useDevices } from '../../hooks/useDevices'
import { supabase } from '../../lib/supabase'

type NotificationItem = {
  id: string
  title: string
  body: string
  type: string
  is_read: boolean
  created_at: string
}

const quickActions = [
  { key: 'lost', icon: 'report-problem', label: 'Report Lost', tint: Colors.error },
  {
    key: 'scan',
    icon: 'bluetooth-searching',
    label: 'Scan for Devices',
    tint: Colors.inversePrimary,
    route: '/(tabs)/scanner',
  },
  {
    key: 'verify',
    icon: 'verified-user',
    label: 'Verify a Phone',
    tint: Colors.secondary,
    route: '/verify',
  },
  {
    key: 'alerts',
    icon: 'notifications',
    label: 'My Alerts',
    tint: Colors.tertiary,
    route: '/(tabs)/alerts',
  },
] as const

function getGreetingPrefix() {
  const hour = new Date().getHours()
  if (hour < 12) {
    return 'Good morning'
  }
  if (hour < 18) {
    return 'Good afternoon'
  }
  return 'Good evening'
}

function getRelativeTime(date: string) {
  const diffMs = Date.now() - new Date(date).getTime()
  const minutes = Math.max(1, Math.floor(diffMs / 60000))

  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h`
  }

  const days = Math.floor(hours / 24)
  return `${days}d`
}

export default function HomeScreen() {
  const router = useRouter()
  const { profile, user } = useAuth()
  const { devices, loading: loadingDevices, error: devicesError, refetch } = useDevices()

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [aadhaarModalVisible, setAadhaarModalVisible] = useState(false)
  const [showReportPicker, setShowReportPicker] = useState(false)
  const [displayCounts, setDisplayCounts] = useState({ total: 0, alerts: 0, safe: 0 })

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([])
      return
    }

    setLoadingNotifications(true)
    const { data, error: fetchError } = await supabase
      .from('notifications')
      .select('id, title, body, type, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (fetchError) {
      console.log('[SPORS-HOME] Notification fetch error:', fetchError.message)
    }

    setNotifications((data as NotificationItem[]) ?? [])
    setLoadingNotifications(false)
  }, [user?.id])

  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  const totalDevices = devices.length
  const safeDevices = useMemo(
    () => devices.filter((item) => item.status === 'registered' || item.status === 'recovered').length,
    [devices]
  )
  const activeAlerts = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  )

  useEffect(() => {
    const target = {
      total: totalDevices,
      alerts: activeAlerts,
      safe: safeDevices,
    }

    const durationMs = 520
    const stepMs = 24
    const steps = Math.max(1, Math.floor(durationMs / stepMs))
    let step = 0

    const timer = setInterval(() => {
      step += 1
      const progress = Math.min(1, step / steps)

      setDisplayCounts({
        total: Math.round(target.total * progress),
        alerts: Math.round(target.alerts * progress),
        safe: Math.round(target.safe * progress),
      })

      if (progress >= 1) {
        clearInterval(timer)
      }
    }, stepMs)

    return () => clearInterval(timer)
  }, [activeAlerts, safeDevices, totalDevices])

  const initials = useMemo(() => {
    const name = profile?.full_name?.trim() || user?.email || 'SPORS'
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  }, [profile?.full_name, user?.email])

  const handleQuickAction = (key: (typeof quickActions)[number]['key']) => {
    if (key === 'lost') {
      if (!devices.length) {
        router.push('/device/add')
        return
      }

      if (devices.length === 1) {
        router.push({ pathname: '/device/[id]', params: { id: devices[0].id } })
        return
      }

      setShowReportPicker(true)
      return
    }

    const action = quickActions.find((item) => item.key === key)
    if (action && 'route' in action) {
      router.push(action.route)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <MaterialIcons name="shield" size={22} color={Colors.accent} />
          <Text style={styles.brandText}>SPORS</Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable style={styles.headerIcon} onPress={() => router.push('/(tabs)/alerts')}>
            <MaterialIcons name="notifications-none" size={22} color={Colors.onSurface} />
          </Pressable>

          <Pressable style={styles.avatarCircle} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.greeting}>{`${getGreetingPrefix()}, ${profile?.full_name || 'User'}`}</Text>
          <Text style={styles.greetingSub}>Your secure network is active and monitoring.</Text>
        </View>

        {!profile?.aadhaar_verified ? (
          <Pressable style={styles.aadhaarBanner} onPress={() => setAadhaarModalVisible(true)}>
            <View style={[styles.bannerIconWrap, { backgroundColor: `${Colors.tertiary}33` }]}>
              <MaterialIcons name="shield" size={20} color={Colors.tertiary} />
            </View>

            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerTitle}>Action Required</Text>
              <Text style={styles.bannerSub}>Complete Aadhaar verification</Text>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{displayCounts.total}</Text>
            <Text style={styles.statLabel}>Total Devices</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{displayCounts.alerts}</Text>
            <Text style={styles.statLabel}>Active Alerts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{displayCounts.safe}</Text>
            <Text style={styles.statLabel}>Safe Devices</Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>My Devices</Text>
          <Pressable onPress={() => router.push('/device/add')}>
            <Text style={styles.sectionLink}>Add New</Text>
          </Pressable>
        </View>

        {loadingDevices ? (
          <View style={styles.deviceSkeletonRow}>
            <Skeleton width={200} height={170} borderRadius={24} />
            <Skeleton width={200} height={170} borderRadius={24} />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.devicesScroll}>
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                id={device.id}
                make={device.make}
                model={device.model}
                imei={device.imei_primary}
                status={device.status}
                onPress={(deviceId) =>
                  router.push({ pathname: '/device/[id]', params: { id: deviceId } })
                }
              />
            ))}
            {!devices.length ? (
              <View style={styles.emptyDeviceCard}>
                <Text style={styles.emptyDeviceText}>No devices registered yet.</Text>
              </View>
            ) : null}
          </ScrollView>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.key}
              style={styles.quickCard}
              onPress={() => handleQuickAction(action.key)}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: `${action.tint}26` }]}>
                <MaterialIcons name={action.icon} size={20} color={action.tint} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityWrap}>
          {loadingNotifications ? (
            <>
              <Skeleton height={68} borderRadius={12} />
              <Skeleton height={68} borderRadius={12} />
            </>
          ) : null}
          {!loadingNotifications && !notifications.length ? (
            <View style={styles.activityCard}>
              <Text style={styles.activityTitle}>No recent notifications</Text>
            </View>
          ) : null}

          {notifications.map((item) => (
            <View style={styles.activityCard} key={item.id}>
              <View style={styles.activityIconWrap}>
                <MaterialIcons
                  name={item.type.includes('lost') ? 'warning' : 'shield'}
                  color={item.type.includes('lost') ? Colors.error : Colors.inversePrimary}
                  size={18}
                />
              </View>
              <View style={styles.activityTextWrap}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityBody}>{item.body}</Text>
              </View>
              <Text style={styles.activityTime}>{getRelativeTime(item.created_at)}</Text>
            </View>
          ))}
        </View>

        {devicesError ? <ErrorState message={devicesError} onRetry={() => void refetch()} /> : null}
        <Pressable onPress={() => { void refetch(); void fetchNotifications() }}>
          <Text style={styles.refreshLink}>Refresh Data</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showReportPicker} transparent animationType="slide" onRequestClose={() => setShowReportPicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Device To Report</Text>
            <Text style={styles.sheetSubtitle}>Choose the device you want to mark as lost.</Text>

            <View style={styles.sheetList}>
              {devices.map((device) => (
                <Pressable
                  key={device.id}
                  style={styles.sheetRow}
                  onPress={() => {
                    setShowReportPicker(false)
                    router.push({ pathname: '/device/[id]', params: { id: device.id } })
                  }}
                >
                  <View>
                    <Text style={styles.sheetRowTitle}>{`${device.make} ${device.model}`}</Text>
                    <Text style={styles.sheetRowSub}>{`IMEI •••• ${device.imei_primary.slice(-4)}`}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={Colors.outline} />
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => setShowReportPicker(false)}>
              <Text style={styles.cancelActionText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <AadhaarVerifyModal visible={aadhaarModalVisible} onClose={() => setAadhaarModalVisible(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 64,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    color: Colors.accent,
    fontFamily: FontFamily.headingBold,
    fontSize: 18,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  avatarText: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 130,
    gap: 18,
  },
  greeting: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingBold,
    fontSize: 24,
  },
  greetingSub: {
    marginTop: 6,
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 14,
  },
  aadhaarBanner: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    color: Colors.tertiary,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 15,
  },
  bannerSub: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: Colors.primary,
    fontFamily: FontFamily.headingBold,
    fontSize: 28,
  },
  statLabel: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 11,
    textAlign: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 22,
  },
  sectionLink: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
  },
  devicesScroll: {
    gap: 12,
    paddingRight: 8,
  },
  deviceSkeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyDeviceCard: {
    width: 200,
    borderRadius: 24,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    justifyContent: 'center',
  },
  emptyDeviceText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 13,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickCard: {
    width: '48%',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  quickIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
  },
  activityWrap: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  activityIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  activityTextWrap: {
    flex: 1,
  },
  activityTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 13,
  },
  activityBody: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 12,
    marginTop: 2,
  },
  activityTime: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.monoMedium,
    fontSize: 11,
  },
  refreshLink: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
    gap: 10,
  },
  sheetHandle: {
    width: 50,
    height: 5,
    borderRadius: 5,
    alignSelf: 'center',
    backgroundColor: Colors.outlineVariant,
  },
  sheetTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 20,
  },
  sheetSubtitle: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 13,
  },
  sheetList: {
    gap: 8,
  },
  sheetRow: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#282a2f',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetRowTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
  },
  sheetRowSub: {
    marginTop: 2,
    color: Colors.outline,
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
  },
  cancelActionText: {
    marginTop: 2,
    textAlign: 'center',
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
  },
})