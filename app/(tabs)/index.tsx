import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Dimensions, Linking, RefreshControl, FlatList } from 'react-native'
import { resolveImageUrl } from '../../src/utils/imageUrl'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { CategoryType } from '../../src/types'
import { Product, ProductCategory } from '../../src/types/product'
import { productApi } from '../../src/lib/productApi'
import { offerApi, Offer } from '../../src/lib/offerApi'
import { vendorApi, foodItemApi, foodCategoryApi } from '../../src/lib/api'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Theme } from '../../src/styles/theme'
import { Skeleton, SkeletonProvider } from '../../src/components/SkeletonLoader'
import { useAppSelector } from '../../src/store/store'
import { rs, rf, wp, hp, screen } from '../../src/utils/responsive'
import * as Location from 'expo-location'

const { width: screenWidth } = Dimensions.get('window')

const CATEGORY_IMAGES = {
  food: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrG6EiJtRE-UD0dHNIaTYxPj9Nk6IJwYuYZsGA_TuIuYiEVA4AcOaKnFhZh2wzn4WnVkugKuPMkPvvrVSrrc2LcPE3h3NwbKXZIiLt-plEw2NWkMNmZmoeJBePOgF_SnO-fViHPZ0QPrS7GHl5d50JjXsA6LN_RbVEHEJpmK6fYPJwr6SlzMaP7SBQOV2x_Hs8CqYXs8lsRfOfs7KmgR3oUxpp5SRKlC2gvS8ClGR5p24Bk8Hp_0GAUWCxZoszdofVvTz29Ki3w_M',
  grocery: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAh5KhA7wlBHXT036Ppc0UaeLdDZ6aUife-IooFekiUwjqecP3SAD7ni-w68I2QmKD4vOk5M0-VW5sUJRlOXIOuFOUwBi0M--zxUac0FcL1HBCxu-S5AiJXhZPk1e8dwus8_gwx1yPnz-6dMqKfTx4ot6M35BRx5hCynrJtGqg1N16xAEhJvZjqXEWPKCyeCXnAacqCQVG3dqCVRiCcF5L5Cj8iJsoo-vc9dnQtTDi2LbseV0_4Nk64dPum1SrHbGldyqtZ8Avdl7w',
  pharmacy: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNitAlF2bLTNsFYZFlFJsJYN8ZBkbmubIuB0jSJfXd8QDkztWQa9bRQExvm-Sfxk429IAFWTSIancThPK9S5d_Bx05IWd4vX57Thl116w4p03TOd-sqpVeicLThr_r7o0mUHROVsKp9YJ5CAjw7atT1f9IOQKIXqqCis9-Yn-gC64rSAuPg50Zgiecf2HNzKXqqI7qEyGrcDK8M_iVWwaA-9H5Yg5CaABfBYShHMIxY7ThFmeufn7ogjLSPiOA-cOWOWtjOpScZDQ',
}

const FOOD_CATEGORY_PLACEHOLDERS: Record<string, string> = {
  'appetizers': 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&h=300&fit=crop',
  'breakfast': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop',
  'briyani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
  'biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
  'curry': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  'rice': 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&h=300&fit=crop',
  'noodles': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',
  'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  'sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  'dessert': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop',
  'drinks': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop',
  'beverages': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop',
  'seafood': 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&h=300&fit=crop',
  'chicken': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop',
  'kottu': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop',
  'default': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
}

const categories = [
  { id: 1, name: 'Food', type: CategoryType.FOOD, apiType: ProductCategory.FOOD, imageUrl: CATEGORY_IMAGES.food, iconName: 'restaurant', bgColor: '#FFF7ED' },
  { id: 2, name: 'Grocery', type: CategoryType.GROCERY, apiType: ProductCategory.GROCERY, imageUrl: CATEGORY_IMAGES.grocery, iconName: 'cart', bgColor: '#F0FDF4' },
  { id: 3, name: 'eChannelling', type: CategoryType.ECHANELLING, apiType: ProductCategory.ECHANELLING, iconName: 'calendar', bgColor: '#F0FDFA' },
  { id: 4, name: 'Pharmacy', type: CategoryType.MEDICINE, apiType: ProductCategory.MEDICINE, imageUrl: CATEGORY_IMAGES.pharmacy, iconName: 'medkit', bgColor: '#EFF6FF' },
  { id: 5, name: 'Vehicle', type: CategoryType.VEHICLE, apiType: ProductCategory.VEHICLE, iconName: 'car', bgColor: '#FEFCE8' },
]

interface Vendor {
  id: number
  name: string
  type: string
  logoUrl?: string
  coverImageUrl?: string
  address?: string
  phone?: string
  isActive: boolean
  averageRating?: number
  city?: string
}

interface FoodCategory {
  id: number
  name: string
  type: string
  imageUrl?: string
  isActive: boolean
}

export default function HomeScreen() {
  const router = useRouter()
  const { user } = useAppSelector((state) => state.auth)
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(ProductCategory.FOOD)
  const [trendingBrands, setTrendingBrands] = useState<Vendor[]>([])
  const [allOffers, setAllOffers] = useState<Product[]>([])
  const [bestOffers, setBestOffers] = useState<Product[]>([])
  const [specialOffers, setSpecialOffers] = useState<Offer[]>([])
  const [hospitals, setHospitals] = useState<Vendor[]>([])
  const [foodCategories, setFoodCategories] = useState<FoodCategory[]>([])
  const [loading, setLoading] = useState(false)
  const offersScrollRef = useRef<ScrollView>(null)
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [userCity, setUserCity] = useState<string>('your location')

  const CATEGORY_CACHE_TTL = 5 * 60 * 1000
  const OFFERS_CACHE_TTL = 10 * 10 * 1000

  useEffect(() => {
    fetchInitialData()
    fetchUserLocation()
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchInitialData()
    }, [])
  )

  useEffect(() => {
    if (selectedCategory) {
      fetchCategoryData(selectedCategory)
    }
  }, [selectedCategory])

  const fetchUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({})
        const addresses = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        })
        if (addresses[0]?.city) {
          setUserCity(addresses[0].city)
        } else if (user?.city) {
          setUserCity(user.city)
        }
      } else if (user?.city) {
        setUserCity(user.city)
      }
    } catch (error) {
      if (user?.city) {
        setUserCity(user.city)
      }
    }
  }

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const offers = await offerApi.getActive()
      setSpecialOffers(offers || [])
    } catch (error) {
      console.error('Failed to fetch initial data:', error)
      setSpecialOffers([])
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      const offers = await offerApi.getActive()
      setSpecialOffers(offers || [])

      if (selectedCategory) {
        await fetchCategoryData(selectedCategory)
      }
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const fetchCategoryData = async (category: ProductCategory) => {
    try {
      setLoading(true)

      if (category === ProductCategory.ECHANELLING) {
        const res = await vendorApi.getAll({ type: 'pharmacy' })
        const vendors = res.data
        setHospitals(Array.isArray(vendors) ? vendors : vendors?.data || [])
        setTrendingBrands([])
        setAllOffers([])
        setBestOffers([])
        setFoodCategories([])
      } else if (category === ProductCategory.FOOD || category === ProductCategory.GROCERY) {
        const vendorType = category === ProductCategory.FOOD ? 'restaurant' : 'grocery_store'

        const vendorsRes = await vendorApi.getAll({ type: vendorType })
        const vendorsData = vendorsRes.data
        setTrendingBrands(Array.isArray(vendorsData) ? vendorsData : vendorsData?.data || [])

        if (category === ProductCategory.FOOD) {
          const categoriesRes = await foodCategoryApi.getAll({ type: 'food' })
          const categoriesData = categoriesRes.data
          setFoodCategories(Array.isArray(categoriesData) ? categoriesData.filter((cat: FoodCategory) => cat.isActive) : [])
        } else {
          setFoodCategories([])
        }

        let allProducts: Product[] = []

        try {
          const foodItemsRes = await foodItemApi.getAll()
          const foodItemsData = foodItemsRes.data
          const foodItems = Array.isArray(foodItemsData) ? foodItemsData : foodItemsData?.data || []
          const categoryType = category === ProductCategory.FOOD ? 'food' : 'grocery'
          const filteredItems = foodItems.filter((item: any) =>
            item.category?.type === categoryType && item.isAvailable
          )
          const itemsAsProducts: Product[] = filteredItems.map((item: any) => ({
            id: `food-${item.id}`,
            name: item.name,
            description: item.description || '',
            category: category as ProductCategory,
            subCategory: item.category?.name || '',
            price: Number(item.price) || 0,
            brand: '',
            restaurant: item.restaurant?.name || '',
            vendorId: item.restaurantId,
            location: item.restaurant?.address || '',
            mainImage: item.imageUrl || '',
            images: [],
            stock: item.quantity || (item.isAvailable ? 1 : 0),
            inStock: item.isAvailable && (item.quantity || 0) > 0,
            isActive: item.isAvailable,
            tags: [],
            isFeatured: false,
            discountPrice: undefined,
            reviewCount: 0,
            averageRating: 0,
            orderCount: Number(item.orders_count || item.orderCount) || 0,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }))
          allProducts = [...itemsAsProducts]
        } catch (error) {
          if (__DEV__) console.error(`Failed to fetch ${category} items:`, error)
        }

        try {
          const productsResponse = await productApi.getAll({
            category: category as ProductCategory,
          })
          const productsFromTable = productsResponse.data || []
          allProducts = [...allProducts, ...productsFromTable]
        } catch (error) {
          if (__DEV__) console.error('Failed to fetch products:', error)
        }

        const uniqueProducts = allProducts.filter((product, index, self) =>
          index === self.findIndex((p) => p.id === product.id)
        )

        const sortedProducts = uniqueProducts.sort((a, b) =>
          (b.orderCount || 0) - (a.orderCount || 0)
        )

        setAllOffers(sortedProducts)
        setBestOffers(sortedProducts.slice(0, 5))
      } else {
        setTrendingBrands([])
        setAllOffers([])
        setBestOffers([])
        setFoodCategories([])
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to fetch category data:', error)
      setTrendingBrands([])
      setAllOffers([])
      setBestOffers([])
      setHospitals([])
      setFoodCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryPress = (category: ProductCategory) => {
    setSelectedCategory(category)
  }

  const handleCallHospital = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`)
    }
  }

  const handleOfferScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(contentOffsetX / (wp(90)))
    setCurrentOfferIndex(index)
  }

  const getFilteredOffers = (): Offer[] => {
    if (!specialOffers || specialOffers.length === 0) {
      return []
    }

    return specialOffers.filter((offer) => {
      if (!offer.linkType || offer.linkType === 'carousel' || offer.linkType === 'general') {
        return true
      }

      const type = offer.linkType.toLowerCase()

      if (selectedCategory === ProductCategory.FOOD) {
        return type.includes('food') || type.includes('restaurant')
      } else if (selectedCategory === ProductCategory.GROCERY) {
        return type.includes('grocery') || type.includes('store')
      } else if (selectedCategory === ProductCategory.MEDICINE || selectedCategory === ProductCategory.ECHANELLING) {
        return type.includes('medicine') || type.includes('pharmacy') || type.includes('hospital') || type.includes('doctor')
      } else if (selectedCategory === ProductCategory.VEHICLE) {
        return type.includes('vehicle') || type.includes('car') || type.includes('bike')
      }

      return false
    })
  }

  const handleOfferClick = (offer: Offer) => {
    console.log('Offer clicked:', offer.title, 'linkType:', offer.linkType, 'linkId:', offer.linkId)
    
    if (!offer.linkType || !offer.linkId) {
      console.log('No linkType or linkId, checking linkUrl:', offer.linkUrl)
      if (offer.linkUrl) {
        Linking.openURL(offer.linkUrl)
      } else {
        console.log('No navigation possible for offer:', offer.id)
      }
      return
    }

    const linkType = offer.linkType.toLowerCase()
    const linkId = String(offer.linkId)

    console.log('Navigating with linkType:', linkType, 'linkId:', linkId)

    if (linkType === 'food_restaurant') {
      router.push(`/restaurant/${linkId}`)
    } else if (linkType === 'food_item') {
      router.push(`/food-item/${linkId}`)
    } else if (linkType === 'grocery_product' || linkType === 'medicine_product') {
      router.push(`/product/${linkId}`)
    } else if (linkType === 'category') {
      router.push(`/food-category/${linkId}`)
    } else if (linkType === 'external' && offer.linkUrl) {
      Linking.openURL(offer.linkUrl)
    } else if (offer.linkUrl) {
      Linking.openURL(offer.linkUrl)
    } else {
      console.log('Unknown linkType:', linkType)
    }
  }

  const renderSpecialOffersCarousel = () => {
    const filteredOffers = getFilteredOffers()

    if (loading && specialOffers.length === 0) {
      return (
        <SkeletonProvider>
          <View style={styles.specialOffersSection}>
            <View style={styles.sectionHeader}>
              <Skeleton width={150} height={20} />
              <Skeleton width={60} height={16} />
            </View>
            <View style={{ paddingHorizontal: 20 }}>
              <Skeleton width={screenWidth - 40} height={150} borderRadius={Theme.borderRadius.xl} />
            </View>
          </View>
        </SkeletonProvider>
      )
    }

    if (filteredOffers.length === 0) return null

    const offerColors = ['#fa6521', '#1a4968', '#059669', '#7c3aed']

    return (
      <View style={styles.specialOffersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Special Offers</Text>
          <TouchableOpacity onPress={() => router.push({
            pathname: '/special-offers',
            params: { category: selectedCategory }
          })}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          ref={offersScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleOfferScroll}
          style={styles.offersCarousel}
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}
          snapToInterval={wp(90) + 15}
          decelerationRate="fast"
        >
          {filteredOffers.map((offer, index) => {
            const bgColor = offerColors[index % offerColors.length]
            return (
              <TouchableOpacity
                key={offer.id}
                style={[styles.offerCard, { backgroundColor: bgColor }]}
                onPress={() => handleOfferClick(offer)}
                activeOpacity={0.9}
              >
                <View style={styles.offerTextSection}>
                  {offer.title && (
                    <Text style={styles.offerTitle} numberOfLines={2}>{offer.title}</Text>
                  )}
                  {offer.description && (
                    <Text style={styles.offerDescription} numberOfLines={2}>
                      {offer.description}
                    </Text>
                  )}
                  <TouchableOpacity 
                    style={styles.offerButton}
                    onPress={() => handleOfferClick(offer)}
                  >
                    <Text style={styles.offerButtonText}>Shop Now</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.offerImageSection}>
                  {offer.imageUrl ? (
                    <Image
                      source={{ uri: resolveImageUrl(offer.imageUrl) ?? offer.imageUrl }}
                      style={styles.offerImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.offerImage, styles.offerPlaceholderImage]}>
                      <Ionicons name="gift" size={40} color="rgba(255,255,255,0.5)" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
        {filteredOffers.length > 1 && (
          <View style={styles.offerIndicators}>
            {filteredOffers.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.offerIndicator,
                  index === currentOfferIndex && styles.offerIndicatorActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    )
  }

  const renderFoodCategories = () => {
    if (!selectedCategory || selectedCategory !== ProductCategory.FOOD || foodCategories.length === 0) return null

    const getCategoryImage = (category: FoodCategory): string => {
      if (category.imageUrl) {
        return resolveImageUrl(category.imageUrl) ?? category.imageUrl
      }
      const name = category.name.toLowerCase()
      for (const key of Object.keys(FOOD_CATEGORY_PLACEHOLDERS)) {
        if (name.includes(key)) {
          return FOOD_CATEGORY_PLACEHOLDERS[key]
        }
      }
      return FOOD_CATEGORY_PLACEHOLDERS['default']
    }

    return (
      <View style={styles.foodCategoriesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Food Categories</Text>
          <TouchableOpacity onPress={() => router.push('/food-categories')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.foodCategoriesGrid}>
          {foodCategories.slice(0, 10).map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.foodCategoryCard}
              onPress={() => router.push(`/food-category/${category.id}`)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: getCategoryImage(category) }}
                style={styles.foodCategoryImage}
                resizeMode="cover"
              />
              <View style={styles.foodCategoryOverlay}>
                <Text style={styles.foodCategoryName} numberOfLines={2}>{category.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  }

  const renderPopularNearYou = () => {
    if (!selectedCategory || selectedCategory === ProductCategory.MEDICINE || selectedCategory === ProductCategory.VEHICLE || trendingBrands.length === 0) return null

    return (
      <View style={styles.trendingBrandsSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Popular Near You</Text>
            <Text style={styles.sectionSubtext}>Top rated merchants in your area</Text>
          </View>
          <TouchableOpacity onPress={() => router.push({
            pathname: '/restaurants',
            params: { category: selectedCategory }
          })}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandsScroll}>
          {trendingBrands.map((brand, index) => {
            const imageUrl = brand.logoUrl || brand.coverImageUrl
            const isFeatured = index === 0
            return (
              <TouchableOpacity
                key={brand.id}
                style={styles.brandCard}
                onPress={() => router.push(`/restaurant/${brand.id}`)}
                activeOpacity={0.9}
              >
                <View style={[
                  styles.brandImageContainer,
                  isFeatured ? styles.brandImageFeatured : styles.brandImageNormal
                ]}>
                  {imageUrl ? (
                    <Image 
                      source={{ uri: resolveImageUrl(imageUrl) ?? imageUrl }} 
                      style={styles.brandImage} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.brandImage, styles.placeholderImage]}>
                      <Text style={styles.brandPlaceholder}>{brand.name.charAt(0)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.brandName} numberOfLines={2}>{brand.name}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    )
  }

  const renderAllOffers = () => {
    if (!selectedCategory ||
      selectedCategory === ProductCategory.MEDICINE ||
      selectedCategory === ProductCategory.VEHICLE ||
      selectedCategory === ProductCategory.ECHANELLING) return null

    return (
      <View style={styles.allOffersSection}>
        <Text style={[styles.sectionTitle, { marginBottom: Theme.spacing.md }]}>Top Orders</Text>
        {loading ? (
          <ActivityIndicator size="large" color={Theme.colors.primary} style={styles.loader} />
        ) : bestOffers.length > 0 ? (
          <>
            {bestOffers.slice(0, 10).map((offer) => (
              <TouchableOpacity
                key={offer.id}
                style={styles.allOfferCard}
                onPress={() => {
                  if (typeof offer.id === 'string' && offer.id.startsWith('food-')) {
                    const foodItemId = offer.id.replace('food-', '')
                    router.push(`/food-item/${foodItemId}`)
                  } else {
                    router.push(`/product/${offer.id}`)
                  }
                }}
              >
                {offer.mainImage ? (
                  <Image source={{ uri: resolveImageUrl(offer.mainImage) ?? offer.mainImage }} style={styles.allOfferImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.allOfferImage, styles.placeholderImage]}>
                    <Text style={styles.placeholderEmoji}>📦</Text>
                  </View>
                )}
                <View style={styles.allOfferContent}>
                  <Text style={styles.allOfferName}>{offer.name}</Text>
                  <Text style={styles.allOfferSubtext}>
                    {offer.orderCount && offer.orderCount > 0
                      ? `${offer.orderCount} orders recently`
                      : 'Most Popular'}
                  </Text>
                  <View style={styles.allOfferTags}>
                    <View style={styles.newTag}>
                      <Text style={styles.newTagText}>NEW</Text>
                    </View>
                    <View style={styles.locationsTag}>
                      <Text style={styles.locationsTagText}>LOCATIONS</Text>
                    </View>
                  </View>
                  <View style={styles.allOfferCategory}>
                    <Text style={styles.allOfferCategoryText}>
                      {offer.category === ProductCategory.FOOD ? 'Breakfast' : 'Grocery'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No offers available</Text>
          </View>
        )}
      </View>
    )
  }

  const renderHospitals = () => {
    if (selectedCategory !== ProductCategory.ECHANELLING || hospitals.length === 0) return null

    return (
      <View style={styles.hospitalsSection}>
        <Text style={[styles.sectionTitle, { marginBottom: Theme.spacing.md }]}>eChannelling</Text>
        <ScrollView style={styles.hospitalsList}>
          {hospitals.map((hospital) => {
            const imageUrl = hospital.coverImageUrl || hospital.logoUrl
            const isValidImage = imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('data:') || imageUrl.startsWith('/'))
            const resolvedUrl = imageUrl ? (resolveImageUrl(imageUrl) ?? imageUrl) : null

            return (
              <TouchableOpacity
                key={hospital.id}
                style={styles.hospitalCard}
                onPress={() => hospital.phone && handleCallHospital(hospital.phone)}
              >
                {isValidImage && resolvedUrl ? (
                  <Image
                    source={{ uri: resolvedUrl }}
                    style={styles.hospitalImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.hospitalImage, styles.placeholderImage]}>
                    <Ionicons name="medical" size={40} color="#8B5CF6" />
                  </View>
                )}
                <View style={styles.hospitalInfo}>
                  <Text style={styles.hospitalName}>{hospital.name}</Text>
                  {hospital.address && (
                    <Text style={styles.hospitalAddress} numberOfLines={2}>{hospital.address}</Text>
                  )}
                  {hospital.phone && (
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => handleCallHospital(hospital.phone!)}
                    >
                      <Ionicons name="call" size={20} color="#FFF" />
                      <Text style={styles.callButtonText}>Call {hospital.phone}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    )
  }

  const renderComingSoon = () => {
    const isVehicle = selectedCategory === ProductCategory.VEHICLE
    const isPharmacy = selectedCategory === ProductCategory.MEDICINE

    if (!isVehicle && !isPharmacy) return null

    const content = isVehicle ? {
      title: "Vehicle Services\nComing Soon",
      subtext: "We are working hard to bring on-demand transportation and delivery to your doorstep.",
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFzv4fQC0XdC0BsMjV359i3b0egth0nWnnYOMlJU05_ZJkYWjrVbUiSs8bwEkNBz8r2kA2rZgYECMpfiBMJ_zTiudDdIawbD0mjQhzdYW4zjKQ_6AtosChpsTm0_B_dCNxUC2lzKqVTzw3qBjymdj568YUQ-peq1sK_MByJVYXVcNaL7ZjvDSSPkfWhPPudO4MOlaj0Y3mH3ynBjixta6uDNdqeh6hX7NP00dmkoEuEP3BS_ob-3VHjK8L6cn0VB7YdZgnRPIE6lM'
    } : {
      title: "Pharmacy Delivery\nComing Soon",
      subtext: "Your wellness is our priority. Get ready for quick medicine delivery directly to your door.",
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwvVsKZsYK9tDOPP0rYJBDqWFU2VmGAQ3qUXwHJpiWtHGeJuqnXDv8NCaBUUGBXIJsdGrMDmQiPMYDecIzTb0AcKF1lDzZniSs8N1wbVhOwllB2Nmax93ii_xgmICQd2vz-4kcMGECUC5lK3fYp3b7Pj7XJ9D2UXUqp239z5n1eo8TbXm_oRyjTRUp3v8lgLNmbeLbXJi9BGrG_5Xem_d0Opwd7iIiMy-FjaMgS9cH3V8YbCdalSp4QFdj8ZwZajYQJxksTbUMS1A'
    }

    return (
      <View style={styles.comingSoonContainer}>
        <View style={styles.comingSoonContent}>
          <Image
            source={{ uri: content.image }}
            style={styles.comingSoonImage}
            resizeMode="contain"
          />
          <Text style={styles.comingSoonTitle}>{content.title}</Text>
          <Text style={styles.comingSoonSubtext}>{content.subtext}</Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f27424']}
            tintColor="#f27424"
          />
        }
      >
        <View style={styles.stickyHeaderContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={Theme.colors.primary} />
                <Text style={styles.locationText}>Delivering to {userCity}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push('/profile')}
              activeOpacity={0.7}
            >
              {user?.profilePicture ? (
                <Image source={{ uri: resolveImageUrl(user.profilePicture) ?? user.profilePicture }} style={styles.headerAvatar} />
              ) : (
                <View style={styles.headerAvatarPlaceholder}>
                  <Text style={styles.headerAvatarText}>
                    {user?.firstName?.[0]?.toUpperCase() || <Ionicons name="person" size={20} color={Theme.colors.deepBlue} />}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => router.push('/(tabs)/search')}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={20} color="#666" />
            <Text style={styles.searchPlaceholder}>Search for food, groceries, meds...</Text>
          </TouchableOpacity>

          <View style={styles.topCategoriesSection}>
            <Text style={[styles.sectionTitle, { marginBottom: Theme.spacing.md }]}>Top Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {categories.map((category) => {
                const isActive = selectedCategory === category.apiType
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryCard}
                    onPress={() => handleCategoryPress(category.apiType)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.categoryIconContainer,
                      { backgroundColor: isActive ? Theme.colors.deepBlue : category.bgColor },
                      isActive && styles.categoryIconContainerActive,
                    ]}>
                      {category.imageUrl ? (
                        <Image 
                          source={{ uri: category.imageUrl }} 
                          style={styles.categoryImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons 
                          name={category.iconName as any} 
                          size={28} 
                          color={isActive ? Theme.colors.white : Theme.colors.deepBlue} 
                        />
                      )}
                    </View>
                    <Text style={[styles.categoryName, isActive && styles.categoryNameActive]} numberOfLines={1}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </View>

        {renderSpecialOffersCarousel()}

        {renderPopularNearYou()}

        {renderFoodCategories()}

        {renderAllOffers()}

        {renderHospitals()}

        {renderComingSoon()}

        <View style={{ height: 30 }} />
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Theme.spacing.sm,
    paddingTop: 0,
    paddingBottom: 8,
    backgroundColor: Theme.colors.backgroundLight,
  },
  headerLeft: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginLeft: 4,
  },
  locationText: {
    fontSize: rf(12),
    color: Theme.colors.textGray,
    marginLeft: 4,
  },
  stickyHeaderContainer: {
    backgroundColor: Theme.colors.backgroundLight,
    zIndex: 10,
  },
  logoImage: {
    width: rs(100),
    height: rs(50),
  },
  profileButton: {
    width: Theme.touchTarget.medium,
    height: Theme.touchTarget.medium,
    borderRadius: Theme.touchTarget.medium / 2,
    backgroundColor: Theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.small,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    marginTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    marginHorizontal: Theme.spacing.lg,
    marginBottom: 8,
    padding: 14,
    borderRadius: Theme.borderRadius.lg,
    gap: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.small,
  },
  searchPlaceholder: {
    color: Theme.colors.textGray,
    fontSize: rf(15),
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: rf(Theme.fontSize.xl),
    fontWeight: '800',
    color: Theme.colors.deepBlue,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  sectionSubtext: {
    fontSize: rf(11),
    color: Theme.colors.textGray,
    fontWeight: '500',
    marginTop: 2,
  },
  seeAllText: {
    color: Theme.colors.primary,
    fontSize: rf(Theme.fontSize.xs),
    fontWeight: '700',
  },
  topCategoriesSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Theme.colors.backgroundLight,
  },
  categoriesScroll: {
    marginTop: 0,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 16,
    width: rs(75),
  },
  categoryIconContainer: {
    width: rs(60),
    height: rs(60),
    borderRadius: Theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    overflow: 'hidden',
    ...Theme.shadows.small,
  },
  categoryIconContainerActive: {
    ...Theme.shadows.medium,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryName: {
    fontSize: rf(Theme.fontSize.xs),
    fontWeight: '700',
    color: Theme.colors.deepBlue,
    textAlign: 'center',
  },
  categoryNameActive: {
    color: Theme.colors.primary,
  },
  specialOffersSection: {
    marginBottom: 24,
  },
  offersCarousel: {
    height: hp(18),
  },
  offerCard: {
    width: wp(90),
    height: hp(18),
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    marginRight: 15,
    flexDirection: 'row',
    ...Theme.shadows.medium,
  },
  offerTextSection: {
    flex: 0.55,
    padding: 16,
    justifyContent: 'center',
  },
  offerTitle: {
    fontSize: rf(22),
    fontWeight: '900',
    color: Theme.colors.white,
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: rf(12),
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 12,
  },
  offerButton: {
    backgroundColor: Theme.colors.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.md,
    alignSelf: 'flex-start',
  },
  offerButtonText: {
    color: Theme.colors.deepBlue,
    fontWeight: '800',
    fontSize: rf(11),
  },
  offerImageSection: {
    flex: 0.45,
    position: 'relative',
  },
  offerImage: {
    position: 'absolute',
    right: -20,
    top: 0,
    bottom: 0,
    width: '140%',
    borderTopLeftRadius: 100,
    borderBottomLeftRadius: 100,
  },
  offerPlaceholderImage: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  offerIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.border,
  },
  offerIndicatorActive: {
    width: 20,
    backgroundColor: Theme.colors.primary,
  },
  placeholderImage: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: rs(40),
  },
  foodCategoriesSection: {
    marginBottom: 24,
  },
  foodCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: rs(10),
  },
  foodCategoryCard: {
    width: (screenWidth - rs(40) - rs(10)) / 2,
    height: rs(120),
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Theme.colors.white,
    ...Theme.shadows.small,
  },
  foodCategoryImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  foodCategoryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: rs(10),
    paddingVertical: rs(10),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  foodCategoryName: {
    fontSize: rf(13),
    fontWeight: '700',
    color: Theme.colors.white,
    lineHeight: rf(18),
  },
  trendingBrandsSection: {
    marginBottom: 24,
  },
  brandsScroll: {
    paddingLeft: 20,
    marginTop: 0,
  },
  brandCard: {
    width: rs(70),
    marginRight: 16,
    alignItems: 'center',
    gap: rs(8),
  },
  brandImageContainer: {
    width: rs(64),
    height: rs(64),
    borderRadius: rs(32),
    overflow: 'hidden',
    ...Theme.shadows.small,
  },
  brandImageFeatured: {
    borderWidth: 2,
    borderColor: Theme.colors.primary,
  },
  brandImageNormal: {
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  brandImage: {
    width: '100%',
    height: '100%',
  },
  brandPlaceholder: {
    fontSize: rf(24),
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
  },
  brandName: {
    fontSize: rf(11),
    fontWeight: '700',
    color: Theme.colors.textDark,
    textAlign: 'center',
  },
  allOffersSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  allOfferCard: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: 12,
    marginBottom: 16,
    ...Theme.shadows.small,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  allOfferImage: {
    width: rs(100),
    height: rs(100),
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.backgroundLight,
  },
  allOfferContent: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  allOfferName: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '800',
    color: Theme.colors.deepBlue,
    marginBottom: 4,
  },
  allOfferSubtext: {
    fontSize: rf(13),
    color: Theme.colors.textGray,
    marginBottom: 8,
    fontWeight: '600',
  },
  allOfferTags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  newTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newTagText: {
    color: '#D97706',
    fontSize: rf(Theme.fontSize.xs),
    fontWeight: 'bold',
  },
  locationsTag: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  locationsTagText: {
    color: '#4338CA',
    fontSize: rf(Theme.fontSize.xs),
    fontWeight: 'bold',
  },
  allOfferCategory: {
    alignSelf: 'flex-start',
  },
  allOfferCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  hospitalsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  hospitalsList: {
    marginTop: 10,
  },
  hospitalCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hospitalImage: {
    width: rs(120),
    height: 120,
  },
  hospitalInfo: {
    flex: 1,
    padding: 15,
    justifyContent: 'space-between',
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  hospitalAddress: {
    fontSize: rf(Theme.fontSize.md),
    color: '#666',
    marginBottom: 12,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    alignSelf: 'flex-start',
  },
  callButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: rf(Theme.fontSize.md),
  },
  loader: {
    marginVertical: 40,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: rf(Theme.fontSize.base),
    color: '#666',
  },
  comingSoonContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonImage: {
    width: screenWidth * 0.6,
    height: screenWidth * 0.6,
    marginBottom: 20,
    borderRadius: Theme.borderRadius.xl,
  },
  comingSoonTitle: {
    fontSize: rf(28),
    fontWeight: '800',
    color: Theme.colors.deepBlue,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
  },
  comingSoonSubtext: {
    fontSize: rf(Theme.fontSize.md),
    color: Theme.colors.textGray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
  },
})