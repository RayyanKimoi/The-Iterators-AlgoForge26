import 'expo-dev-client'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans'
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono'
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora'

import { Colors } from '../constants/colors'
import { AuthProvider, useAuth } from '../hooks/useAuth'
import { syncBackgroundBleScanTask } from '../services/backgroundBleTask'
import { bleService } from '../services/ble.service'
import { supabase } from '../lib/supabase'
import '../services/backgroundBleTask'

function AuthGate() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!session) {
      return
    }

    let cancelled = false
    const bootstrapBleBackground = async () => {
      try {
        await bleService.requestScanPermissions()

        // Task 3: Proactively sync the device UUID from Supabase into AsyncStorage
        // so broadcasting never falls back to the generic "SPORS" name.
        try {
          const { data: authData } = await supabase.auth.getUser()
          if (authData?.user?.id) {
            const { data: deviceRow } = await supabase
              .from('devices')
              .select('ble_device_uuid')
              .eq('owner_id', authData.user.id)
              .limit(1)
              .maybeSingle()

            if (deviceRow?.ble_device_uuid) {
              await bleService.setStoredBleDeviceUuid(deviceRow.ble_device_uuid)
              console.log('[SPORS-AUTH] 🔵 Synced device UUID to AsyncStorage on login/boot:', deviceRow.ble_device_uuid)
            }
          }
        } catch (syncError) {
          console.warn('[SPORS-AUTH] ⚠️ Device UUID sync failed (non-fatal):', syncError)
        }

        const broadcasting = await bleService.isBroadcastingMode()
        if (cancelled) {
          return
        }

        if (broadcasting) {
          await bleService.restoreBroadcastingFromStorage().catch(() => {
            // Ignore restore failures here; manual restart can still occur from registration flow.
          })
        }
        await syncBackgroundBleScanTask()
      } catch (error) {
        // Log error but allow app to render - background service failures should not crash the UI
        console.error('[SPORS] BLE bootstrap failed (non-fatal):', error)
      }
    }

    void bootstrapBleBackground()

    return () => {
      cancelled = true
    }
  }, [session])

  useEffect(() => {
    if (loading) {
      return
    }

    const currentGroup = segments[0]
    const inAuthGroup = currentGroup === '(auth)'
    const inTabsGroup = currentGroup === '(tabs)'
    const inDeviceGroup = currentGroup === 'device'
    const inTrackerGroup = currentGroup === 'tracker'
    const inChatGroup = currentGroup === 'chat'
    const inVerifyScreen = currentGroup === 'verify'
    const inSettingsScreen = currentGroup === 'settings'

    if (
      (inTabsGroup || inDeviceGroup || inTrackerGroup || inChatGroup || inVerifyScreen || inSettingsScreen) &&
      !session
    ) {
      router.replace('/(auth)/onboarding')
      return
    }

    if (inAuthGroup && session) {
      router.replace('/(tabs)')
    }
  }, [loading, router, segments, session])

  return <Slot />
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_700Bold,
    Sora_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    JetBrainsMono_500Medium,
  })

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" backgroundColor={Colors.background} />
        <ActivityIndicator color={Colors.inversePrimary} size="large" />
      </View>
    )
  }

  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <AuthGate />
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
})