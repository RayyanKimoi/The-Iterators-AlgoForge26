import { useEffect, useState, useMemo } from 'react'
import { StyleSheet, Text, View, Dimensions, ScrollView, Platform, Pressable, Modal, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useRouter } from 'expo-router'

import { Colors } from '../../constants/colors'
import { FontFamily } from '../../constants/typography'
import { useSubscription } from '../../hooks/useSubscription'
import { useAuth } from '../../hooks/useAuth'
import { Header } from '../../components/ui/Header'
import { GradientButton } from '../../components/ui/GradientButton'
import { Toast } from '../../components/ui/Toast'

// --- Types ---
type PhoneDevice = {
  id: string
  name: string
  latitude: number
  longitude: number
  lastSeen: string
  status: 'online' | 'offline' | 'moving'
  batteryLevel: number
}

type FamilyMember = {
  id: string
  name: string
  email: string
  isCurrentUser?: boolean
  devices: PhoneDevice[]
}

// --- Mumbai Random Location Generator ---
const MUMBAI_LAT_MIN = 18.92
const MUMBAI_LAT_MAX = 19.15
const MUMBAI_LNG_MIN = 72.82
const MUMBAI_LNG_MAX = 72.95

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

function getRandomMumbaiLocation() {
  return {
    latitude: Math.random() * (MUMBAI_LAT_MAX - MUMBAI_LAT_MIN) + MUMBAI_LAT_MIN,
    longitude: Math.random() * (MUMBAI_LNG_MAX - MUMBAI_LNG_MIN) + MUMBAI_LNG_MIN,
  }
}

function createMockPhone(name: string): PhoneDevice {
  return {
    id: 'dev_' + Date.now() + Math.random().toString(36).substring(7),
    name,
    ...getRandomMumbaiLocation(),
    lastSeen: 'Just now',
    status: Math.random() > 0.3 ? 'online' : 'moving',
    batteryLevel: Math.floor(Math.random() * 80) + 20,
  }
}

// --- Main Component ---
export default function FamilyScreen() {
  const router = useRouter()
  const { planId } = useSubscription()
  const { profile, user } = useAuth()

  // State
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Initialize with current user
  useEffect(() => {
    if (members.length === 0 && profile?.full_name) {
      setMembers([
        {
          id: 'user_self',
          name: profile.full_name + ' (You)',
          email: user?.email || '',
          isCurrentUser: true,
          devices: [createMockPhone('My Primary Phone')],
        },
      ])
    }
  }, [profile?.full_name, user?.email, members.length])

  // Flatten devices for the map
  const allDevices = useMemo(() => {
    return members.flatMap(m => m.devices.map(d => ({ ...d, ownerName: m.name })))
  }, [members])

  // Route Guard
  useEffect(() => {
    if (planId !== 'premium') {
      router.replace('/(tabs)')
    }
  }, [planId, router])

  if (planId !== 'premium') return null

  // Helpers
  const getStatusColor = (status: PhoneDevice['status']) => {
    switch (status) {
      case 'online': return Colors.secondary
      case 'moving': return Colors.tertiary
      case 'offline': return Colors.outline
    }
  }

  const handleAddMember = () => {
    if (!addEmail || !addPassword) {
      setToast({ message: 'Please enter both email and password', type: 'error' })
      return
    }
    
    // Extract name from email (mock logic)
    const newName = addEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ')
    const capitalizedName = newName.charAt(0).toUpperCase() + newName.slice(1)

    const newMember: FamilyMember = {
      id: 'mem_' + Date.now(),
      name: capitalizedName || 'Family Member',
      email: addEmail,
      devices: [createMockPhone(`${capitalizedName}'s Phone`)],
    }

    setMembers(prev => [...prev, newMember])
    setAddMemberModalVisible(false)
    setAddEmail('')
    setAddPassword('')
    setToast({ message: `Successfully linked account: ${addEmail}`, type: 'success' })
  }

  const handleAddDevice = (memberId: string) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        return {
          ...m,
          devices: [...m.devices, createMockPhone(`Phone ${m.devices.length + 1}`)]
        }
      }
      return m
    }))
    setToast({ message: 'New device added to map', type: 'info' })
  }

  const handleDeleteDevice = (memberId: string, deviceId: string) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        return {
          ...m,
          devices: m.devices.filter(d => d.id !== deviceId)
        }
      }
      return m
    }))
    setToast({ message: 'Device tracking removed', type: 'info' })
  }


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header 
        title="Family Tracking" 
        rightIcon="person-add" 
        onRightPress={() => setAddMemberModalVisible(true)} 
      />

      <Toast
        visible={!!toast}
        message={toast?.message ?? ''}
        type={toast?.type ?? 'info'}
        onHide={() => setToast(null)}
      />

      {/* --- Map View --- */}
      <View style={StyleSheet.absoluteFillObject}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: 19.0760, // Center of Mumbai
            longitude: 72.8777,
            latitudeDelta: 0.3,
            longitudeDelta: 0.3,
          }}
          customMapStyle={customMapStyle}
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={false}
          rotateEnabled={false}
          showsBuildings={true}
        >
          {allDevices.map((device) => (
            <Marker
              key={device.id}
              coordinate={{ latitude: device.latitude, longitude: device.longitude }}
              title={device.name}
              description={`${device.ownerName} • Last seen: ${device.lastSeen}`}
            >
              <View style={styles.markerContainer}>
                <View style={[styles.markerPin, { backgroundColor: getStatusColor(device.status) }]}>
                  <MaterialIcons name="smartphone" size={16} color={Colors.onSecondary} />
                </View>
                <View style={styles.markerPointer} />
              </View>
            </Marker>
          ))}
        </MapView>
      </View>

      {/* --- Bottom Sheet List --- */}
      <View style={styles.sheetContainer}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Tracked Devices ({allDevices.length}/10)</Text>
        </View>
        
        <ScrollView style={styles.deviceList} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {members.map((member) => (
            <View key={member.id} style={styles.memberGroup}>
              <View style={styles.memberHeader}>
                <View>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                </View>
                <Pressable onPress={() => handleAddDevice(member.id)} style={styles.addDeviceBtn}>
                  <MaterialIcons name="add" size={16} color={Colors.primary} />
                  <Text style={styles.addDeviceText}>Add Phone</Text>
                </Pressable>
              </View>

              {member.devices.length === 0 ? (
                <Text style={styles.emptyText}>No devices tracking for this user.</Text>
              ) : (
                member.devices.map((device) => (
                  <View key={device.id} style={styles.deviceCard}>
                    <View style={[styles.iconBox, { backgroundColor: `${getStatusColor(device.status)}20` }]}>
                      <MaterialIcons name="smartphone" size={24} color={getStatusColor(device.status)} />
                    </View>
                    
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{device.name}</Text>
                      <View style={styles.batteryRow}>
                        <MaterialIcons 
                          name={device.batteryLevel > 20 ? 'battery-full' : 'battery-alert'} 
                          size={14} 
                          color={device.batteryLevel > 20 ? Colors.secondary : Colors.error} 
                        />
                        <Text style={[styles.batteryText, device.batteryLevel <= 20 && { color: Colors.error }]}>
                          {device.batteryLevel}% • {device.status}
                        </Text>
                      </View>
                    </View>

                    <Pressable 
                      onPress={() => handleDeleteDevice(member.id, device.id)}
                      style={styles.deleteBtn}
                    >
                      <MaterialIcons name="delete-outline" size={20} color={Colors.error} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* --- Add Member Modal (Mock Auth) --- */}
      <Modal visible={addMemberModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Link Family Account</Text>
              <Pressable onPress={() => setAddMemberModalVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </Pressable>
            </View>

            <Text style={styles.modalDesc}>
              Enter your family member's SPORS account credentials to link them to your Premium family tracking.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Email</Text>
              <TextInput
                style={styles.input}
                placeholder="child@example.com"
                placeholderTextColor={Colors.outline}
                value={addEmail}
                onChangeText={setAddEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={Colors.outline}
                value={addPassword}
                onChangeText={setAddPassword}
                secureTextEntry
              />
            </View>

            <GradientButton 
              title="Link Account" 
              onPress={handleAddMember}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  mapContainer: { flex: 1 },
  map: { width: Dimensions.get('window').width, height: '100%' },
  
  // Map Markers
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  markerPin: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background, elevation: 5,
  },
  markerPointer: {
    width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid',
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: Colors.background,
    marginTop: -2,
  },
  
  // Bottom Sheet
  sheetContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
    backgroundColor: Colors.surfaceContainerLowest, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 16, elevation: 20,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.outlineVariant, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { color: Colors.onSurface, fontFamily: FontFamily.headingSemiBold, fontSize: 18 },
  deviceList: { flex: 1 },
  
  // Member Groups
  memberGroup: { marginBottom: 24 },
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, paddingHorizontal: 4 },
  memberName: { color: Colors.onSurface, fontFamily: FontFamily.headingSemiBold, fontSize: 16 },
  memberEmail: { color: Colors.onSurfaceVariant, fontFamily: FontFamily.bodyRegular, fontSize: 12, marginTop: 2 },
  addDeviceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(170,199,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addDeviceText: { color: Colors.primary, fontFamily: FontFamily.bodyMedium, fontSize: 12 },
  emptyText: { color: Colors.outline, fontFamily: FontFamily.bodyRegular, fontSize: 13, fontStyle: 'italic', paddingHorizontal: 4 },
  
  // Device Cards
  deviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainerLow, borderRadius: 16, padding: 12, marginBottom: 8 },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  deviceInfo: { flex: 1 },
  deviceName: { color: Colors.onSurface, fontFamily: FontFamily.bodyMedium, fontSize: 15 },
  batteryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  batteryText: { color: Colors.onSurfaceVariant, fontFamily: FontFamily.bodyMedium, fontSize: 12 },
  deleteBtn: { padding: 8, backgroundColor: 'rgba(255,78,78,0.1)', borderRadius: 10 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surfaceContainer, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: Colors.onSurface, fontFamily: FontFamily.headingBold, fontSize: 20 },
  closeBtn: { padding: 4, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 12 },
  modalDesc: { color: Colors.onSurfaceVariant, fontFamily: FontFamily.bodyRegular, fontSize: 14, lineHeight: 20 },
  inputGroup: { gap: 8 },
  inputLabel: { color: Colors.onSurface, fontFamily: FontFamily.bodyMedium, fontSize: 13 },
  input: { backgroundColor: Colors.surfaceContainerLowest, borderWidth: 1, borderColor: Colors.outlineVariant, borderRadius: 12, paddingHorizontal: 16, minHeight: 52, color: Colors.onSurface, fontFamily: FontFamily.bodyRegular, fontSize: 15 },
  mockNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,185,95,0.1)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,185,95,0.25)', marginTop: 8 },
  mockText: { flex: 1, color: Colors.onSurfaceVariant, fontFamily: FontFamily.bodyRegular, fontSize: 11, lineHeight: 16 },
})
