import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Tabs } from 'expo-router'
import { Platform, StyleSheet, View } from 'react-native'

import { Colors } from '../../constants/colors'
import { FontFamily } from '../../constants/typography'
import { useSubscription } from '../../hooks/useSubscription'

type TabIconProps = {
  focused: boolean
  active: keyof typeof MaterialIcons.glyphMap
  inactive: keyof typeof MaterialIcons.glyphMap
}

function TabIcon({ focused, active, inactive }: TabIconProps) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <MaterialIcons
        name={focused ? active : inactive}
        size={24}
        color={focused ? Colors.accent : Colors.outline}
      />
    </View>
  )
}

export default function TabsLayout() {
  const { planId } = useSubscription()
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.outline,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="home" inactive="home" />
          ),
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="smartphone" inactive="smartphone" />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="forum" inactive="chat-bubble-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="notifications" inactive="notifications-none" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="person" inactive="person-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: 'Family',
          href: planId === 'premium' ? '/family' : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="supervisor-account" inactive="supervisor-account" />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    elevation: 0,
  },
  tabBarItem: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  tabBarIcon: {
    marginBottom: 2,
  },
  tabBarLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    marginTop: 2,
  },
  iconPill: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: 'rgba(61,142,255,0.15)',
  },
})