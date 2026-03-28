import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { Image } from 'react-native'

const LOCATIONIQ_API_KEY = process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY ?? 'pk.88d6db2b14bb71ca4322321dbb988802'

function StaticMapView({ latitude, longitude, zoom = 14 }: { latitude: number; longitude: number; zoom?: number }) {
  const src = `https://maps.locationiq.com/v3/staticmap?key=${LOCATIONIQ_API_KEY}&center=${latitude},${longitude}&zoom=${zoom}&size=800x400&format=png&maptype=streets`
  return (
    <View style={StyleSheet.absoluteFill}>
       <Image 
        source={{ uri: src }} 
        style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1d24' }]} 
        resizeMode="cover" 
      />
      {/* Dark overlay to match app theme */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18, 20, 26, 0.4)' }]} />
      {/* Center Pin */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <MaterialIcons name="place" size={32} color="#e53935" />
      </View>
    </View>
  )
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

import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { GradientButton } from '../../components/ui/GradientButton'
import { Colors } from '../../constants/colors'
import { FontFamily } from '../../constants/typography'
import { markFound, reportLost, useDevice } from '../../hooks/useDevices'
import { supabase } from '../../lib/supabase'
import { bleService } from '../../services/ble.service'

type LostForm = {
  incident_description: string
  last_known_address: string
  police_complaint_number: string
  reward_amount: string
}

const FALLBACK_REGION = {
  latitude: 18.9388,
  longitude: 72.8354,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
}

function formatRelativeFrom(dateString?: string | null) {
  if (!dateString) {
    return 'Unknown'
  }

  const diffMs = Date.now() - new Date(dateString).getTime()
  const min = Math.max(1, Math.floor(diffMs / 60000))
  if (min < 60) {
    return `${min} minutes ago`
  }
  const hrs = Math.floor(min / 60)
  if (hrs < 24) {
    return `${hrs} hours ago`
  }
  const days = Math.floor(hrs / 24)
  return `${days} days ago`
}

export default function DeviceDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { device, loading, error, refetch } = useDevice(id)

  const pulse = useRef(new Animated.Value(0)).current
  const [submitting, setSubmitting] = useState(false)
  const [lostModal, setLostModal] = useState(false)
  const [liveLocation, setLiveLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null)
  const [liveRssi, setLiveRssi] = useState<number | null>(null)
  const [lostForm, setLostForm] = useState<LostForm>({
    incident_description: '',
    last_known_address: '',
    police_complaint_number: '',
    reward_amount: '',
  })

  useEffect(() => {
    if (device?.status !== 'lost') {
      return
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    )

    anim.start()
    return () => anim.stop()
  }, [device?.status, pulse])

  const lastBeacon = useMemo(() => {
    if (!device?.beacon_logs?.length) {
      return null
    }

    return [...device.beacon_logs].sort(
      (a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime()
    )[0]
  }, [device?.beacon_logs])

  useEffect(() => {
    setLiveLocation(null)
    setLastSeenAt(null)
    setLiveRssi(null)
  }, [device?.id])

  useEffect(() => {
    if (!device?.id) {
      return
    }

    const channel = supabase
      .channel(`beacon_logs:${device.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'beacon_logs',
          filter: `device_id=eq.${device.id}`,
        },
        (payload) => {
          const log = payload.new as {
            latitude: number
            longitude: number
            rssi: number | null
            reported_at: string
          }
          setLiveLocation({ latitude: log.latitude, longitude: log.longitude })
          setLastSeenAt(log.reported_at)
          setLiveRssi(log.rssi)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [device?.id])

  const reportLostNow = async () => {
    if (!device?.id) {
      return
    }

    if (!lostForm.incident_description.trim() || !lostForm.last_known_address.trim()) {
      Alert.alert('Validation', 'Incident description and last known address are required.')
      return
    }

    setSubmitting(true)
    try {
      await reportLost(device.id, {
        incident_description: lostForm.incident_description.trim(),
        last_known_address: lostForm.last_known_address.trim(),
        police_complaint_number: lostForm.police_complaint_number.trim() || undefined,
        reward_amount: lostForm.reward_amount ? Number(lostForm.reward_amount) : null,
        last_known_lat: device.last_seen_lat,
        last_known_lng: device.last_seen_lng,
      })

      if (device.ble_device_uuid) {
        await bleService.setStoredBleDeviceUuid(device.ble_device_uuid)
        await bleService.startBroadcast(device.ble_device_uuid)
      }

      setLostModal(false)
      await refetch()
      Alert.alert('Success', 'Device marked as lost and beacon mode activated.')
    } catch (actionError) {
      Alert.alert('Error', actionError instanceof Error ? actionError.message : 'Unable to report lost.')
    } finally {
      setSubmitting(false)
    }
  }

  const markFoundNow = async () => {
    if (!device?.id) {
      return
    }

    setSubmitting(true)
    try {
      await markFound(device.id)
      bleService.stopBroadcast()
      await refetch()
      Alert.alert('Success', 'Device marked as found/recovered.')
    } catch (actionError) {
      Alert.alert('Error', actionError instanceof Error ? actionError.message : 'Unable to mark found.')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteDevice = () => {
    if (!device?.id) {
      return
    }

    Alert.alert('Delete Device', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error: deleteError } = await supabase.from('devices').delete().eq('id', device.id)
          if (deleteError) {
            Alert.alert('Error', deleteError.message)
            return
          }
          router.replace('/(tabs)/devices')
        },
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      </SafeAreaView>
    )
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error || 'Device not found.'}</Text>
          <Pressable onPress={() => router.replace('/(tabs)/devices')}>
            <Text style={styles.backLink}>Back to devices</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const isLost = device.status === 'lost'
  const safeStatus = device.status === 'registered' || device.status === 'recovered'
  const lastSeenLabel = lastSeenAt ?? lastBeacon?.reported_at ?? device.last_seen_at
  const baseDeviceLocation =
    device.last_seen_lat != null && device.last_seen_lng != null
      ? {
          latitude: device.last_seen_lat,
          longitude: device.last_seen_lng,
        }
      : null
  const mapLocation = liveLocation ?? baseDeviceLocation
  const mapRegion = mapLocation
    ? {
        latitude: mapLocation.latitude,
        longitude: mapLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : FALLBACK_REGION
  const signalLabel = liveRssi ?? lastBeacon?.rssi ?? null

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{`${device.make} ${device.model}`}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconCircle}>
            <MaterialIcons name="smartphone" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>{`${device.make} ${device.model}`}</Text>

          <View style={styles.statusRow}>
            {isLost ? (
              <Animated.View
                style={[
                  styles.pulseDot,
                  {
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
                    transform: [
                      {
                        scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.3] }),
                      },
                    ],
                  },
                ]}
              />
            ) : null}
            <View style={[styles.statusBadge, { backgroundColor: safeStatus ? `${Colors.secondary}22` : `${Colors.error}22` }]}>
              <Text style={[styles.statusBadgeText, { color: safeStatus ? Colors.secondary : Colors.error }]}>
                {device.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.imeiLabel}>PRIMARY IMEI</Text>
          <Text style={styles.imeiValue}>{device.imei_primary}</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Serial Number</Text>
            <Text style={styles.infoMono}>{device.serial_number}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Color</Text>
            <Text style={styles.infoValue}>{device.color || 'Unknown'}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Purchase Date</Text>
            <Text style={styles.infoValue}>{device.purchase_date || 'N/A'}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Registered Date</Text>
            <Text style={styles.infoValue}>{new Date(device.created_at).toISOString().slice(0, 10)}</Text>
          </View>
        </View>

        <View style={styles.lastSeenCard}>
          <Text style={styles.sectionTitle}>{`Last Seen${signalLabel != null ? ` • Signal: ${signalLabel} dBm` : ''}`}</Text>
          {lastSeenLabel || mapLocation ? (
            <Text style={styles.lastSeenText}>
              {`Last seen ${formatRelativeFrom(lastSeenLabel)}${mapLocation ? ` at ${mapLocation.latitude.toFixed(5)}, ${mapLocation.longitude.toFixed(5)}` : ''}`}
            </Text>
          ) : (
            <Text style={styles.lastSeenText}>No beacon logs available yet.</Text>
          )}
          <View style={[styles.mapPlaceholder, { overflow: 'hidden' }]}>
            <StaticMapView 
              latitude={mapRegion.latitude} 
              longitude={mapRegion.longitude} 
              zoom={14} 
            />
          </View>
        </View>

        <View style={styles.actionsWrap}>
          {device.status === 'registered' ? (
            <GradientButton title="Report as Lost" onPress={() => setLostModal(true)} />
          ) : null}

          {device.status === 'lost' ? (
            <>
              <Pressable
                style={styles.ghostButton}
                onPress={() => void markFoundNow()}
                disabled={submitting}
              >
                <Text style={styles.ghostButtonText}>{submitting ? 'Updating...' : 'Mark as Found'}</Text>
              </Pressable>
              <GradientButton
                title="View Live Tracker"
                onPress={() => router.push({ pathname: '/tracker/[deviceId]', params: { deviceId: device.id } })}
              />
            </>
          ) : null}

          <Pressable style={styles.ghostButton} onPress={() => Alert.alert('Share', 'Share flow will be expanded in Phase 3.') }>
            <Text style={styles.ghostButtonText}>Share for Resale</Text>
          </Pressable>

          <Pressable onPress={deleteDevice}>
            <Text style={styles.deleteLink}>Delete Device</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={lostModal} transparent animationType="slide" onRequestClose={() => setLostModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Report Device as Lost</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              value={lostForm.incident_description}
              onChangeText={(value) => setLostForm((current) => ({ ...current, incident_description: value }))}
              placeholder="Incident description"
              placeholderTextColor={Colors.outline}
              multiline
              textAlignVertical="top"
            />
            <TextInput
              style={styles.input}
              value={lostForm.last_known_address}
              onChangeText={(value) => setLostForm((current) => ({ ...current, last_known_address: value }))}
              placeholder="Last known address"
              placeholderTextColor={Colors.outline}
            />
            <TextInput
              style={styles.input}
              value={lostForm.police_complaint_number}
              onChangeText={(value) =>
                setLostForm((current) => ({ ...current, police_complaint_number: value }))
              }
              placeholder="Police complaint number (optional)"
              placeholderTextColor={Colors.outline}
            />
            <TextInput
              style={styles.input}
              value={lostForm.reward_amount}
              onChangeText={(value) =>
                setLostForm((current) => ({ ...current, reward_amount: value.replace(/[^0-9.]/g, '') }))
              }
              keyboardType="decimal-pad"
              placeholder="Reward amount (optional)"
              placeholderTextColor={Colors.outline}
            />

            <GradientButton title="Submit Report" onPress={() => void reportLostNow()} loading={submitting} />
            <Pressable onPress={() => setLostModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    marginTop: 120,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  errorText: {
    color: Colors.error,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 14,
  },
  backLink: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  headerTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 18,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 16,
  },
  heroCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  heroIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceVariant,
  },
  heroTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  imeiLabel: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 1,
  },
  imeiValue: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.monoMedium,
    fontSize: 13,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  infoCell: {
    width: '48%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    minHeight: 84,
    justifyContent: 'center',
    gap: 5,
  },
  infoLabel: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 11,
  },
  infoValue: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
  },
  infoMono: {
    color: Colors.onSurface,
    fontFamily: FontFamily.monoMedium,
    fontSize: 12,
  },
  lastSeenCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 16,
  },
  lastSeenText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 13,
  },
  mapPlaceholder: {
    marginTop: 6,
    borderRadius: 12,
    minHeight: 88,
    backgroundColor: '#2d3138',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mapPlaceholderText: {
    color: Colors.outline,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 12,
  },
  actionsWrap: {
    gap: 10,
  },
  ghostButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
  },
  deleteLink: {
    textAlign: 'center',
    color: Colors.error,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: Colors.surfaceContainerLow,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    gap: 10,
  },
  sheetHandle: {
    width: 50,
    height: 5,
    borderRadius: 4,
    alignSelf: 'center',
    backgroundColor: Colors.outlineVariant,
  },
  modalTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 20,
    marginBottom: 2,
  },
  input: {
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    color: Colors.onSurface,
    paddingHorizontal: 14,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 14,
  },
  textArea: {
    minHeight: 88,
    maxHeight: 130,
    paddingTop: 10,
  },
  cancelText: {
    textAlign: 'center',
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    marginTop: 4,
  },
})
