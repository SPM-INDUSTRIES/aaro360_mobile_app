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

const { width: screenWidth } = Dimensions.get('window')

const categories = [
  { id: 1, name: 'Food', type: CategoryType.FOOD, apiType: ProductCategory.FOOD, icon: '🍔', color: '#FFFFFF' },
  { id: 2, name: 'Grocery', type: CategoryType.GROCERY, apiType: ProductCategory.GROCERY, icon: '🛒', color: '#FFFFFF' },
  { id: 3, name: 'eChannelling', type: CategoryType.ECHANELLING, apiType: ProductCategory.ECHANELLING, icon: '📅', color: '#FFFFFF' },
  { id: 4, name: 'Pharmacy', type: CategoryType.MEDICINE, apiType: ProductCategory.MEDICINE, icon: '💊', color: '#FFFFFF' },
  { id: 5, name: 'Vehicle', type: CategoryType.VEHICLE, apiType: ProductCategory.VEHICLE, icon: '🚗', color: '#FFFFFF' },
]

// Vendor interface
interface Vendor {
  id: number
  name: string
  type: string
  logoUrl?: string
  coverImageUrl?: string
  address?: string
  phone?: string
  isActive: boolean
}

// Food Category interface
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

  const CATEGORY_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  const OFFERS_CACHE_TTL = 10 * 10 * 1000 // 10 minutes

  useEffect(() => {
    fetchInitialData()
  }, [])

  // Refresh offers when screen comes into focus
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
          setFoodCategories(Array.isArray(categoriesData) ? categoriesData.filter((cat: FoodCategory) => cat.isActive).slice(0, 6) : [])
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
    const index = Math.round(contentOffsetX / screenWidth)
    setCurrentOfferIndex(index)
  }

  const getFilteredOffers = (): Offer[] => {
    if (!specialOffers || specialOffers.length === 0) {
      return []
    }

    return specialOffers.filter((offer) => {
      // If no linkType is set, it's a general offer and should show in all main categories
      if (!offer.linkType || offer.linkType === 'carousel' || offer.linkType === 'general') {
        return true
      }

      const type = offer.linkType.toLowerCase()

      // Apply filtering based on category
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

  // Render Special Offers Carousel (from offers table)
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
              <Skeleton width={screenWidth - 40} height={180} borderRadius={Theme.borderRadius.xl} />
            </View>
          </View>
        </SkeletonProvider>
      )
    }

    if (filteredOffers.length === 0) return null

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
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleOfferScroll}
          style={styles.offersCarousel}
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}
        >
          {filteredOffers.map((offer, index) => (
            <TouchableOpacity
              key={offer.id}
              style={styles.offerCard}
              onPress={() => {
                if (offer.linkUrl) {
                  console.log('Offer clicked:', offer.linkUrl)
                }
              }}
            >
              <LinearGradient
                colors={['#124569', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {offer.imageUrl ? (
                <Image
                  source={{ uri: resolveImageUrl(offer.imageUrl) ?? offer.imageUrl }}
                  style={styles.offerImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.offerImage, styles.placeholderImage]}>
                  <Text style={styles.placeholderEmoji}>🎁</Text>
                </View>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.offerGradientOverlay}
              />
              <View style={styles.offerOverlay}>
                {offer.title && (
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                )}
                {offer.description && (
                  <Text style={styles.offerDescription} numberOfLines={2}>
                    {offer.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
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

  // Render Food Categories
  const renderFoodCategories = () => {
    if (!selectedCategory || selectedCategory !== ProductCategory.FOOD) return null

    return (
      <View style={styles.foodCategoriesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Food Categories</Text>
          <TouchableOpacity onPress={() => router.push({
            pathname: '/food-categories',
            params: { category: selectedCategory }
          })}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.foodCategoriesGrid}>
          {foodCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.foodCategoryCard}
              onPress={() => router.push(`/food-category/${category.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.foodCategoryImageContainer}>
                {category.imageUrl ? (
                  <Image
                    source={{ uri: resolveImageUrl(category.imageUrl) ?? category.imageUrl }}
                    style={styles.foodCategoryImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.foodCategoryIcon}>🍽️</Text>
                )}
              </View>
              <Text style={styles.foodCategoryName} numberOfLines={1}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  }

  const renderTrendingBrands = () => {
    if (!selectedCategory || selectedCategory === ProductCategory.MEDICINE || selectedCategory === ProductCategory.VEHICLE || trendingBrands.length === 0) return null

    const sectionTitle = selectedCategory === ProductCategory.FOOD ? 'Your Favourite Restaurants' : 'Popular Stores'

    return (
      <View style={styles.trendingBrandsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          <TouchableOpacity onPress={() => router.push({
            pathname: '/restaurants',
            params: { category: selectedCategory }
          })}>
            <Text style={styles.seeAllText}>View More</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandsScroll}>
          {trendingBrands.map((brand) => (
            <TouchableOpacity
              key={brand.id}
              style={styles.brandCard}
              onPress={() => router.push(`/restaurant/${brand.id}`)}
            >
              {brand.logoUrl ? (
                <Image source={{ uri: resolveImageUrl(brand.logoUrl) ?? brand.logoUrl }} style={styles.brandLogo} />
              ) : (
                <View style={[styles.brandLogo, styles.placeholderImage]}>
                  <Text style={styles.brandPlaceholder}>{brand.name.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.brandName} numberOfLines={2}>{brand.name}</Text>
            </TouchableOpacity>
          ))}
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
                  // Check if it's a food item (ID starts with "food-")
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

  // Render Hospitals (Medicine category)
  const renderHospitals = () => {
    if (selectedCategory !== ProductCategory.ECHANELLING || hospitals.length === 0) return null

    return (
      <View style={styles.hospitalsSection}>
        <Text style={[styles.sectionTitle, { marginBottom: Theme.spacing.md }]}>Hospitals & Pharmacies</Text>
        <ScrollView style={styles.hospitalsList}>
          {hospitals.map((hospital) => {
            // Use coverImageUrl first, then logoUrl as fallback
            const imageUrl = hospital.coverImageUrl || hospital.logoUrl;
            // Handle both URL and base64 images
            const isValidImage = imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('data:') || imageUrl.startsWith('/'));
            const resolvedUrl = imageUrl ? (resolveImageUrl(imageUrl) ?? imageUrl) : null;

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
                    onError={(error) => {
                      // If image fails to load, it will show placeholder
                      console.log('Failed to load image:', imageUrl, error)
                    }}
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

  // Render Coming Soon
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
          {/* <TouchableOpacity style={styles.notifyButton}>
            <Ionicons name="notifications-outline" size={20} color={Theme.colors.white} />
            <Text style={styles.notifyButtonText}>Notify Me When Ready</Text>
          </TouchableOpacity> */}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
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
        {/* Sticky Header Container */}
        <View style={styles.stickyHeaderContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
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

          {/* Top Categories */}
          <View style={styles.topCategoriesSection}>
            <Text style={[styles.sectionTitle, { marginBottom: Theme.spacing.md }]}>Top Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory === category.apiType && styles.categoryCardActive,
                  ]}
                  onPress={() => handleCategoryPress(category.apiType)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.categoryIconContainer,
                    { backgroundColor: category.color === '#FFFFFF' ? Theme.colors.backgroundLight : category.color },
                    selectedCategory === category.apiType && styles.categoryIconContainerActive,
                  ]}>
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                  </View>
                  <Text style={styles.categoryName} numberOfLines={1}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Search Bar */}
        {selectedCategory !== ProductCategory.MEDICINE && selectedCategory !== ProductCategory.VEHICLE && (
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Ionicons name="search" size={20} color="#666" />
            <Text style={styles.searchPlaceholder}>Search</Text>
          </TouchableOpacity>
        )}

        {/* Special Offers Carousel */}
        {renderSpecialOffersCarousel()}

        {/* Trending Brands (Restaurants/Stores) */}
        {renderTrendingBrands()}

        {/* Food Categories */}
        {renderFoodCategories()}

        {/* All Offers */}
        {renderAllOffers()}

        {/* Hospitals (Medicine) */}
        {renderHospitals()}

        {/* Coming Soon Section */}
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
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.sm,
    paddingTop: 0,
    paddingBottom: 10,
    backgroundColor: Theme.colors.backgroundLight,
    borderBottomWidth: 0,
  },
  stickyHeaderContainer: {
    backgroundColor: Theme.colors.backgroundLight,
    zIndex: 10,
  },
  logoImage: {
    width: rs(120),
    height: rs(60),
  },
  profileButton: {
    width: Theme.touchTarget.medium,
    height: Theme.touchTarget.medium,
    borderRadius: Theme.touchTarget.medium / 2,
    backgroundColor: Theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.small,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    margin: Theme.spacing.lg,
    marginTop: 10,
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
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  seeAllText: {
    color: Theme.colors.primary,
    fontSize: rf(Theme.fontSize.md),
    fontWeight: '600',
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
    width: rs(85),
  },
  categoryCardActive: {
    // Active state styling handled in icon container
  },
  categoryIconContainer: {
    width: rs(65),
    height: rs(65),
    borderRadius: Theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.small,
  },
  categoryIconContainerActive: {
    backgroundColor: Theme.colors.deepBlue,
    borderColor: Theme.colors.deepBlue,
    ...Theme.shadows.medium,
  },
  categoryIcon: {
    fontSize: rf(28),
  },
  categoryName: {
    fontSize: rf(Theme.fontSize.sm),
    fontWeight: '700',
    color: Theme.colors.deepBlue,
    textAlign: 'center',
    marginTop: 2,
  },
  specialOffersSection: {
    marginBottom: 30,
  },
  offersCarousel: {
    height: hp(22),
  },
  offerCard: {
    width: wp(88),
    height: hp(22),
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    marginRight: 15,
    position: 'relative',
    ...Theme.shadows.medium,
  },
  offerBadgeContainer: {
    position: 'absolute',
    top: 15,
    left: 15,
    zIndex: 2,
  },
  offerBadge: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.sm,
  },
  offerBadgeText: {
    color: Theme.colors.white,
    fontWeight: '900',
    fontSize: rf(Theme.fontSize.xs),
    letterSpacing: 0.5,
  },
  offerImage: {
    width: '100%',
    height: '100%',
  },
  offerGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    zIndex: 1,
  },
  offerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 2,
  },
  offerTitle: {
    fontSize: rf(22),
    fontWeight: '900',
    color: Theme.colors.white,
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: rf(13),
    color: '#E0E7FF',
    fontWeight: '500',
    marginBottom: 12,
  },
  claimButton: {
    backgroundColor: Theme.colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.md,
    alignSelf: 'flex-start',
  },
  claimButtonText: {
    color: Theme.colors.deepBlue,
    fontWeight: '800',
    fontSize: rf(Theme.fontSize.sm),
  },
  offerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
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
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  foodCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  foodCategoryCard: {
    width: '48%',
    backgroundColor: Theme.colors.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Theme.shadows.small,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  foodCategoryImageContainer: {
    width: '100%',
    height: rs(110),
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  foodCategoryImage: {
    width: '100%',
    height: '100%',
  },
  foodCategoryIcon: {
    fontSize: rs(40),
  },
  foodCategoryName: {
    fontSize: rf(Theme.fontSize.md),
    fontWeight: '700',
    color: Theme.colors.textDark,
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  trendingBrandsSection: {
    marginBottom: 30,
  },
  brandsScroll: {
    paddingLeft: 20,
    marginTop: 10,
  },
  brandCard: {
    width: rs(85),
    marginRight: 20,
    alignItems: 'center',
  },
  brandLogo: {
    width: rs(80),
    height: rs(80),
    borderRadius: Theme.borderRadius.xl,
    marginBottom: 8,
  },
  brandPlaceholder: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
  },
  brandName: {
    fontSize: rf(Theme.fontSize.sm),
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
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 15,
  },
  paginationButton: {
    backgroundColor: Theme.colors.white,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.small,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    color: Theme.colors.deepBlue,
    fontSize: rf(Theme.fontSize.sm),
    fontWeight: '700',
  },
  paginationText: {
    fontSize: rf(Theme.fontSize.md),
    color: Theme.colors.textGray,
    fontWeight: '600',
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
  notifyButton: {
    flexDirection: 'row',
    width: '100%',
    height: 48,
    backgroundColor: Theme.colors.deepBlue,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Theme.shadows.medium,
  },
  notifyButtonText: {
    color: Theme.colors.white,
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '700',
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
color: Theme.colors.deepBlue,
  },
})
