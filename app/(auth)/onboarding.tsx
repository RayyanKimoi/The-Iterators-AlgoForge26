import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { Colors } from '../../constants/colors'
import { FontFamily } from '../../constants/typography'
import { GradientButton } from '../../components/ui/GradientButton'

type StepItem = {
  id: string
  icon: keyof typeof MaterialIcons.glyphMap
  title: string
  body: string
}

const STEPS: StepItem[] = [
  {
    id: '1',
    icon: 'security',
    title: 'Your Phone. Your Identity.',
    body: 'Link your device to your Aadhaar identity - impossible to fake, impossible to steal.',
  },
  {
    id: '2',
    icon: 'bluetooth-searching',
    title: 'Found Even When Off',
    body: "BLE beacons broadcast silently. Nearby SPORS users detect and report your phone's location automatically.",
  },
  {
    id: '3',
    icon: 'public',
    title: 'A Network That Grows',
    body: 'Every SPORS user secretly helps find lost devices. The more people join, the stronger the net.',
  },
]

function PulseIcon({ name }: { name: keyof typeof MaterialIcons.glyphMap }) {
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    )

    anim.start()

    return () => {
      anim.stop()
    }
  }, [pulse])

  return (
    <View style={styles.pulseWrap}>
      {[0.2, 0.5, 0.8].map((phase) => (
        <Animated.View
          key={phase}
          style={[
            styles.pulseRing,
            {
              opacity: pulse.interpolate({
                inputRange: [0, phase, 1],
                outputRange: [0, 0.35, 0],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, phase, 1],
                    outputRange: [0.8, 1, 1.35],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
      <View style={styles.pulseIconCircle}>
        <MaterialIcons name={name} size={64} color={Colors.primary} />
      </View>
    </View>
  )
}

export default function OnboardingScreen() {
  const router = useRouter()
  const listRef = useRef<FlatList<StepItem>>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const { width } = useWindowDimensions()

  const onNext = () => {
    if (activeIndex < STEPS.length - 1) {
      listRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      })
    }
  }

  const renderItem = ({ item }: ListRenderItemInfo<StepItem>) => {
    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.heroCard}>
          <PulseIcon name={item.icon} />
        </View>

        <View style={styles.contentWrap}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.skipButton} onPress={() => router.navigate('/(auth)/sign-up')}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={STEPS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width)
          setActiveIndex(index)
        }}
      />

      <View style={styles.bottomArea}>
        <View style={styles.dots}>
          {STEPS.map((step, index) => (
            <View key={step.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>

        {activeIndex === STEPS.length - 1 ? (
          <View style={styles.dualButtons}>
            <GradientButton
              title="Create Account"
              onPress={() => router.navigate('/(auth)/sign-up')}
              rightIcon={<MaterialIcons name="arrow-forward" size={22} color={Colors.onPrimary} />}
            />
            <Pressable
              style={styles.signInButton}
              onPress={() => router.navigate('/(auth)/sign-in')}
            >
              <Text style={styles.signInButtonText}>Already have an account? </Text>
              <Text style={styles.signInButtonLink}>Sign In</Text>
            </Pressable>
          </View>
        ) : (
          <GradientButton
            title="Next"
            onPress={onNext}
            rightIcon={<MaterialIcons name="arrow-forward" size={22} color={Colors.onPrimary} />}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 18,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 17,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  heroCard: {
    height: '40%',
    borderRadius: 28,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pulseWrap: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 230,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  pulseIconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrap: {
    flex: 1,
    paddingTop: 34,
    gap: 18,
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingBold,
    fontSize: 21,
    lineHeight: 30,
  },
  body: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 17.5,
    lineHeight: 27,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 20,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: Colors.outlineVariant,
  },
  dotActive: {
    width: 28,
    backgroundColor: Colors.primary,
  },
  dualButtons: {
    gap: 12,
  },
  signInButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  signInButtonText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 15,
  },
  signInButtonLink: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
  },
})