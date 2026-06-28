import { PermissionsAndroid, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import {
  getAdvertisingData,
  setServices,
  startAdvertising,
  stopAdvertising,
} from 'munim-bluetooth-peripheral'

import { supabase } from '../lib/supabase'

type FoundCallback = (beaconId: string, rssi: number) => void

export const APP_SERVICE_UUID = '5P0R5000-0000-0000-0000-000000000000'
const BLE_DEVICE_UUID_STORAGE_KEY = 'spors_ble_device_uuid'
const BLE_BROADCASTING_MODE_STORAGE_KEY = 'spors_ble_broadcasting_mode'
const BLE_BEACON_NAME_PREFIX = 'SPORS-'
const BLE_MANUFACTURER_PREFIX = 'SPORS:'
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const REPORT_COOLDOWN_MS = 30000
const reportCooldown = new Map<string, number>()
const VALID_SERVICE_UUID_RE = /^([0-9a-f]{4}|[0-9a-f]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

function toNativeBleServiceUuid(value: string) {
  // BLE UUIDs must be hex. Keep the SPORS mnemonic constant while mapping it for platform APIs.
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

type ForegroundServiceModule = {
  createNotificationChannel?: (config: {
    id: string
    name: string
    description?: string
    importance?: number
    enableVibration?: boolean
  }) => Promise<unknown> | unknown
  startService?: (config: {
    channelId: string
    id: number
    title: string
    text: string
    icon: string
    button?: string
    priority?: number
  }) => Promise<unknown> | unknown
  stopService?: () => Promise<unknown> | unknown
}

class BLEService {
  private manager: {
    startDeviceScan: (
      uuids: string[] | null,
      options: { allowDuplicates?: boolean; scanMode?: number } | null,
      listener: (error: unknown, device: { id?: string | null; localName?: string | null; name?: string | null; rssi?: number | null; serviceUUIDs?: string[] | null; manufacturerData?: string | null } | null) => void
    ) => void
    stopDeviceScan: () => void
    state?: () => Promise<string>
    destroy?: () => void
  } | null = null
  private foregroundService: ForegroundServiceModule | null = null

  private recentlySeen = new Map<string, number>()
  private broadcastingMode: boolean | null = null
  private lastBroadcastFlagVerifiedAt = 0
  private static readonly BROADCAST_FLAG_VERIFY_TTL_MS = 5 * 60 * 1000 // 5 minutes
  private currentDeviceUuid: string | null = null

  constructor() {
    try {
      const bleModule = require('react-native-ble-plx')
      if (bleModule?.BleManager) {
        this.manager = new bleModule.BleManager()
      }
    } catch {
      this.manager = null
    }

    try {
      const foregroundServiceModule = require('@voximplant/react-native-foreground-service')
      this.foregroundService = (foregroundServiceModule?.default ?? foregroundServiceModule) as ForegroundServiceModule
    } catch {
      this.foregroundService = null
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
        const permissionsToRequest = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]

        // Request POST_NOTIFICATIONS on Android 13+ (API 33) so foreground service
        // notifications are permitted from the very first app launch.
        if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
          permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
        }

        const requested = await PermissionsAndroid.requestMultiple(permissionsToRequest)

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

    const permissionsToRequest = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]

    if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
      permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
    }

    const requested = await PermissionsAndroid.requestMultiple(permissionsToRequest)

    const notificationPermissionGranted =
      Platform.Version < 33 ||
      !PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS ||
      requested[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] === PermissionsAndroid.RESULTS.GRANTED

    return (
      requested[PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE] === PermissionsAndroid.RESULTS.GRANTED &&
      requested[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
      notificationPermissionGranted
    )
  }

  private async startForegroundBeaconService() {
    if (Platform.OS !== 'android') {
      return
    }

    if (!this.foregroundService?.startService) {
      return
    }

    try {
      if (this.foregroundService.createNotificationChannel) {
        await Promise.resolve(
          this.foregroundService.createNotificationChannel({
            id: 'spors-ble-beacon',
            name: 'SPORS BLE Beacon',
            description: 'Keeps SPORS device beacon active in background',
            importance: 2,
            enableVibration: false,
          })
        )
      }

      await Promise.resolve(
        this.foregroundService.startService({
          channelId: 'spors-ble-beacon',
          id: 5001,
          title: 'SPORS protection active',
          text: 'Broadcasting your encrypted device beacon in background',
          icon: 'ic_launcher',
          button: 'Open SPORS',
          priority: -1,
        })
      )
    } catch (error) {
      console.error('[SPORS] Foreground service start failed:', error)
      // Don't rethrow - allow app to continue without foreground service
    }
  }

  private async stopForegroundBeaconService() {
    if (!this.foregroundService?.stopService) {
      return
    }

    await Promise.resolve(this.foregroundService.stopService())
  }

  private getAdvertiseErrorMessage(error: unknown) {
    if (typeof error === 'number') {
      if (error === 5) {
        return 'BLE advertising is not supported on this device hardware.'
      }

      return `Unable to start BLE advertising (code ${error}).`
    }

    const maybeObject = error as { code?: number; message?: string } | null
    if (typeof maybeObject?.code === 'number') {
      if (maybeObject.code === 5) {
        return 'BLE advertising is not supported on this device hardware.'
      }

      if (maybeObject.message) {
        return maybeObject.message
      }

      return `Unable to start BLE advertising (code ${maybeObject.code}).`
    }

    if (error instanceof Error && error.message) {
      return error.message
    }

    return 'Unable to start BLE advertising on this device.'
  }

  async setStoredBleDeviceUuid(bleDeviceUuid: string) {
    const normalized = this.normalizeBleUuid(bleDeviceUuid)
    if (!normalized) {
      throw new Error('Invalid BLE device UUID.')
    }

    await AsyncStorage.setItem(BLE_DEVICE_UUID_STORAGE_KEY, normalized)
    this.currentDeviceUuid = normalized
  }

  private async getStoredBleDeviceUuid() {
    const value = await AsyncStorage.getItem(BLE_DEVICE_UUID_STORAGE_KEY)
    const normalized = this.normalizeBleUuid(value)
    this.currentDeviceUuid = normalized
    return normalized
  }

  async scanForSPORSDevices(onDeviceFound: FoundCallback, options?: { skipPermissionPrompt?: boolean }) {
    // Ensure we know our own ID so we don't process our own broadcast
    await this.getStoredBleDeviceUuid()

    // Bug 4 fix: verify broadcasting flag against actual device status
    await this.verifyBroadcastingFlag()

    const broadcasting = await this.getBroadcastingMode()
    if (broadcasting) {
      throw new Error('Broadcast mode is active on this device. Scanning is disabled for lost-owner mode.')
    }

    this.stopScan()

    // In background context, we can't show permission dialogs — only check existing grants
    if (options?.skipPermissionPrompt) {
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        const scanGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN)
        const locationGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
        if (!scanGranted || !locationGranted) {
          console.log('[SPORS-BLE-DEBUG] 🔴 ERROR: Bluetooth/location permissions not granted for background scan.')
          throw new Error('Bluetooth/location permissions not granted for background scan.')
        }
      }
    } else {
      const granted = await this.requestScanPermissions()
      if (!granted) {
        console.log('[SPORS-BLE-DEBUG] 🔴 ERROR: Location and bluetooth permissions are required for scanning.')
        throw new Error('Location and bluetooth permissions are required for scanning.')
      }
    }

    const state = this.manager?.state ? await this.manager.state() : 'Unknown'
    console.log(`[SPORS-BLE-DEBUG] 🔵 INFO: Pre-flight scan check passed. BLE State: ${state}, Permissions: Granted.`)

    if (!this.manager) {
      throw new Error('BLE manager is not available. Please ensure Bluetooth is enabled.')
    }

    await this.ensureBluetoothPoweredOn()

    console.log('[SPORS-SCAN] Starting BLE scan. Filtering for service UUIDs:', scanServiceUuids)

    // Use Active Scanning (Low Latency / scanMode 2) so the radio explicitly
    // requests the Scan Response packet that carries the localName.
    this.manager.startDeviceScan(scanServiceUuids, { allowDuplicates: false, scanMode: 2 }, (error, device) => {
      if (error || !device) {
        if (error) {
          console.log('[SPORS-BLE-DEBUG] 🔴 ERROR: BLE scan error', JSON.stringify(error))
        }

        this.stopScan()
        return
      }

      // Aggressively extract name — use || so empty strings are also rejected
      const extractedName = device.localName || device.name
      const deviceName = extractedName || 'unnamed'
      const serviceUUIDs = device.serviceUUIDs ?? []

      // Try to extract UUID from manufacturer data or beacon name
      let bleDeviceUuid = this.readBleUuidFromAdvertisement(device)

      // If no UUID from advertisement data, check service UUIDs in the packet
      // The service UUID filter already ensures this is a SPORS device
      if (!bleDeviceUuid && serviceUUIDs.length > 0) {
        // Find a UUID that looks like a device UUID (not the SPORS app service UUID)
        for (const svcUuid of serviceUUIDs) {
          const normalized = this.normalizeBleUuid(svcUuid)
          if (normalized && normalized !== APP_SERVICE_UUID_NATIVE) {
            bleDeviceUuid = normalized
            break
          }
        }
      }

      const rssi = typeof device.rssi === 'number' ? device.rssi : -96

      if (!bleDeviceUuid) {
        // If no name was extracted at all, or the name is the generic "SPORS" fallback,
        // discard — we can't resolve this to a real device.
        if (!extractedName || extractedName === 'SPORS') {
          console.log(`[SPORS-BLE-DEBUG] 🟡 WARN: Discarding detection. No usable localName (got '${deviceName}').`)
          return
        }

        const shortId = extractedName.trim();
        if (shortId && shortId.length >= 4 && shortId !== 'unnamed') {
          bleDeviceUuid = shortId;
        } else {
          console.log(`[SPORS-BLE-DEBUG] 🟡 WARN: Discarding detection. Extracted shortId '${shortId}' is too short.`)
          return
        }
      }

      // Prevent the device from detecting its own broadcast
      if (this.currentDeviceUuid) {
        if (bleDeviceUuid === this.currentDeviceUuid || bleDeviceUuid === this.currentDeviceUuid.substring(0, 5)) {
          return // Silently discard to avoid log spam, it's normal to hear ourselves
        }
      }

      // Bug 7 fix: Check cooldown but don't set it until after the callback succeeds.
      // Use 10s cooldown for better catch rate across scan cycles.
      // This is placed here to silence log spam from the same device.
      const now = Date.now()
      const cooldown = this.recentlySeen.get(bleDeviceUuid)
      if (cooldown && now - cooldown < 10000) {
        return
      }

      console.log(`[SPORS-BLE-DEBUG] 🔵 INFO: Antenna picked up device. ID: ${device.id ?? 'unknown'}, Name: ${deviceName}, RSSI: ${device.rssi}`)
      console.log(`[SPORS-BLE-DEBUG] 🔵 INFO: ✅ Matched SPORS device! UUID/ShortID: ${bleDeviceUuid}`)

      onDeviceFound(bleDeviceUuid, rssi)
      // Set cooldown AFTER the callback, not before
      this.recentlySeen.set(bleDeviceUuid, now)
      void this.reportDetectedLostDevice(bleDeviceUuid, rssi).catch(() => {
        // If reporting fails, clear cooldown so next detection retries
        this.recentlySeen.delete(bleDeviceUuid)
      })
    })
  }

  // Bug 4 fix: Verify broadcasting flag against actual device status.
  // If the flag says we're broadcasting but there's no lost device for our user,
  // the flag is stale (e.g. user marked device found on website but flag persists).
  // Cached with 5-minute TTL to avoid adding network latency to every scan start.
  private async verifyBroadcastingFlag() {
    const modeEnabled = await this.getBroadcastingMode()
    if (!modeEnabled) {
      return
    }

    // Skip verification if checked recently (5 min TTL)
    const now = Date.now()
    if (now - this.lastBroadcastFlagVerifiedAt < BLEService.BROADCAST_FLAG_VERIFY_TTL_MS) {
      return
    }
    this.lastBroadcastFlagVerifiedAt = now

    const storedUuid = await this.getStoredBleDeviceUuid()
    if (!storedUuid) {
      // No UUID stored but broadcasting flag is set — stale flag
      console.log('[SPORS-BLE-DEBUG] 🟡 WARN: Stale broadcasting flag detected (no stored UUID). Clearing.')
      await this.setBroadcastingMode(false)
      return
    }

    console.log(`[SPORS-BLE-DEBUG] 🔵 INFO: Verifying broadcast flag for UUID: ${storedUuid}`)

    // Check if the device is still actually lost in the database
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('status')
        .eq('ble_device_uuid', storedUuid)
        .limit(1)
        .maybeSingle()

      if (error) {
        console.log(`[SPORS-BLE-DEBUG] 🔴 ERROR: Supabase query failed in verifyBroadcastingFlag. ${JSON.stringify(error)}`)
        return
      }

      if (!data) {
        console.log(`[SPORS-BLE-DEBUG] 🟡 WARN: DB reachable, but no data returned from Supabase for UUID ${storedUuid}. Keeping current state.`)
        return
      }

      const status = (data as { status: string } | null)?.status
      if (status && status !== 'lost') {
        console.log(`[SPORS-BLE-DEBUG] 🔵 INFO: Device ${storedUuid} is no longer lost (status: ${status}). Clearing broadcast flag.`)
        await this.stopBroadcasting()
      }
    } catch (e) {
      // Network error — don't clear the flag, keep current state
      console.log(`[SPORS-BLE-DEBUG] 🔴 ERROR: Exception in verifyBroadcastingFlag. ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  stopScan() {
    // NOTE: Do NOT clear recentlySeen here. The cooldown map must persist across
    // scan stop/restart cycles (throttle gaps) to prevent Supabase from being
    // queried again for the same device immediately after a scan restarts.
    if (this.manager) {
      this.manager.stopDeviceScan()
    }
  }

  async startBroadcasting(bleDeviceUuid: string) {
    await this.stopBroadcasting()

    const locationGranted = await this.ensureForegroundLocationPermission()
    if (!locationGranted) {
      console.log('[SPORS-BLE-DEBUG] 🔴 ERROR: Location permission is required to activate lost mode beacon.')
      throw new Error('Location permission is required to activate lost mode beacon.')
    }

    const broadcastGranted = await this.requestBroadcastPermissions()
    if (!broadcastGranted) {
      console.log('[SPORS-BLE-DEBUG] 🔴 ERROR: Bluetooth advertise/connect and notification permissions are required for BLE background broadcasting.')
      throw new Error('Bluetooth advertise/connect and notification permissions are required for BLE background broadcasting.')
    }

    const state = this.manager?.state ? await this.manager.state() : 'Unknown'
    console.log(`[SPORS-BLE-DEBUG] 🔵 INFO: Pre-flight broadcast check passed. BLE State: ${state}, Permissions: Granted.`)

    const normalizedUuid = this.normalizeBleUuid(bleDeviceUuid)
    if (!normalizedUuid) {
      throw new Error('Invalid BLE device UUID for broadcasting.')
    }

    if (Platform.OS !== 'android') {
      throw new Error('BLE peripheral broadcasting is currently supported only on Android in SPORS.')
    }

    await this.ensureBluetoothPoweredOn()

    await this.setStoredBleDeviceUuid(normalizedUuid)
    await this.setBroadcastingMode(true)
    const peripheralName = `${BLE_BEACON_NAME_PREFIX}${this.encodeBleUuidToBeaconToken(normalizedUuid)}`
    const manufacturerData = this.encodeBleUuidForManufacturerData(normalizedUuid)

    // Truncate logic to strictly 5 characters to survive the 31-byte limit
    // We take the first 5 chars of the UUID itself, rather than the "SPORS-" prefix
    const shortId = normalizedUuid.substring(0, 5)

    try {
      await this.startForegroundBeaconService()

      await Promise.resolve(
        setServices([
          {
            uuid: APP_SERVICE_UUID_NATIVE,
            characteristics: [
              {
                uuid: normalizedUuid,
                properties: ['read'],
                value: normalizedUuid,
              },
            ],
          },
        ])
      )

      const advertisingOptions = {
        serviceUUIDs: ['5a0f5000-0000-0000-0000-000000000000'],
        localName: shortId || "SPORS",
        includeDeviceName: false,
        adOptions: {
          advertiseMode: 2, // Low Latency / High Frequency
          txPowerLevel: 3,  // High Power
          connectable: false,
          includeDeviceName: false,
        }
      };

      console.log('[SPORS-BLE-DEBUG] 🟡 Sending payload to Android:', JSON.stringify(advertisingOptions));

      await startAdvertising(advertisingOptions);

      console.log('[SPORS-BLE-DEBUG] ✅ Advertising successfully started!');

    } catch (error: any) {
      // This explicitly rips open the native Android error so it can't hide as {}
      console.log('[SPORS-BLE-DEBUG] 🔴 ERROR: Android rejected broadcast. Reason:', {
        message: error?.message || 'No message',
        code: error?.code || 'No code',
        rawError: String(error)
      });
      const message = this.getAdvertiseErrorMessage(error)
      await this.setBroadcastingMode(false)
      await Promise.resolve(stopAdvertising()).catch(() => {
        // Ignore advertiser teardown errors during failed startup.
      })
      await this.stopForegroundBeaconService().catch(() => {
        // Ignore foreground-service teardown errors during failed startup.
      })
      throw new Error(message)
    }
  }

  async startBroadcast(bleDeviceUuid: string) {
    await this.startBroadcasting(bleDeviceUuid)
  }

  async stopBroadcasting() {
    await Promise.resolve(stopAdvertising()).catch(() => {
      // Ignore advertiser stop errors when not currently advertising.
    })

    await this.stopForegroundBeaconService().catch(() => {
      // Ignore foreground service stop failures to keep shutdown idempotent.
    })

    // Clear in-memory state so nothing accidentally restarts the advertiser
    this.currentDeviceUuid = null
    await this.setBroadcastingMode(false)
  }

  // Bug 5 fix: Make stopBroadcast async so callers can await proper cleanup
  async stopBroadcast() {
    await this.stopBroadcasting()
  }

  async restoreBroadcastingFromStorage() {
    const modeEnabled = await this.getBroadcastingMode()
    if (!modeEnabled) {
      return false
    }

    let storedUuid = await this.getStoredBleDeviceUuid()
    if (!storedUuid) {
      console.log('[SPORS-BLE-DEBUG] 🟡 UUID missing from storage, fetching from Supabase...')
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user?.id) {
        const { data: device } = await supabase
          .from('devices')
          .select('ble_device_uuid')
          .eq('owner_id', authData.user.id)
          .eq('status', 'lost')
          .limit(1)
          .maybeSingle()

        if (device?.ble_device_uuid) {
          storedUuid = this.normalizeBleUuid(device.ble_device_uuid)
          console.log('[SPORS-BLE-DEBUG] 🔵 Loaded UUID for broadcast:', storedUuid)
        }
      }
    }

    if (!storedUuid) {
      return false
    }

    await this.startBroadcasting(storedUuid)
    return true
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
      const direct = this.normalizeBleUuid(matched?.[0] ?? null)
      if (direct) {
        return direct
      }

      // Backward compatibility for older packets that nested base64 content in manufacturer data.
      const nested = decodeBase64(decoded)
      const nestedMatch = nested.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)
      return this.normalizeBleUuid(nestedMatch?.[0] ?? null)
    } catch {
      return null
    }
  }

  private encodeBleUuidForManufacturerData(bleDeviceUuid: string) {
    const payload = `${BLE_MANUFACTURER_PREFIX}${bleDeviceUuid}`
    return Array.from(payload)
      .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  }

  private encodeBleUuidToBeaconToken(bleDeviceUuid: string) {
    const hex = bleDeviceUuid.replace(/-/g, '')
    let binary = ''

    for (let i = 0; i < hex.length; i += 2) {
      binary += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16))
    }

    return encodeBase64(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }

  private decodeBeaconTokenToBleUuid(token: string) {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/')
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4 || 4)) % 4)}`

    try {
      const decoded = decodeBase64(padded)
      if (decoded.length !== 16) {
        return null
      }

      const hex = Array.from(decoded)
        .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')

      const formatted = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
      return this.normalizeBleUuid(formatted)
    } catch {
      return null
    }
  }

  private readBleUuidFromBeaconName(deviceName?: string | null) {
    if (!deviceName) {
      return null
    }

    const trimmed = deviceName.trim()
    const tokenMatch = trimmed.match(/^SPORS-([A-Za-z0-9_-]{22})$/)
    if (tokenMatch?.[1]) {
      return this.decodeBeaconTokenToBleUuid(tokenMatch[1])
    }

    const rawUuidMatch = trimmed.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)
    return this.normalizeBleUuid(rawUuidMatch?.[0] ?? null)
  }

  private readBleUuidFromAdvertisement(device: { localName?: string | null; name?: string | null; manufacturerData?: string | null }) {
    const fromManufacturer = this.readBleUuidFromManufacturerData(device.manufacturerData)
    if (fromManufacturer) {
      return fromManufacturer
    }

    return this.readBleUuidFromBeaconName(device.localName ?? device.name)
  }
}

export const bleService = new BLEService()
