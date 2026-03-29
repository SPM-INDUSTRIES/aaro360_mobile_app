import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator, Dimensions } from 'react-native'
import { resolveImageUrl } from '../../src/utils/imageUrl'
import { useRouter, Stack, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Theme } from '../../src/styles/theme'
import { ProductCategory } from '../../src/types/product'
import { Skeleton, SkeletonProvider } from '../../src/components/SkeletonLoader'
import FloatingCartButton from '../../src/components/FloatingCartButton'
import { rs, rf, wp, hp } from "../../src/utils/responsive"

interface Restaurant {
  id: number
  name: string
  logoUrl?: string
  coverImageUrl?: string
  address?: string
  phone?: string
  isActive: boolean
  type: string
}

export default function AllRestaurantsScreen() {
  const router = useRouter()
  const { category } = useLocalSearchParams<{ category: string }>()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const getTitle = () => {
    if (category === ProductCategory.FOOD) return 'Restaurants'
    if (category === ProductCategory.GROCERY) return 'Grocery Stores'
    return 'All Partners'
  }

  useEffect(() => {
    fetchRestaurants()
  }, [category])

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      const vendorType = category === ProductCategory.FOOD ? 'restaurant' : category === ProductCategory.GROCERY ? 'grocery_store' : 'all'
      const url = `${process.env.EXPO_PUBLIC_API_URL}/vendors${vendorType !== 'all' ? `?type=${vendorType}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      setRestaurants(Array.isArray(data) ? data : data.data || [])
    } catch (error) {
      console.error('Failed to fetch restaurants:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) && restaurant.isActive
  )

  const renderSkeleton = () => {
    return (
      <SkeletonProvider>
        <View style={styles.list}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.restaurantCard}>
              <Skeleton width={56} height={56} borderRadius={28} />
              <View style={styles.cardContent}>
                <Skeleton width="70%" height={18} style={{ marginBottom: 8 }} />
                <Skeleton width="90%" height={14} style={{ marginBottom: 4 }} />
                <Skeleton width="50%" height={12} />
              </View>
            </View>
          ))}
        </View>
      </SkeletonProvider>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Theme.colors.textGray} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${getTitle().toLowerCase()}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Theme.colors.textGray}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? renderSkeleton() : (
          <>
            <View style={styles.list}>
              {filteredRestaurants.map((restaurant) => (
                <TouchableOpacity
                  key={restaurant.id}
                  style={styles.restaurantCard}
                  onPress={() => router.push(`/restaurant/${restaurant.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.logoContainer}>
                    {restaurant.logoUrl ? (
                      <Image
                        source={{ uri: resolveImageUrl(restaurant.logoUrl) ?? restaurant.logoUrl }}
                        style={styles.logo}
                      />
                    ) : (
                      <View style={styles.placeholderLogo}>
                        <Text style={styles.logoEmoji}>{restaurant.name.charAt(0)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
                    <View style={styles.metaInfo}>
                      <Ionicons name="location-outline" size={14} color={Theme.colors.textGray} />
                      <Text style={styles.restaurantAddress} numberOfLines={1}>
                        {restaurant.address || 'Location not available'}
                      </Text>
                    </View>
                    {restaurant.phone && (
                      <View style={styles.metaInfo}>
                        <Ionicons name="call-outline" size={14} color={Theme.colors.textGray} />
                        <Text style={styles.restaurantPhone}>{restaurant.phone}</Text>
                      </View>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={Theme.colors.textGray} />
                </TouchableOpacity>
              ))}
            </View>

            {filteredRestaurants.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={64} color={Theme.colors.textGray} />
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <FloatingCartButton />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 10,
    backgroundColor: Theme.colors.white,
    ...Theme.shadows.small,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: '800',
    color: Theme.colors.deepBlue,
  },
  searchContainer: {
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.backgroundLight,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: 15,
    height: 48,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: Theme.colors.textDark,
  },
  content: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundLight,
  },
  scrollContent: {
    padding: Theme.spacing.md,
  },
  list: {
    gap: 12,
  },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.small,
  },
  logoContainer: {
    marginRight: 12,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  placeholderLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 22,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  cardContent: {
    flex: 1,
  },
  restaurantName: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '700',
    color: Theme.colors.deepBlue,
    marginBottom: 4,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  restaurantAddress: {
    fontSize: 13,
    color: Theme.colors.textGray,
    fontWeight: '500',
    flex: 1,
    marginLeft: 4,
  },
  restaurantPhone: {
    fontSize: 13,
    color: Theme.colors.textGray,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: '700',
    color: Theme.colors.deepBlue,
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: rf(Theme.fontSize.md),
    color: Theme.colors.textGray,
    marginTop: 5,
    fontWeight: '500',
  },
})
