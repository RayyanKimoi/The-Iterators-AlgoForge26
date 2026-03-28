import { useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'

import { Colors } from '../../constants/colors'
import { FontFamily } from '../../constants/typography'
import { StatusBadge } from '../ui/StatusBadge'

type DeviceCardProps = {
  id: string
  make: string
  model: string
  imei: string
  status: 'registered' | 'lost' | 'found' | 'recovered' | 'stolen'
  onPress?: (id: string) => void
}

const statusToBadge = {
  registered: { type: 'safe', label: 'SAFE' },
  recovered: { type: 'safe', label: 'RECOVERED' },
  found: { type: 'warning', label: 'FOUND' },
  lost: { type: 'lost', label: 'LOST' },
  stolen: { type: 'lost', label: 'STOLEN' },
} as const

export function DeviceCard({ id, make, model, imei, status, onPress }: DeviceCardProps) {
  const badge = statusToBadge[status]
  const imeiTail = imei.length > 4 ? imei.slice(-4) : imei
  const scale = useRef(new Animated.Value(1)).current

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      damping: 16,
      stiffness: 220,
      mass: 0.65,
    }).start()
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={styles.card}
        onPress={() => onPress?.(id)}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
      >
        <View style={styles.iconWrap}>
          <MaterialIcons name="smartphone" size={24} color={Colors.primary} />
        </View>

        <StatusBadge type={badge.type} label={badge.label} />

        <View style={styles.info}>
          <Text style={styles.name}>{`${make} ${model}`}</Text>
          <Text style={styles.imei}>{`IMEI •••• ${imeiTail}`}</Text>
        </View>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    width: 200,
    padding: 16,
    gap: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceVariant,
  },
  info: {
    marginTop: 6,
  },
  name: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingBold,
    fontSize: 16,
    marginBottom: 4,
  },
  imei: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
    letterSpacing: 0.6,
  },
})