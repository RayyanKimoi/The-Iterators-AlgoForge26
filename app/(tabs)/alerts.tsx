import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Header } from '../../components/ui/Header'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import { Toast } from '../../components/ui/Toast'
import { Colors } from '../../constants/colors'
import { FontFamily } from '../../constants/typography'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

type NotificationItem = {
  id: string
  title: string
  body: string
  type: string
  reference_id: string | null
  is_read: boolean
  created_at: string
}

function getRelativeTime(date: string) {
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.max(1, Math.floor(ms / 60000))
  if (mins < 60) {
    return `${mins}m`
  }
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    return `${hours}h`
  }
  return `${Math.floor(hours / 24)}d`
}

function getVisualsByType(type: string) {
  const lowered = type.toLowerCase()
  if (lowered.includes('message') || lowered.includes('chat')) {
    return {
      icon: 'chat-bubble',
      tint: Colors.secondary,
      bg: 'rgba(70,241,187,0.16)',
    } as const
  }

  if (lowered.includes('case') || lowered.includes('legal')) {
    return {
      icon: 'gavel',
      tint: Colors.tertiary,
      bg: 'rgba(255,185,95,0.16)',
    } as const
  }

  return {
    icon: 'shield',
    tint: Colors.primary,
    bg: 'rgba(170,199,255,0.16)',
  } as const
}

// Swipeable notification card component
function SwipeableNotificationCard({
  item,
  onPress,
  onDismiss,
}: {
  item: NotificationItem
  onPress: () => void
  onDismiss: (id: string) => void
}) {
  const translateX = useRef(new Animated.Value(0)).current
  const itemHeight = useRef(new Animated.Value(1)).current
  const panStartX = useRef(0)
  const currentTranslateX = useRef(0)

  const visuals = getVisualsByType(item.type)

  const handleTouchStart = useCallback(
    (e: { nativeEvent: { pageX: number } }) => {
      panStartX.current = e.nativeEvent.pageX
    },
    []
  )

  const handleTouchMove = useCallback(
    (e: { nativeEvent: { pageX: number } }) => {
      const dx = e.nativeEvent.pageX - panStartX.current
      // Only allow swiping left
      const clampedDx = Math.min(0, dx)
      currentTranslateX.current = clampedDx
      translateX.setValue(clampedDx)
    },
    [translateX]
  )

  const handleTouchEnd = useCallback(() => {
    if (currentTranslateX.current < -120) {
      // Swipe far enough → dismiss
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -500,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(itemHeight, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
          delay: 150,
        }),
      ]).start(() => {
        onDismiss(item.id)
      })
    } else {
      // Snap back
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }).start()
      currentTranslateX.current = 0
    }
  }, [translateX, itemHeight, item.id, onDismiss])

  const opacity = translateX.interpolate({
    inputRange: [-200, 0],
    outputRange: [0.3, 1],
    extrapolate: 'clamp',
  })

  return (
    <Animated.View
      style={[
        styles.swipeContainer,
        {
          maxHeight: itemHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 120],
          }),
          opacity: itemHeight,
          marginBottom: itemHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 12],
          }),
        },
      ]}
    >
      {/* Red delete background */}
      <View style={styles.deleteBackground}>
        <MaterialIcons name="delete-sweep" size={22} color="#fff" />
        <Text style={styles.deleteText}>Dismiss</Text>
      </View>

      {/* Swipeable foreground */}
      <Animated.View
        style={[{ transform: [{ translateX }], opacity }]}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Pressable
          style={[styles.notificationCard, !item.is_read && styles.notificationCardUnread]}
          onPress={onPress}
        >
          <View style={[styles.iconWrap, { backgroundColor: visuals.bg }]}>
            <MaterialIcons name={visuals.icon} size={18} color={visuals.tint} />
          </View>

          <View style={styles.textWrap}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body} numberOfLines={2}>
              {item.body}
            </Text>
          </View>

          <Text style={styles.time}>{getRelativeTime(item.created_at)}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  )
}

export default function AlertsScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState('')

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, type, reference_id, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!data) {
      setNotifications([])
      setError('Unable to fetch alerts right now.')
      setLoading(false)
      return
    }

    setNotifications((data as NotificationItem[]) ?? [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  )

  const markAllAsRead = useCallback(async () => {
    if (!user?.id || !unreadCount) {
      return
    }

    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
    setToastMessage('All alerts marked as read')
  }, [unreadCount, user?.id])

  const dismissNotification = useCallback(
    async (notificationId: string) => {
      // Remove from local state immediately
      setNotifications((current) => current.filter((item) => item.id !== notificationId))

      // Mark as read in database
      if (user?.id) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
          .eq('user_id', user.id)
      }
    },
    [user?.id]
  )

  const openNotification = useCallback(
    async (item: NotificationItem) => {
      if (!item.is_read) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', item.id)
          .eq('user_id', user?.id ?? '')

        setNotifications((current) =>
          current.map((notification) =>
            notification.id === item.id ? { ...notification, is_read: true } : notification
          )
        )
      }

      const lowered = item.type.toLowerCase()
      if (item.reference_id && (lowered.includes('beacon') || lowered.includes('lost'))) {
        router.push({ pathname: '/tracker/[deviceId]', params: { deviceId: item.reference_id } })
        return
      }

      if (item.reference_id && lowered.includes('device')) {
        router.push({ pathname: '/device/[id]', params: { id: item.reference_id } })
        return
      }

      if (lowered.includes('message') || lowered.includes('chat')) {
        if (item.reference_id) {
          router.push({ pathname: '/chat/[roomId]', params: { roomId: item.reference_id } })
        } else {
          router.push('/(tabs)/chat')
        }
        return
      }

      router.push('/(tabs)/devices')
    },
    [router, user?.id]
  )

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Notifications" rightIcon="notifications-none" />

      <Toast
        visible={!!toastMessage}
        message={toastMessage}
        type="info"
        onHide={() => setToastMessage('')}
      />

      <View style={styles.topActionRow}>
        <Pressable onPress={() => void markAllAsRead()} disabled={!unreadCount}>
          <Text style={[styles.markAllText, !unreadCount && styles.markAllDisabled]}>Mark all as read</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.skeletonWrap}>
            <Skeleton height={60} borderRadius={14} />
            <Skeleton height={60} borderRadius={14} />
            <Skeleton height={60} borderRadius={14} />
          </View>
        ) : null}

        {!loading && error ? <ErrorState message={error} onRetry={() => void fetchNotifications()} /> : null}

        {!loading && !error && !notifications.length ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="shield" size={26} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No alerts. Your devices are safe.</Text>
            <Text style={styles.emptyHint}>Swipe left on alerts to dismiss them</Text>
          </View>
        ) : null}

        {!error &&
          notifications.map((item) => (
            <SwipeableNotificationCard
              key={item.id}
              item={item}
              onPress={() => void openNotification(item)}
              onDismiss={(id) => void dismissNotification(id)}
            />
          ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topActionRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingTop: 2,
  },
  markAllText: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
  },
  markAllDisabled: {
    opacity: 0.45,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 110,
  },
  skeletonWrap: {
    gap: 10,
  },
  emptyState: {
    marginTop: 34,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(170,199,255,0.12)',
  },
  emptyTitle: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 14,
  },
  emptyHint: {
    color: Colors.outline,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 12,
  },
  swipeContainer: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#c62828',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 24,
    gap: 6,
  },
  deleteText: {
    color: '#fff',
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
  },
  notificationCard: {
    borderRadius: 16,
    backgroundColor: '#282a2f',
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationCardUnread: {
    backgroundColor: '#33353a',
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 14,
  },
  body: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  time: {
    color: Colors.outline,
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
  },
})