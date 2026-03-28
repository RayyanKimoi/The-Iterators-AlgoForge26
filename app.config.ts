import type { ExpoConfig } from 'expo/config'

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

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
    config: googleMapsApiKey
      ? {
          googleMaps: {
            apiKey: googleMapsApiKey,
          },
        }
      : undefined,
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
      projectId: 'f31caf0c-76e5-4d16-878a-7b0df14fde68',
    },
  },
}

export default config
