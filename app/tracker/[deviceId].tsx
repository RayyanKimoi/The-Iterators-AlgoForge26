import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
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
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE, MapType } from 'react-native-maps'

import { Colors } from '../../constants/colors'
import { FontFamily } from '../../constants/typography'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

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

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

const MAP_TYPES: { type: MapType; icon: string; label: string }[] = [
  { type: 'standard', icon: 'map', label: 'Map' },
  { type: 'satellite', icon: 'satellite', label: 'Satellite' },
  { type: 'terrain', icon: 'terrain', label: 'Terrain' },
  { type: 'hybrid', icon: 'layers', label: 'Hybrid' },
]

export default function TrackerScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>()

  const mapRef = useRef<any>(null)
  const pulse = useRef(new Animated.Value(0)).current

  const [loading, setLoading] = useState(true)
  const [device, setDevice] = useState<DeviceBrief | null>(null)
  const [logs, setLogs] = useState<BeaconLog[]>([])
  const [mapType, setMapType] = useState<MapType>('standard')
  const [showMapTypeMenu, setShowMapTypeMenu] = useState(false)
  const [is3D, setIs3D] = useState(false)

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

  /* ---------- Polyline coordinates (oldest → newest) ---------- */
  const trailCoords = useMemo(
    () =>
      [...mergedLogs]
        .reverse()
        .map((l) => ({ latitude: l.latitude, longitude: l.longitude })),
    [mergedLogs]
  )

  /* ---------- Re-center handler ---------- */
  const recenter = () => {
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion(
        {
          latitude: markerLat,
          longitude: markerLng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        700
      )
    }
  }

  /* ---------- Cycle map type ---------- */
  const cycleMapType = () => {
    setShowMapTypeMenu((v) => !v)
  }

  /* ---------- Toggle 3D view ---------- */
  const toggle3D = () => {
    const next = !is3D
    setIs3D(next)
    if (mapRef.current?.animateCamera) {
      mapRef.current.animateCamera(
        {
          center: { latitude: markerLat, longitude: markerLng },
          pitch: next ? 60 : 0,
          heading: 0,
          zoom: next ? 17 : 15,
        },
        { duration: 800 }
      )
    }
  }

  /* ---------- Street View thumbnail URL ---------- */
  const streetViewUrl = GOOGLE_MAPS_API_KEY
    ? `https://maps.googleapis.com/maps/api/streetview?size=400x200&location=${markerLat},${markerLng}&fov=90&heading=235&pitch=10&key=${GOOGLE_MAPS_API_KEY}`
    : null

  /* ---------- Render the map area (platform-aware) ---------- */
  const renderMap = () => {
    return (
      <View style={StyleSheet.absoluteFill}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          customMapStyle={mapType === 'standard' ? customMapStyle : []}
          mapType={mapType}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsBuildings={true}
          showsIndoors={true}
          toolbarEnabled={false}
        >
          {/* Accuracy circle overlay */}
          {latestLog?.accuracy_meters != null && latestLog.accuracy_meters > 0 && (
            <Circle
              center={{ latitude: markerLat, longitude: markerLng }}
              radius={latestLog.accuracy_meters}
              fillColor="rgba(61,142,255,0.08)"
              strokeColor="rgba(61,142,255,0.3)"
              strokeWidth={1}
            />
          )}

          {/* Movement trail */}
          {trailCoords.length > 1 && (
            <Polyline
              coordinates={trailCoords}
              strokeColor="rgba(61,142,255,0.6)"
              strokeWidth={3}
            />
          )}

          {/* Device marker */}
          <Marker
            coordinate={{ latitude: markerLat, longitude: markerLng }}
            title={device ? `${device.make} ${device.model}` : 'Device'}
            description={latestLog ? `Last seen ${relativeTime(latestLog.reported_at)}` : 'Mock location'}
          >
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
          </Marker>
        </MapView>

        {/* FAB controls column */}
        <View style={styles.fabColumn}>
          <Pressable style={styles.fab} onPress={cycleMapType}>
            <MaterialIcons name="layers" size={22} color={Colors.onSurface} />
          </Pressable>
          <Pressable style={[styles.fab, is3D && styles.fabActive]} onPress={toggle3D}>
            <MaterialIcons name="3d-rotation" size={22} color={is3D ? Colors.primary : Colors.onSurface} />
          </Pressable>
          <Pressable style={styles.fab} onPress={recenter}>
            <MaterialIcons name="my-location" size={22} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Map type menu */}
        {showMapTypeMenu && (
          <View style={styles.mapTypeMenu}>
            {MAP_TYPES.map((m) => (
              <Pressable
                key={m.type}
                style={[
                  styles.mapTypeOption,
                  mapType === m.type && styles.mapTypeOptionActive,
                ]}
                onPress={() => {
                  setMapType(m.type)
                  setShowMapTypeMenu(false)
                }}
              >
                <MaterialIcons
                  name={m.icon as any}
                  size={18}
                  color={mapType === m.type ? Colors.primary : Colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.mapTypeLabel,
                    mapType === m.type && { color: Colors.primary },
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
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
            {/* Street View preview */}
            {streetViewUrl && (
              <Pressable style={styles.streetViewWrap} onPress={() => toggle3D()}>
                <Image
                  source={{ uri: streetViewUrl }}
                  style={styles.streetViewImage}
                  resizeMode="cover"
                />
                <View style={styles.streetViewOverlay}>
                  <View style={styles.streetViewBadge}>
                    <MaterialIcons name="streetview" size={14} color={Colors.onSurface} />
                    <Text style={styles.streetViewBadgeText}>Street View</Text>
                  </View>
                </View>
              </Pressable>
            )}

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
    maxHeight: 310,
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
  fabColumn: {
    position: 'absolute',
    right: 14,
    top: 90,
    gap: 10,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(17,19,24,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTypeMenu: {
    position: 'absolute',
    right: 66,
    top: 90,
    backgroundColor: 'rgba(17,19,24,0.92)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 2,
  },
  mapTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  mapTypeOptionActive: {
    backgroundColor: 'rgba(61,142,255,0.15)',
  },
  mapTypeLabel: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
  },
  fabActive: {
    backgroundColor: 'rgba(61,142,255,0.2)',
    borderColor: 'rgba(61,142,255,0.5)',
  },
  streetViewWrap: {
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  streetViewImage: {
    width: '100%',
    height: '100%',
  },
  streetViewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 6,
  },
  streetViewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(17,19,24,0.75)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  streetViewBadgeText: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.3,
  },
})
