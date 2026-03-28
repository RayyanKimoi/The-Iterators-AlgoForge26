import { PermissionsAndroid, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'

import { supabase } from '../lib/supabase'

type FoundCallback = (beaconId: string, rssi: number) => void

export const APP_SERVICE_UUID = '5P0R5000-0000-0000-0000-000000000000'
const BLE_DEVICE_UUID_STORAGE_KEY = 'spors_ble_device_uuid'
const BLE_BROADCASTING_MODE_STORAGE_KEY = 'spors_ble_broadcasting_mode'
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const REPORT_COOLDOWN_MS = 30000
const reportCooldown = new Map<string, number>()
const VALID_SERVICE_UUID_RE = /^([0-9a-f]{4}|[0-9a-f]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

function toNativeBleServiceUuid(value: string) {
  // BLE service UUIDs must be hexadecimal; this maps SPORS mnemonic characters to hex-safe values.
  const mapped = value.replace(/p/gi, 'a').replace(/r/gi, 'f').toLowerCase()
  if (!VALID_SERVICE_UUID_RE.test(mapped)) {
    throw new Error('Invalid APP_SERVICE_UUID configuration for BLE advertising/scanning.')
  }

  return mapped
}

const APP_SERVICE_UUID_NATIVE = toNativeBleServiceUuid(APP_SERVICE_UUID)
const scanServiceUuids = [APP_SERVICE_UUID_NATIVE]

function encodeBase64Ascii(value: string) {
  let output = ''

  for (let i = 0; i < value.length; i += 3) {
    const b1 = value.charCodeAt(i) & 0xff
    const b2 = i + 1 < value.length ? value.charCodeAt(i + 1) & 0xff : Number.NaN
    const b3 = i + 2 < value.length ? value.charCodeAt(i + 2) & 0xff : Number.NaN

    const chunk = (b1 << 16) | ((Number.isNaN(b2) ? 0 : b2) << 8) | (Number.isNaN(b3) ? 0 : b3)

    output += BASE64_CHARS[(chunk >> 18) & 63]
    output += BASE64_CHARS[(chunk >> 12) & 63]
    output += Number.isNaN(b2) ? '=' : BASE64_CHARS[(chunk >> 6) & 63]
    output += Number.isNaN(b3) ? '=' : BASE64_CHARS[chunk & 63]
  }

  return output
}

function decodeBase64Ascii(value: string) {
  const clean = value.replace(/[^A-Za-z0-9+/=]/g, '')
  let output = ''

  for (let i = 0; i < clean.length; i += 4) {
    const c1 = BASE64_CHARS.indexOf(clean[i] ?? 'A')
    const c2 = BASE64_CHARS.indexOf(clean[i + 1] ?? 'A')
    const c3Raw = clean[i + 2] ?? '='
    const c4Raw = clean[i + 3] ?? '='
    const c3 = c3Raw === '=' ? 0 : BASE64_CHARS.indexOf(c3Raw)
    const c4 = c4Raw === '=' ? 0 : BASE64_CHARS.indexOf(c4Raw)

    if (c1 < 0 || c2 < 0 || c3 < 0 || c4 < 0) {
      throw new Error('Invalid base64 input')
    }

    const chunk = (c1 << 18) | (c2 << 12) | (c3 << 6) | c4

    output += String.fromCharCode((chunk >> 16) & 0xff)
    if (c3Raw !== '=') {
      output += String.fromCharCode((chunk >> 8) & 0xff)
    }
    if (c4Raw !== '=') {
      output += String.fromCharCode(chunk & 0xff)
    }
  }

  return output
}

function encodeBase64(value: string) {
  const maybeBtoa = (globalThis as { btoa?: (input: string) => string }).btoa
  if (typeof maybeBtoa === 'function') {
    return maybeBtoa(value)
  }

  return encodeBase64Ascii(value)
}

function decodeBase64(value: string) {
  const maybeAtob = (globalThis as { atob?: (input: string) => string }).atob
  if (typeof maybeAtob === 'function') {
    return maybeAtob(value)
  }

  return decodeBase64Ascii(value)
}

type DeviceRow = {
  id: string
  status: 'registered' | 'lost' | 'found' | 'recovered' | 'stolen'
  ble_beacon_id: string | null
  ble_device_uuid: string | null
}

class BLEService {
  private manager: {
    startDeviceScan: (
      uuids: string[] | null,
      options: { allowDuplicates?: boolean } | null,
      listener: (error: unknown, device: { localName?: string | null; name?: string | null; rssi?: number | null; serviceUUIDs?: string[] | null; manufacturerData?: string | null } | null) => void
    ) => void
    stopDeviceScan: () => void
    state?: () => Promise<string>
    startAdvertising?: (
      options: { serviceUUIDs: string[]; localName: string },
      manufacturerData: string
    ) => Promise<void> | void
    stopAdvertising?: () => Promise<void> | void
    destroy?: () => void
  } | null = null

  private scanSimulationTimer: ReturnType<typeof setTimeout> | null = null
  private broadcastManufacturerData: string | null = null
  private recentlySeen = new Map<string, number>()
  private scanning = false
  private broadcastingMode: boolean | null = null

  constructor() {
    try {
      const bleModule = require('react-native-ble-plx')
      if (bleModule?.BleManager) {
        this.manager = new bleModule.BleManager()
      }
    } catch {
      this.manager = null
    }
  }

  private async ensureForegroundLocationPermission() {
    const current = await Location.getForegroundPermissionsAsync()
    if (current.status === 'granted') {
      return true
    }

    const requested = await Location.requestForegroundPermissionsAsync()
    return requested.status === 'granted'
  }

  private async ensureBackgroundLocationPermission() {
    if (Platform.OS !== 'android' || Platform.Version < 29) {
      return true
    }

    const existing = await Location.getBackgroundPermissionsAsync()
    if (existing.status === 'granted') {
      return true
    }

    const requested = await Location.requestBackgroundPermissionsAsync()
    return requested.status === 'granted'
  }

  private async getBroadcastingMode() {
    if (typeof this.broadcastingMode === 'boolean') {
      return this.broadcastingMode
    }

    const stored = await AsyncStorage.getItem(BLE_BROADCASTING_MODE_STORAGE_KEY)
    this.broadcastingMode = stored === '1'
    return this.broadcastingMode
  }

  private async setBroadcastingMode(enabled: boolean) {
    this.broadcastingMode = enabled
    await AsyncStorage.setItem(BLE_BROADCASTING_MODE_STORAGE_KEY, enabled ? '1' : '0')
  }

  async isBroadcastingMode() {
    return this.getBroadcastingMode()
  }

  async requestScanPermissions() {
    const locationGranted = await this.ensureForegroundLocationPermission()
    await this.ensureBackgroundLocationPermission()

    let bluetoothGranted = true
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        const requested = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ])

        bluetoothGranted =
          requested[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          requested[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
          requested[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
      } else {
        const fine = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
        bluetoothGranted = fine === PermissionsAndroid.RESULTS.GRANTED
      }
    }

    return locationGranted && bluetoothGranted
  }

  private async ensureBluetoothPoweredOn() {
    if (!this.manager?.state) {
      return
    }

    const state = await this.manager.state()
    if (state !== 'PoweredOn') {
      throw new Error('Bluetooth is off. Please turn on Bluetooth and try again.')
    }
  }

  async requestBroadcastPermissions() {
    if (Platform.OS !== 'android') {
      return true
    }

    if (Platform.Version < 31) {
      return true
    }

    const requested = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ])

    return (
      requested[PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE] === PermissionsAndroid.RESULTS.GRANTED &&
      requested[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
    )
  }

  async setStoredBleDeviceUuid(bleDeviceUuid: string) {
    const normalized = this.normalizeBleUuid(bleDeviceUuid)
    if (!normalized) {
      throw new Error('Invalid BLE device UUID.')
    }

    await AsyncStorage.setItem(BLE_DEVICE_UUID_STORAGE_KEY, normalized)
  }

  private async getStoredBleDeviceUuid() {
    const value = await AsyncStorage.getItem(BLE_DEVICE_UUID_STORAGE_KEY)
    return this.normalizeBleUuid(value)
  }

  async scanForSPORSDevices(onDeviceFound: FoundCallback) {
    const broadcasting = await this.getBroadcastingMode()
    if (broadcasting) {
      throw new Error('Broadcast mode is active on this device. Scanning is disabled for lost-owner mode.')
    }

    this.stopScan()

    const granted = await this.requestScanPermissions()
    if (!granted) {
      throw new Error('Location and bluetooth permissions are required for scanning.')
    }

    if (!this.manager) {
      throw new Error('BLE is not available on this device.')
    }

    await this.ensureBluetoothPoweredOn()
    this.scanning = true

    this.manager.startDeviceScan(scanServiceUuids, { allowDuplicates: false }, (error, device) => {
      if (error || !device) {
        if (error) {
          console.log('BLE scan error', error)
        }

        this.stopScan()
        return
      }

      const bleDeviceUuid = this.readBleUuidFromManufacturerData(device.manufacturerData)
      if (!bleDeviceUuid) {
        return
      }

      const now = Date.now()
      const cooldown = this.recentlySeen.get(bleDeviceUuid)
      if (cooldown && now - cooldown < 4500) {
        return
      }

      this.recentlySeen.set(bleDeviceUuid, now)
      const rssi = typeof device.rssi === 'number' ? device.rssi : -96
      onDeviceFound(bleDeviceUuid, rssi)
      void this.reportDetectedLostDevice(bleDeviceUuid, rssi).catch(() => {
        // Ignore reporting failures; scanning must continue.
      })
    })
  }

  stopScan() {
    this.scanning = false
    this.recentlySeen.clear()

    if (this.scanSimulationTimer) {
      clearTimeout(this.scanSimulationTimer)
      this.scanSimulationTimer = null
    }

    if (this.manager) {
      this.manager.stopDeviceScan()
    }
  }

  async startBroadcasting(bleDeviceUuid: string) {
    await this.stopBroadcasting()
    const locationGranted = await this.ensureForegroundLocationPermission()
    if (!locationGranted) {
      throw new Error('Location permission is required to activate lost mode beacon.')
    }

    const broadcastGranted = await this.requestBroadcastPermissions()
    if (!broadcastGranted) {
      throw new Error('Bluetooth advertise permission is required to broadcast lost device beacon.')
    }

    const normalizedUuid = this.normalizeBleUuid(bleDeviceUuid)
    if (!normalizedUuid) {
      throw new Error('Invalid BLE device UUID for broadcasting.')
    }

    if (!this.manager?.startAdvertising) {
      throw new Error('BLE advertising is not available in this app build. Peripheral advertising API is missing.')
    }

    await this.ensureBluetoothPoweredOn()

    await this.setStoredBleDeviceUuid(normalizedUuid)
    this.broadcastManufacturerData = this.encodeBleUuidForManufacturerData(normalizedUuid)

    try {
      await this.manager.startAdvertising(
        {
          serviceUUIDs: [APP_SERVICE_UUID_NATIVE],
          localName: 'SPORS',
        },
        this.broadcastManufacturerData
      )
      await this.setBroadcastingMode(true)
    } catch {
      await this.setBroadcastingMode(false)
      throw new Error('Unable to start BLE broadcasting on this device.')
    }
  }

  async startBroadcast(bleDeviceUuid: string) {
    await this.startBroadcasting(bleDeviceUuid)
  }

  async stopBroadcasting() {
    if (this.manager?.stopAdvertising) {
      void this.manager.stopAdvertising()
    }

    await this.setBroadcastingMode(false)
  }

  stopBroadcast() {
    void this.stopBroadcasting()
  }

  async reportLocationForDevice(deviceId: string, rssi: number | null = null) {
    const { data: deviceRow } = await supabase
      .from('devices')
      .select('id, owner_id, make, model, status, ble_device_uuid')
      .eq('id', deviceId)
      .maybeSingle()

    const row =
      (deviceRow as {
        id: string
        owner_id: string
        make: string | null
        model: string | null
        status: 'registered' | 'lost' | 'found' | 'recovered' | 'stolen'
        ble_device_uuid: string | null
      } | null) ?? null

    if (!row?.id) {
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    await this.writeLocationReport({
      deviceId: row.id,
      ownerId: row.owner_id,
      make: row.make,
      model: row.model,
      reporterId: authData.user?.id ?? null,
      rssi,
    })
  }

  private shouldReport(bleDeviceUuid: string) {
    const last = reportCooldown.get(bleDeviceUuid)
    const now = Date.now()
    if (last && now - last < REPORT_COOLDOWN_MS) {
      return false
    }

    reportCooldown.set(bleDeviceUuid, now)
    return true
  }

  private async reportDetectedLostDevice(bleDeviceUuid: string, rssi: number) {
    const normalizedUuid = this.normalizeBleUuid(bleDeviceUuid)
    if (!normalizedUuid || !this.shouldReport(normalizedUuid)) {
      return
    }

    const { data: row } = await supabase
      .from('devices')
      .select('id, owner_id, make, model, status')
      .eq('ble_device_uuid', normalizedUuid)
      .limit(1)
      .maybeSingle()

    const device =
      (row as {
        id: string
        owner_id: string
        make: string | null
        model: string | null
        status: 'registered' | 'lost' | 'found' | 'recovered' | 'stolen'
      } | null) ?? null

    if (!device?.id || device.status !== 'lost') {
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    const reporterId = authData.user?.id ?? null
    if (reporterId && reporterId === device.owner_id) {
      return
    }

    await this.writeLocationReport({
      deviceId: device.id,
      ownerId: device.owner_id,
      make: device.make,
      model: device.model,
      reporterId,
      rssi,
    })
  }

  private async writeLocationReport(params: {
    deviceId: string
    ownerId: string
    make: string | null
    model: string | null
    reporterId: string | null
    rssi: number | null
  }) {
    const locationGranted = await this.ensureForegroundLocationPermission()
    if (!locationGranted) {
      throw new Error('Location permission is required to report lost-device sightings.')
    }

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    const nowIso = new Date().toISOString()

    await supabase.from('beacon_logs').insert({
      device_id: params.deviceId,
      reporter_id: params.reporterId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy_meters: position.coords.accuracy ?? null,
      rssi: params.rssi,
    })

    await supabase
      .from('devices')
      .update({
        last_seen_at: nowIso,
        last_seen_lat: position.coords.latitude,
        last_seen_lng: position.coords.longitude,
        updated_at: nowIso,
      })
      .eq('id', params.deviceId)

    const deviceName = `${params.make ?? ''} ${params.model ?? ''}`.trim() || 'Device'
    await supabase.from('notifications').insert({
      user_id: params.ownerId,
      title: 'Device spotted!',
      body: `${deviceName} was detected near you`,
      type: 'beacon_detected',
      reference_id: params.deviceId,
    })
  }

  private normalizeBleUuid(value: string | null | undefined) {
    if (!value) {
      return null
    }

    const trimmed = value.trim().toLowerCase()
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(trimmed)
      ? trimmed
      : null
  }

  private readBleUuidFromManufacturerData(manufacturerData?: string | null) {
    if (!manufacturerData) {
      return null
    }

    try {
      const decoded = decodeBase64(manufacturerData).trim()
      const matched = decoded.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)
      return this.normalizeBleUuid(matched?.[0] ?? null)
    } catch {
      return null
    }
  }

  private encodeBleUuidForManufacturerData(bleDeviceUuid: string) {
    return encodeBase64(bleDeviceUuid)
  }
}

export const bleService = new BLEService()
