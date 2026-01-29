import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Dimensions, Linking, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { CategoryType } from '../../src/types'
import { Product, ProductCategory } from '../../src/types/product'
import { productApi } from '../../src/lib/productApi'
import { offerApi, Offer } from '../../src/lib/offerApi'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Theme } from '../../src/styles/theme'

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
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(ProductCategory.FOOD)
  const [trendingBrands, setTrendingBrands] = useState<Vendor[]>([])
  const [allOffers, setAllOffers] = useState<Product[]>([])
  const [bestOffers, setBestOffers] = useState<Product[]>([])
  const [specialOffers, setSpecialOffers] = useState<Offer[]>([])
  const [hospitals, setHospitals] = useState<Vendor[]>([])
  const [foodCategories, setFoodCategories] = useState<FoodCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const offersScrollRef = useRef<ScrollView>(null)
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

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
  }, [selectedCategory, currentPage])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      // Fetch special offers for carousel - always fetch fresh data
      const offers = await offerApi.getCarousel()
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
      // Refresh offers
      const offers = await offerApi.getCarousel()
      setSpecialOffers(offers || [])

      // Refresh category data if category is selected
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
        // For medicine/Pharmacy, fetch hospitals/pharmacies
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3000'}/vendors?type=pharmacy`)
        const vendors = await response.json()
        setHospitals(Array.isArray(vendors) ? vendors : vendors.data || [])
        setTrendingBrands([])
        setAllOffers([])
        setBestOffers([])
        setFoodCategories([])
      } else if (category === ProductCategory.FOOD || category === ProductCategory.GROCERY) {
        // For Food and Grocery
        const vendorType = category === ProductCategory.FOOD ? 'restaurant' : 'grocery_store'

        // Fetch vendors (restaurants/stores) for Trending Brands
        const vendorsResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3000'}/vendors?type=${vendorType}`)
        const vendorsData = await vendorsResponse.json()
        setTrendingBrands(Array.isArray(vendorsData) ? vendorsData : vendorsData.data || [])

        // Fetch food categories if Food is selected
        if (category === ProductCategory.FOOD) {
          const categoriesResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3000'}/food-categories?type=food`)
          const categoriesData = await categoriesResponse.json()
          setFoodCategories(Array.isArray(categoriesData) ? categoriesData.filter((cat: FoodCategory) => cat.isActive).slice(0, 6) : [])
        } else {
          setFoodCategories([])
        }

        // Fetch products for All Offers
        let allProducts: Product[] = []

        // For both Food and Grocery, fetch food_items from food_items table
        try {
          // Fetch food items from food_items table
          const foodItemsResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3000'}/food-items`)
          const foodItemsData = await foodItemsResponse.json()
          const foodItems = Array.isArray(foodItemsData) ? foodItemsData : []

          // Filter by category type
          const categoryType = category === ProductCategory.FOOD ? 'food' : 'grocery'
          const filteredItems = foodItems.filter((item: any) =>
            item.category?.type === categoryType && item.isAvailable
          )

          // Convert food items to product format
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
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }))

          allProducts = [...itemsAsProducts]
        } catch (error) {
          console.error(`Failed to fetch ${category} items:`, error)
        }

        // Also fetch from products table
        try {
          const productsResponse = await productApi.getAll({
            category: category as ProductCategory,
            page: 1,
            limit: 100, // Get more to combine with food items
          })
          const productsFromTable = productsResponse.data || []
          allProducts = [...allProducts, ...productsFromTable]
        } catch (error) {
          console.error('Failed to fetch products:', error)
        }

        // Remove duplicates based on id
        const uniqueProducts = allProducts.filter((product, index, self) =>
          index === self.findIndex((p) => p.id === product.id)
        )

        // Apply pagination
        const startIndex = (currentPage - 1) * 10
        const endIndex = startIndex + 10
        const paginatedProducts = uniqueProducts.slice(startIndex, endIndex)

        setAllOffers(paginatedProducts)
        setTotalPages(Math.ceil(uniqueProducts.length / 10))

        // Fetch best offers (featured products)
        try {
          const featured = await productApi.getFeatured(6)
          setBestOffers(featured.filter(p => p.category === category))
        } catch (error) {
          console.error('Failed to fetch featured products:', error)
          setBestOffers([])
        }

        setHospitals([])
      } else if (category === ProductCategory.MEDICINE) {
        // Placeholder for Medicine/Pharmacy - No data yet or different logic
        setHospitals([])
        setTrendingBrands([])
        setAllOffers([])
        setBestOffers([])
        setFoodCategories([])
      } else {
        // Handle other categories (eChanneling, Vehicle) - No data yet
        setHospitals([])
        setTrendingBrands([])
        setAllOffers([])
        setBestOffers([])
        setFoodCategories([])
      }
    } catch (error) {
      console.error('Failed to fetch category data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryPress = (category: ProductCategory) => {
    setSelectedCategory(category)
    setCurrentPage(1)
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
    if (!selectedCategory) {
      return specialOffers
    }

    return specialOffers.filter((offer) => {
      // Apply strict filtering based on category
      if (selectedCategory === ProductCategory.FOOD) {
        return offer.linkType === 'food_restaurant' || offer.linkType === 'food_item'
      } else if (selectedCategory === ProductCategory.GROCERY) {
        return offer.linkType === 'grocery_product'
      } else if (selectedCategory === ProductCategory.MEDICINE) {
        return offer.linkType === 'medicine_product'
      } else if (selectedCategory === ProductCategory.ECHANELLING) {
        return offer.linkType === 'echanelling_service' // Assuming this exists or will exist
      } else if (selectedCategory === ProductCategory.VEHICLE) {
        return offer.linkType === 'vehicle_service' // Assuming this exists or will exist
      }

      return false
    })
  }

  // Render Special Offers Carousel (from offers table)
  const renderSpecialOffersCarousel = () => {
    if (selectedCategory === ProductCategory.VEHICLE) return null
    const filteredOffers = getFilteredOffers()
    if (filteredOffers.length === 0) return null

    return (
      <View style={styles.specialOffersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Special Offers</Text>
          <TouchableOpacity onPress={() => { }}>
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
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 0 }}
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
                colors={['#1E3A8A', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {offer.imageUrl ? (
                <Image
                  source={{ uri: offer.imageUrl }}
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
              <View style={styles.offerBadgeContainer}>
                <View style={styles.offerBadge}>
                  <Text style={styles.offerBadgeText}>LIMITED TIME</Text>
                </View>
              </View>
              <View style={styles.offerOverlay}>
                {offer.title && (
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                )}
                {offer.description && (
                  <Text style={styles.offerDescription} numberOfLines={2}>
                    {offer.description}
                  </Text>
                )}
                <TouchableOpacity style={styles.claimButton}>
                  <Text style={styles.claimButtonText}>Claim Now</Text>
                </TouchableOpacity>
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
          <TouchableOpacity onPress={() => router.push('/food-categories')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.foodCategoriesGrid}>
          {foodCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.foodCategoryCard}
              onPress={() => router.push(`/food-category/${category.id}`)}
            >
              {category.imageUrl ? (
                <Image
                  source={{ uri: category.imageUrl }}
                  style={styles.foodCategoryImageContainer}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.foodCategoryImageContainer}>
                  <Text style={styles.foodCategoryIcon}>🍽️</Text>
                </View>
              )}
              <Text style={styles.foodCategoryName}>{category.name}</Text>
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
          <TouchableOpacity onPress={() => router.push('/restaurants')}>
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
                <Image source={{ uri: brand.logoUrl }} style={styles.brandLogo} />
              ) : (
                <View style={[styles.brandLogo, styles.placeholderImage]}>
                  <Text style={styles.brandPlaceholder}>{brand.name.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.brandName} numberOfLines={1}>{brand.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )
  }

  const renderAllOffers = () => {
    if (!selectedCategory || selectedCategory === ProductCategory.MEDICINE || selectedCategory === ProductCategory.VEHICLE) return null

    return (
      <View style={styles.allOffersSection}>
        <Text style={styles.sectionTitle}>All Offers</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#0066FF" style={styles.loader} />
        ) : allOffers.length > 0 ? (
          <>
            {allOffers.map((offer) => (
              <TouchableOpacity
                key={offer.id}
                style={styles.allOfferCard}
                onPress={() => {
                  // Check if it's a food item (ID starts with "food-")
                  if (typeof offer.id === 'string' && offer.id.startsWith('food-')) {
                    const foodItemId = offer.id.replace('food-', '')
                    router.push(`/food-item/${foodItemId}`)
                  } else {
                    // TODO: Navigate to product detail page when created
                    console.log('Product selected:', offer.name)
                  }
                }}
              >
                {offer.mainImage ? (
                  <Image source={{ uri: offer.mainImage }} style={styles.allOfferImage} />
                ) : (
                  <View style={[styles.allOfferImage, styles.placeholderImage]}>
                    <Text style={styles.placeholderEmoji}>📦</Text>
                  </View>
                )}
                <View style={styles.allOfferContent}>
                  <Text style={styles.allOfferName}>{offer.name}</Text>
                  <Text style={styles.allOfferSubtext}>Special Offers</Text>
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
            {totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <Text style={styles.paginationButtonText}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.paginationText}>
                  Page {currentPage} of {totalPages}
                </Text>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Text style={styles.paginationButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}
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
        <Text style={styles.sectionTitle}>Hospitals & Pharmacies</Text>
        <ScrollView style={styles.hospitalsList}>
          {hospitals.map((hospital) => {
            // Use coverImageUrl first, then logoUrl as fallback
            const imageUrl = hospital.coverImageUrl || hospital.logoUrl;
            // Handle both URL and base64 images
            const isValidImage = imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('data:') || imageUrl.startsWith('/'));

            return (
              <TouchableOpacity
                key={hospital.id}
                style={styles.hospitalCard}
                onPress={() => hospital.phone && handleCallHospital(hospital.phone)}
              >
                {isValidImage ? (
                  <Image
                    source={{ uri: imageUrl }}
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
          <TouchableOpacity style={styles.notifyButton}>
            <Ionicons name="notifications-outline" size={20} color={Theme.colors.white} />
            <Text style={styles.notifyButtonText}>Notify Me When Ready</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Ionicons name="person" size={24} color={Theme.colors.deepBlue} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#F59E0B']}
            tintColor="#F59E0B"
          />
        }
      >
        {/* Top Categories */}
        <View style={styles.topCategoriesSection}>
          <Text style={styles.sectionTitle}>Top Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.apiType && styles.categoryCardActive,
                ]}
                onPress={() => handleCategoryPress(category.apiType)}
              >
                <View style={[
                  styles.categoryIconContainer,
                  { backgroundColor: category.color === '#FFFFFF' ? Theme.colors.backgroundLight : category.color },
                  selectedCategory === category.apiType && styles.categoryIconContainerActive,
                ]}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Ionicons name="search" size={20} color="#666" />
          <Text style={styles.searchPlaceholder}>Search</Text>
        </TouchableOpacity>

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
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  logoImage: {
    width: 120,
    height: 60,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.deepBlue,
    marginBottom: Theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  seeAllText: {
    color: '#0066FF',
    fontSize: 14,
    fontWeight: '600',
  },
  topCategoriesSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  categoriesScroll: {
    marginTop: 10,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  categoryCardActive: {
    // Active state styling handled in icon container
  },
  categoryIconContainer: {
    width: 65,
    height: 65,
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
    fontSize: 28,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.deepBlue,
    textAlign: 'center',
    marginTop: 2,
  },
  specialOffersSection: {
    marginBottom: 30,
  },
  offersCarousel: {
    height: 180,
  },
  offerCard: {
    width: screenWidth - 60,
    height: 180,
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
    fontSize: 10,
    letterSpacing: 0.5,
  },
  offerImage: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
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
    fontSize: 22,
    fontWeight: '900',
    color: Theme.colors.white,
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 13,
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
    fontSize: 12,
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
    fontSize: 40,
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
  foodCategoryImageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodCategoryIcon: {
    fontSize: 48,
  },
  foodCategoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    padding: 12,
  },
  trendingBrandsSection: {
    marginBottom: 30,
  },
  brandsScroll: {
    paddingLeft: 20,
    marginTop: 10,
  },
  brandCard: {
    width: 85,
    marginRight: 20,
    alignItems: 'center',
  },
  brandLogo: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: Theme.colors.white,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.small,
  },
  brandPlaceholder: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
  },
  brandName: {
    fontSize: 12,
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
    width: 100,
    height: 100,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.backgroundLight,
  },
  allOfferContent: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  allOfferName: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.deepBlue,
    marginBottom: 4,
  },
  allOfferSubtext: {
    fontSize: 12,
    color: Theme.colors.textGray,
    marginBottom: 8,
    fontWeight: '500',
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
    fontSize: 10,
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
    fontSize: 10,
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
    fontSize: 12,
    fontWeight: '700',
  },
  paginationText: {
    fontSize: 14,
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
    width: 120,
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
    fontSize: 14,
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
    fontSize: 14,
  },
  loader: {
    marginVertical: 40,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
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
    width: screenWidth * 0.8,
    height: screenWidth * 0.8,
    marginBottom: 30,
    borderRadius: Theme.borderRadius.xl,
  },
  comingSoonTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Theme.colors.deepBlue,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
  },
  comingSoonSubtext: {
    fontSize: 16,
    color: Theme.colors.textGray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  notifyButton: {
    flexDirection: 'row',
    width: '100%',
    height: 56,
    backgroundColor: Theme.colors.deepBlue,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Theme.shadows.medium,
  },
  notifyButtonText: {
    color: Theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
})
