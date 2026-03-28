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
import { enableBackgroundBleScanTask } from '../services/backgroundBleTask'
import { bleService } from '../services/ble.service'
import '../services/backgroundBleTask'

function AuthGate() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!session) {
      return
    }

    void enableBackgroundBleScanTask()
    void bleService.requestScanPermissions()
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