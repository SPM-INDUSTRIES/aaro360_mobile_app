import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator, Dimensions } from 'react-native'
import { resolveImageUrl } from '../../src/utils/imageUrl'
import { useRouter, Stack, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Theme } from '../../src/styles/theme'
import { ProductCategory } from '../../src/types/product'
import { Skeleton } from '../../src/components/SkeletonLoader'

const { width: screenWidth } = Dimensions.get('window')

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
      <View>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.restaurantCard}>
            <Skeleton height={160} borderRadius={0} />
            <View style={styles.restaurantInfo}>
              <View style={styles.logoContainer}>
                <Skeleton width={60} height={60} borderRadius={30} />
              </View>
              <View style={styles.restaurantDetails}>
                <Skeleton width="60%" height={20} style={{ marginBottom: 10 }} />
                <Skeleton width="80%" height={14} style={{ marginBottom: 6 }} />
                <Skeleton width="40%" height={14} />
              </View>
            </View>
          </View>
        ))}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
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

      {/* Search Bar */}
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
            {filteredRestaurants.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                style={styles.restaurantCard}
                onPress={() => router.push(`/restaurant/${restaurant.id}`)}
              >
                <View style={styles.cardCoverContainer}>
                  {restaurant.coverImageUrl ? (
                    <Image
                      source={{ uri: resolveImageUrl(restaurant.coverImageUrl) ?? restaurant.coverImageUrl }}
                      style={styles.coverImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.coverImage, styles.placeholderCover]}>
                      <Text style={styles.placeholderEmoji}>{category === ProductCategory.FOOD ? '🍕' : '🛒'}</Text>
                    </View>
                  )}
                  {/* Overlay for Better Text Visibility if needed */}
                  <View style={styles.cardOverlay} />
                </View>

                <View style={styles.restaurantInfo}>
                  <View style={styles.logoContainer}>
                    {restaurant.logoUrl ? (
                      <Image
                        source={{ uri: resolveImageUrl(restaurant.logoUrl) ?? restaurant.logoUrl }}
                        style={styles.logo}
                      />
                    ) : (
                      <View style={[styles.logo, styles.placeholderLogo]}>
                        <Text style={styles.logoEmoji}>{restaurant.name.charAt(0)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.restaurantDetails}>
                    <Text style={styles.restaurantName} numberOfLines={2}>{restaurant.name}</Text>
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
                </View>
              </TouchableOpacity>
            ))}

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
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.deepBlue,
  },
  searchContainer: {
    padding: Theme.spacing.md,
    backgroundColor: 'transparent',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.small,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: Theme.colors.textDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.md,
    paddingTop: 0,
  },
  restaurantCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.xl,
    marginBottom: 20,
    overflow: 'hidden',
    ...Theme.shadows.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardCoverContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    backgroundColor: Theme.colors.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  restaurantInfo: {
    flexDirection: 'row',
    padding: 15,
    paddingTop: 40,
    alignItems: 'flex-start',
    position: 'relative',
  },
  logoContainer: {
    position: 'absolute',
    top: -30,
    left: 15,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  placeholderLogo: {
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 24,
    color: Theme.colors.white,
    fontWeight: 'bold',
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.deepBlue,
    marginBottom: 6,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  restaurantAddress: {
    fontSize: 13,
    color: Theme.colors.textGray,
    fontWeight: '500',
    flex: 1,
  },
  restaurantPhone: {
    fontSize: 13,
    color: Theme.colors.textGray,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.deepBlue,
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: Theme.colors.textGray,
    marginTop: 5,
    fontWeight: '500',
  },
})
