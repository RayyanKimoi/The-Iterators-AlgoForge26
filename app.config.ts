import type { ExpoConfig } from 'expo/config'
import { withAndroidManifest, ConfigPlugin, AndroidConfig } from '@expo/config-plugins'
import dotenv from 'dotenv'
const envConfig = dotenv.config().parsed || {}

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || envConfig.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''

// Custom plugin to inject foregroundServiceType for Android 14+ compatibility
const withForegroundServiceType: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest)
    
    const services = application.service || []
    for (const service of services) {
      const serviceName = service.$?.['android:name']
      if (serviceName === 'com.voximplant.foregroundservice.VIForegroundService') {
        service.$['android:foregroundServiceType'] = 'connectedDevice|location'
      }
    }
    
    return modConfig
  })
}

// Custom plugin to inject Google Maps API Key securely
const withGoogleMapsApiKey: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest)
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      'com.google.android.geo.API_KEY',
      googleMapsApiKey
    )
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      'DEBUG_PLUGIN_WORKED',
      'YES'
    )
    return modConfig
  })
}

const config: ExpoConfig = {
  name: 'SPORS',
  slug: 'spors',
  scheme: 'spors',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#111318',
  },
  ios: {
    bundleIdentifier: 'com.spors.app',
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'SPORS uses location while scanning to report nearby lost devices securely.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'SPORS may use location in the background to keep lost device tracking accurate.',
    },
  },
  android: {
    package: 'com.spors.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
    permissions: [
      'BLUETOOTH',
      'BLUETOOTH_ADMIN',
      'BLUETOOTH_SCAN',
      'BLUETOOTH_ADVERTISE',
      'BLUETOOTH_CONNECT',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_CONNECTED_DEVICE',
      'POST_NOTIFICATIONS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.WAKE_LOCK',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    '@react-native-community/datetimepicker',
    'expo-background-fetch',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow SPORS to access location for continuous lost-device tracking.',
        locationWhenInUsePermission:
          'Allow SPORS to access location while scanning for nearby devices.',
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    [
      'react-native-ble-plx',
      {
        isBackgroundEnabled: true,
        modes: ['central'],
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
        },
      },
    ],
    [
      'react-native-maps',
      {
        googleMapsApiKey: googleMapsApiKey,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '12a607eb-b291-4e94-a1b2-b847363f228c',
    },
  },
}

export default withGoogleMapsApiKey(withForegroundServiceType(config))
