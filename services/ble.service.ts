import { PermissionsAndroid, Platform } from 'react-native'
import * as Location from 'expo-location'

import { supabase } from '../lib/supabase'

type FoundCallback = (beaconId: string, rssi: number) => void

type DeviceRow = {
  id: string
  status: 'registered' | 'lost' | 'found' | 'recovered' | 'stolen'
  ble_beacon_id: string
}

class BLEService {
  private manager: {
    startDeviceScan: (
      uuids: string[] | null,
      options: { allowDuplicates?: boolean } | null,
      listener: (error: unknown, device: { localName?: string | null; name?: string | null; rssi?: number | null; serviceUUIDs?: string[] | null } | null) => void
    ) => void
    stopDeviceScan: () => void
    destroy?: () => void
  } | null = null

  private scanSimulationTimer: ReturnType<typeof setTimeout> | null = null
  private broadcastTimer: ReturnType<typeof setInterval> | null = null
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

    return locationPermission.status === 'granted' && bluetoothGranted
  }

  async scanForSPORSDevices(onDeviceFound: FoundCallback) {
    this.stopScan()
    this.scanning = true

    const granted = await this.requestScanPermissions()
    if (!granted) {
      throw new Error('Location and bluetooth permissions are required for scanning.')
    }

    if (!this.manager) {
      console.log('BLE scanning active (simulated)')
      this.scanSimulationTimer = setTimeout(() => {
        if (!this.scanning) {
          return
        }

        const beaconId = 'SPORS-SIM-DEMO'
        const rssi = -58
        onDeviceFound(beaconId, rssi)
        void this.logFoundBeacon(beaconId, rssi)
      }, 8000)
      return
    }

    this.manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error || !device) {
        if (error) {
          console.log('BLE scan error. Switching to simulation mode.')
          this.stopScan()
          this.scanSimulationTimer = setTimeout(() => {
            if (!this.scanning) {
              return
            }

            const beaconId = 'SPORS-SIM-DEMO'
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

  startBroadcast(beaconId: string) {
    this.stopBroadcast()
    void this.simulateBroadcastLocation(beaconId)

    this.broadcastTimer = setInterval(() => {
      void this.simulateBroadcastLocation(beaconId)
    }, 30000)
  }

  stopBroadcast() {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer)
      this.broadcastTimer = null
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
  }

  private extractBeaconId(device: {
    localName?: string | null
    name?: string | null
    serviceUUIDs?: string[] | null
  }) {
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
    const normalizedBeaconId = beaconId.replace(/^SPORS-/i, '').trim()
    const identifiers = Array.from(new Set([beaconId, normalizedBeaconId])).filter(Boolean)

    const { data: deviceRows } = await supabase
      .from('devices')
      .select('id, status, ble_beacon_id')
      .in('ble_beacon_id', identifiers)
      .limit(1)

    const matchedDevice = (deviceRows?.[0] as DeviceRow | undefined) ?? null
    if (!matchedDevice?.id) {
      return
    }

    await this.reportLocationForDevice(matchedDevice.id, rssi)
  }

  private async simulateBroadcastLocation(beaconId: string) {
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
}

export const bleService = new BLEService()
