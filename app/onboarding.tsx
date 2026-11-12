import { useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Theme } from '../src/styles/theme'
import { useAppDispatch } from '../src/store/store'
import { completeOnboarding } from '../src/store/slices/uiSlice'

const { width } = Dimensions.get('window')

type Slide = {
  key: string
  icon: keyof typeof Ionicons.glyphMap
  accent: string
  title: string
  subtitle: string
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    icon: 'sparkles',
    accent: Theme.colors.primary,
    title: 'Welcome to Aaro360',
    subtitle:
      'Your everyday super app. Food, groceries, and medicine delivered to your door — all in one place.',
  },
  {
    key: 'food',
    icon: 'restaurant',
    accent: '#fa6521',
    title: 'Food, delivered fast',
    subtitle:
      'Browse local restaurants, explore menus by category, and order your favourite meals in a few taps.',
  },
  {
    key: 'grocery',
    icon: 'basket',
    accent: '#16A34A',
    title: 'Groceries & essentials',
    subtitle:
      'Stock up on daily groceries and household essentials with fast, reliable delivery.',
  },
  {
    key: 'pharmacy',
    icon: 'medkit',
    accent: '#2563EB',
    title: 'Medicine to your door',
    subtitle:
      'Order medicine and health products and have them delivered discreetly to your home.',
  },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const scrollRef = useRef<ScrollView>(null)
  const [index, setIndex] = useState(0)

  const isLast = index === SLIDES.length - 1

  const finish = async () => {
    await dispatch(completeOnboarding())
    router.replace('/(tabs)/')
  }

  const handleNext = () => {
    if (isLast) {
      finish()
      return
    }
    const next = index + 1
    scrollRef.current?.scrollTo({ x: next * width, animated: true })
    setIndex(next)
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width)
    if (newIndex !== index) setIndex(newIndex)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={finish} style={styles.skipBtn} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide) => (
          <View key={slide.key} style={[styles.slide, { width }]}>
            <LinearGradient
              colors={[slide.accent + '22', slide.accent + '08']}
              style={styles.iconCircle}
            >
              <Ionicons name={slide.icon} size={88} color={slide.accent} />
            </LinearGradient>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.dot,
              i === index ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
    height: 44,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.textGray,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Theme.colors.deepBlue,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: Theme.colors.textGray,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Theme.colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#E0E0E0',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: Theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
})
