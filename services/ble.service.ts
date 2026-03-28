import { PermissionsAndroid, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'

import { supabase } from '../lib/supabase'

type FoundCallback = (beaconId: string, rssi: number) => void

const APP_SERVICE_UUID = '5P0R5000-0000-0000-0000-000000000000'
const BLE_DEVICE_UUID_STORAGE_KEY = 'spors_ble_device_uuid'
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const REPORT_COOLDOWN_MS = 30000
const reportCooldown = new Map<string, number>()

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
    startAdvertising?: (
      options: { serviceUUIDs: string[]; localName: string },
      manufacturerData: string
    ) => Promise<void> | void
    stopAdvertising?: () => Promise<void> | void
    destroy?: () => void
  } | null = null

  private scanSimulationTimer: ReturnType<typeof setTimeout> | null = null
  private broadcastTimer: ReturnType<typeof setInterval> | null = null
  private broadcastManufacturerData: string | null = null
  private recentlySeen = new Map<string, number>()
  private scanning = false

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

  async requestScanPermissions() {
    const locationPermission = await Location.requestForegroundPermissionsAsync()

    let bluetoothGranted = true
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        const requested = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ])

        bluetoothGranted =
          requested[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          requested[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
          requested[PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE] === PermissionsAndroid.RESULTS.GRANTED &&
          requested[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
      } else {
        const fine = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
        bluetoothGranted = fine === PermissionsAndroid.RESULTS.GRANTED
      }
    }

    return locationPermission.status === 'granted' && bluetoothGranted
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
    this.stopScan()
    this.scanning = true

    const granted = await this.requestScanPermissions()
    if (!granted) {
      throw new Error('Location and bluetooth permissions are required for scanning.')
    }

    const storedUuid = await this.getStoredBleDeviceUuid()

    if (!this.manager) {
      console.log('BLE scanning active (simulated)')
      this.scanSimulationTimer = setTimeout(() => {
        if (!this.scanning) {
          return
        }

        const beaconId = storedUuid ?? 'SPORS-SIM-DEMO'
        const rssi = -58
        onDeviceFound(beaconId, rssi)
        void this.logFoundBeacon(beaconId, rssi)
      }, 8000)
      return
    }

    this.manager.startDeviceScan([APP_SERVICE_UUID], { allowDuplicates: false }, (error, device) => {
      if (error || !device) {
        if (error) {
          console.log('BLE scan error. Switching to simulation mode.')
          this.stopScan()
          this.scanSimulationTimer = setTimeout(() => {
            if (!this.scanning) {
              return
            }

            const beaconId = storedUuid ?? 'SPORS-SIM-DEMO'
            const rssi = -60
            onDeviceFound(beaconId, rssi)
            void this.logFoundBeacon(beaconId, rssi)
          }, 8000)
        }
        return
      }

      const beaconId = this.extractBeaconId(device)
      if (!beaconId) {
        return
      }

      const now = Date.now()
      const cooldown = this.recentlySeen.get(beaconId)
      if (cooldown && now - cooldown < 4500) {
        return
      }

      this.recentlySeen.set(beaconId, now)
      const rssi = typeof device.rssi === 'number' ? device.rssi : -96
      onDeviceFound(beaconId, rssi)
      void this.logFoundBeacon(beaconId, rssi)
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

  async startBroadcast(beaconId: string) {
    this.stopBroadcast()
    await this.updateBroadcastManufacturerData(beaconId)

    const manufacturerDataBase64 = this.broadcastManufacturerData ?? ''
    if (this.manager?.startAdvertising) {
      try {
        await this.manager.startAdvertising(
          {
            serviceUUIDs: [APP_SERVICE_UUID],
            localName: 'SPORS',
          },
          manufacturerDataBase64
        )
      } catch {
        // If native advertising fails, keep simulation active for backend updates.
      }
    }

    this.broadcastTimer = setInterval(() => {
      void this.simulateBroadcastLocation(beaconId)
    }, 30000)

    void this.simulateBroadcastLocation(beaconId)
  }

  stopBroadcast() {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer)
      this.broadcastTimer = null
    }

    if (this.manager?.stopAdvertising) {
      void this.manager.stopAdvertising()
    }
  }

  async reportLocationForDevice(deviceId: string, rssi: number | null = null) {
    const locationPermission = await Location.getForegroundPermissionsAsync()
    if (locationPermission.status !== 'granted') {
      return
    }

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    const { data: authData } = await supabase.auth.getUser()

    await supabase.from('beacon_logs').insert({
      device_id: deviceId,
      reporter_id: authData.user?.id ?? null,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy_meters: position.coords.accuracy ?? null,
      rssi,
    })

    await supabase
      .from('devices')
      .update({
        last_seen_at: new Date().toISOString(),
        last_seen_lat: position.coords.latitude,
        last_seen_lng: position.coords.longitude,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deviceId)

    const { data: deviceRow } = await supabase
      .from('devices')
      .select('owner_id, make, model')
      .eq('id', deviceId)
      .maybeSingle()

    if (deviceRow?.owner_id) {
      const deviceName = `${deviceRow.make ?? 'Device'} ${deviceRow.model ?? ''}`.trim()
      await supabase.from('notifications').insert({
        user_id: deviceRow.owner_id,
        title: 'Your device was spotted',
        body: `${deviceName} was detected nearby`,
        type: 'beacon_detected',
        reference_id: deviceId,
      })
    }
  }

  private extractBeaconId(device: {
    localName?: string | null
    name?: string | null
    serviceUUIDs?: string[] | null
    manufacturerData?: string | null
  }) {
    const manufacturerUuid = this.readBleUuidFromManufacturerData(device.manufacturerData)
    if (manufacturerUuid) {
      return manufacturerUuid
    }

    const name = device.localName || device.name
    if (name && name.toUpperCase().startsWith('SPORS-')) {
      return name.replace(/^SPORS-/i, '').trim() || name
    }

    const uuidMatch = (device.serviceUUIDs ?? []).find((item) => item.toUpperCase().includes('SPORS-'))
    if (uuidMatch) {
      return uuidMatch
    }

    return null
  }

  private async logFoundBeacon(beaconId: string, rssi: number) {
    const normalizedUuid = this.normalizeBleUuid(beaconId)
    const normalizedBeaconId = beaconId.replace(/^SPORS-/i, '').trim()
    const reportKeys = Array.from(new Set([normalizedUuid, beaconId, normalizedBeaconId])).filter(
      (value): value is string => Boolean(value)
    )
    const now = Date.now()

    const inCooldown = reportKeys.some((key) => {
      const lastReported = reportCooldown.get(key)
      return typeof lastReported === 'number' && now - lastReported < REPORT_COOLDOWN_MS
    })

    if (inCooldown) {
      return
    }

    if (normalizedUuid) {
      const { data: uuidRows } = await supabase
        .from('devices')
        .select('id, status, ble_beacon_id, ble_device_uuid')
        .eq('ble_device_uuid', normalizedUuid)
        .limit(1)

      const uuidMatchedDevice = (uuidRows?.[0] as DeviceRow | undefined) ?? null
      if (uuidMatchedDevice?.id) {
        await this.reportLocationForDevice(uuidMatchedDevice.id, rssi)
        const updatedAt = Date.now()
        reportKeys.forEach((key) => reportCooldown.set(key, updatedAt))
        return
      }
    }

    const identifiers = Array.from(new Set([beaconId, normalizedBeaconId])).filter(Boolean)

    const { data: deviceRows } = await supabase
      .from('devices')
      .select('id, status, ble_beacon_id, ble_device_uuid')
      .in('ble_beacon_id', identifiers)
      .limit(1)

    const matchedDevice = (deviceRows?.[0] as DeviceRow | undefined) ?? null
    if (!matchedDevice?.id) {
      return
    }

    await this.reportLocationForDevice(matchedDevice.id, rssi)
    const updatedAt = Date.now()
    reportKeys.forEach((key) => reportCooldown.set(key, updatedAt))
  }

  private async simulateBroadcastLocation(beaconId: string) {
    const manufacturerUuid = this.readBleUuidFromManufacturerData(this.broadcastManufacturerData)
    if (manufacturerUuid) {
      const { data: uuidRows } = await supabase
        .from('devices')
        .select('id')
        .eq('ble_device_uuid', manufacturerUuid)
        .limit(1)

      const uuidMatchedDevice = uuidRows?.[0]
      if (uuidMatchedDevice?.id) {
        await this.reportLocationForDevice(uuidMatchedDevice.id)
        return
      }
    }

    const normalizedBeaconId = beaconId.replace(/^SPORS-/i, '').trim()
    const identifiers = Array.from(new Set([beaconId, normalizedBeaconId])).filter(Boolean)

    const { data: deviceRows } = await supabase
      .from('devices')
      .select('id')
      .in('ble_beacon_id', identifiers)
      .limit(1)

    const matchedDevice = deviceRows?.[0]
    if (!matchedDevice?.id) {
      return
    }

    await this.reportLocationForDevice(matchedDevice.id)
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

  private async updateBroadcastManufacturerData(beaconId: string) {
    const storedUuid = await this.getStoredBleDeviceUuid()
    const fallbackUuid = this.normalizeBleUuid(beaconId)
    const bleDeviceUuid = storedUuid ?? fallbackUuid

    this.broadcastManufacturerData = bleDeviceUuid
      ? this.encodeBleUuidForManufacturerData(bleDeviceUuid)
      : null
  }
}

export const bleService = new BLEService()
