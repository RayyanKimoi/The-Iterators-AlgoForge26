import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'

import { Colors } from '../../constants/colors'
import { FontFamily } from '../../constants/typography'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

// Map imports removed

type Region = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

type BeaconLog = {
  id: string
  latitude: number
  longitude: number
  accuracy_meters: number | null
  rssi: number | null
  reported_at: string
}

type DeviceBrief = {
  id: string
  make: string
  model: string
}

const MUMBAI_CENTER = {
  latitude: 18.9388,
  longitude: 72.8354,
}

const customMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#12141a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7c838f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#12141a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d3138' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f223d' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1a1f2a' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

function relativeTime(dateIso: string) {
  const ms = Date.now() - new Date(dateIso).getTime()
  const mins = Math.max(1, Math.floor(ms / 60000))
  if (mins < 60) {
    return `${mins}m ago`
  }
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  return `${Math.floor(hours / 24)}d ago`
}

import { Image } from 'react-native'

const LOCATIONIQ_API_KEY = process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY ?? ''

function StaticMapView({ latitude, longitude, zoom = 15, children }: { latitude: number; longitude: number; zoom?: number, children?: React.ReactNode }) {
  if (!LOCATIONIQ_API_KEY) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1d24', alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#9ca3af', fontSize: 12 }}>Map key missing (EXPO_PUBLIC_LOCATIONIQ_API_KEY)</Text>
      </View>
    )
  }

  const src = `https://maps.locationiq.com/v3/staticmap?key=${LOCATIONIQ_API_KEY}&center=${latitude},${longitude}&zoom=${zoom}&size=800x800&format=png&maptype=streets`

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image 
        source={{ uri: src }} 
        style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1d24' }]} 
        resizeMode="cover" 
      />
      {/* Dark overlay to match app theme */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18, 20, 26, 0.4)' }]} />
      {/* Center content (e.g. marker) */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        {children}
      </View>
    </View>
  )
}

export default function TrackerScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>()

  const mapRef = useRef<any>(null)
  const pulse = useRef(new Animated.Value(0)).current

  const [loading, setLoading] = useState(true)
  const [device, setDevice] = useState<DeviceBrief | null>(null)
  const [logs, setLogs] = useState<BeaconLog[]>([])

  const mockLog: BeaconLog = {
    id: 'mock-test-1',
    latitude: MUMBAI_CENTER.latitude,
    longitude: MUMBAI_CENTER.longitude,
    accuracy_meters: 15,
    rssi: -45,
    reported_at: new Date().toISOString(),
  }

  const mergedLogs = logs.length > 0 ? logs : [mockLog]
  const latestLog = mergedLogs[0] ?? null

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
      ])
    )

    anim.start()
    return () => anim.stop()
  }, [pulse])

  const fetchTrackerData = useCallback(async () => {
    if (!user?.id || !deviceId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const [{ data: deviceData }, { data: logsData }] = await Promise.all([
      supabase
        .from('devices')
        .select('id, make, model')
        .eq('id', deviceId)
        .eq('owner_id', user.id)
        .maybeSingle(),
      supabase
        .from('beacon_logs')
        .select('id, latitude, longitude, accuracy_meters, rssi, reported_at')
        .eq('device_id', deviceId)
        .order('reported_at', { ascending: false })
        .limit(5),
    ])

    setDevice((deviceData as DeviceBrief | null) ?? null)
    setLogs((logsData as BeaconLog[] | null) ?? [])
    setLoading(false)
  }, [deviceId, user?.id])

  useEffect(() => {
    void fetchTrackerData()
  }, [fetchTrackerData])

  useEffect(() => {
    if (!deviceId) {
      return
    }

    const channel = supabase
      .channel(`tracker-${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'beacon_logs',
          filter: `device_id=eq.${deviceId}`,
        },
        (payload) => {
          const next = payload.new as BeaconLog
          setLogs((current) => [next, ...current].slice(0, 5))

          if (Platform.OS !== 'web' && mapRef.current?.animateToRegion) {
            mapRef.current.animateToRegion(
              {
                latitude: next.latitude,
                longitude: next.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              },
              900
            )
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [deviceId])

  const initialRegion = useMemo<Region>(() => {
    if (latestLog) {
      return {
        latitude: latestLog.latitude,
        longitude: latestLog.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
    }

    return {
      latitude: MUMBAI_CENTER.latitude,
      longitude: MUMBAI_CENTER.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    }
  }, [latestLog])

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      </SafeAreaView>
    )
  }

  // Resolved marker coordinates — real data or default Mumbai test location
  const markerLat = latestLog?.latitude ?? MUMBAI_CENTER.latitude
  const markerLng = latestLog?.longitude ?? MUMBAI_CENTER.longitude

  /* ---------- Render the map area (platform-aware) ---------- */
  const renderMap = () => {
    return (
      <StaticMapView latitude={markerLat} longitude={markerLng} zoom={16}>
        <View style={styles.markerWrap}>
          <Animated.View
            style={[
              styles.markerPulse,
              {
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.46, 0] }),
                transform: [
                  {
                    scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.42] }),
                  },
                ],
              },
            ]}
          />
          <View style={styles.markerCore}>
            <MaterialIcons name="shield" size={16} color={Colors.primary} />
          </View>
        </View>
      </StaticMapView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {renderMap()}

      <View style={styles.topBarWrap}>
        <BlurView intensity={34} tint="dark" style={styles.topBar}>
          <Pressable style={styles.topBarBack} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={21} color={Colors.onSurface} />
          </Pressable>

          <View style={styles.topBarTitleWrap}>
            <Text style={styles.topBarTitle}>{device ? `${device.make} ${device.model}` : 'Live Tracker'}</Text>
          </View>

          <View style={styles.liveBadge}>
            <Animated.View
              style={[
                styles.liveDot,
                {
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }),
                },
              ]}
            />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </BlurView>
      </View>

      <View style={styles.bottomSheet}>
        {!latestLog ? (
          <View style={styles.emptyStateWrap}>
            <MaterialIcons name="location-off" size={24} color={Colors.outline} />
            <Text style={styles.emptyStateText}>
              No location data yet. BLE scanning will update this map when your device is detected nearby.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.metaRow}>
              <View>
                <Text style={styles.metaLabel}>Last Updated</Text>
                <Text style={styles.metaValue}>{new Date(latestLog.reported_at).toLocaleString()}</Text>
              </View>
              <View>
                <Text style={styles.metaLabel}>Source</Text>
                <Text style={styles.metaValue}>{latestLog.rssi ? 'BLE' : 'GPS'}</Text>
              </View>
              <View>
                <Text style={styles.metaLabel}>Accuracy</Text>
                <Text style={styles.metaValue}>{`${Math.round(latestLog.accuracy_meters ?? 0)}m`}</Text>
              </View>
            </View>

            <Text style={styles.coordinates}>{`${latestLog.latitude.toFixed(5)}, ${latestLog.longitude.toFixed(5)}`}</Text>

            <FlatList
              data={mergedLogs}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.timelineList}
              renderItem={({ item }) => (
                <View style={styles.timelineRow}>
                  <Text style={styles.timelineTime}>{relativeTime(item.reported_at)}</Text>
                  <Text style={styles.timelineCoords}>{`${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}</Text>
                </View>
              )}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loader: {
    marginTop: 130,
  },
  topBarWrap: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  topBar: {
    minHeight: 56,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(17,19,24,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 10,
  },
  topBarBack: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleWrap: {
    flex: 1,
  },
  topBarTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 16,
  },
  liveBadge: {
    minHeight: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(70,241,187,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(70,241,187,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.secondary,
  },
  liveText: {
    color: Colors.secondary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  markerWrap: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPulse: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(61,142,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(61,142,255,0.5)',
  },
  markerCore: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1f2e45',
    borderWidth: 1,
    borderColor: 'rgba(61,142,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
    backgroundColor: Colors.surfaceContainerLow,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 9,
  },
  emptyStateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
  emptyStateText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: Colors.outline,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 11,
  },
  metaValue: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    marginTop: 2,
    maxWidth: 110,
  },
  coordinates: {
    color: Colors.primary,
    fontFamily: FontFamily.monoMedium,
    fontSize: 13,
  },
  timelineList: {
    gap: 8,
    paddingTop: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHigh,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  timelineTime: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 11,
  },
  timelineCoords: {
    color: Colors.onSurface,
    fontFamily: FontFamily.monoMedium,
    fontSize: 11,
  },
})
