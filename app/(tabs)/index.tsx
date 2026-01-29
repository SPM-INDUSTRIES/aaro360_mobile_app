import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Dimensions, Linking, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { CategoryType } from '../../src/types'
import { Product, ProductCategory } from '../../src/types/product'
import { productApi } from '../../src/lib/productApi'
import { offerApi, Offer } from '../../src/lib/offerApi'
import { Ionicons } from '@expo/vector-icons'

const { width: screenWidth } = Dimensions.get('window')

const categories = [
  { id: 1, name: 'Food', type: CategoryType.FOOD, apiType: ProductCategory.FOOD, icon: '🍕', color: '#1E3A8A' },
  { id: 2, name: 'Grocery', type: CategoryType.GROCERY, apiType: ProductCategory.GROCERY, icon: '🛒', color: '#F59E0B' },
  { id: 3, name: 'eChannelling', type: CategoryType.MEDICINE, apiType: ProductCategory.MEDICINE, icon: '💊', color: '#8B5CF6' },
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

      if (category === ProductCategory.MEDICINE) {
        // For medicine, fetch hospitals/pharmacies
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3000'}/vendors?type=pharmacy`)
        const vendors = await response.json()
        // Vendors API returns array directly, not wrapped in data
        setHospitals(Array.isArray(vendors) ? vendors : vendors.data || [])
        setTrendingBrands([])
        setAllOffers([])
        setBestOffers([])
        setFoodCategories([])
      } else {
        // For Food and Grocery
        const vendorType = category === ProductCategory.FOOD ? 'restaurant' : 'grocery_store'

        // Fetch vendors (restaurants/stores) for Trending Brands
        const vendorsResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3000'}/vendors?type=${vendorType}`)
        const vendorsData = await vendorsResponse.json()
        // Vendors API returns array directly, not wrapped in data
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
        if (category === ProductCategory.FOOD || category === ProductCategory.GROCERY) {
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

  // Filter offers based on selected category
  const getFilteredOffers = (): Offer[] => {
    if (!selectedCategory) {
      // If no category selected, show all offers
      return specialOffers
    }

    return specialOffers.filter((offer) => {
      // If offer has no linkType, show it in all categories (general offers)
      if (!offer.linkType) {
        return true
      }

      // Filter based on category
      if (selectedCategory === ProductCategory.FOOD) {
        return offer.linkType === 'food_restaurant' || offer.linkType === 'food_item'
      } else if (selectedCategory === ProductCategory.GROCERY) {
        return offer.linkType === 'grocery_product'
      } else if (selectedCategory === ProductCategory.MEDICINE) {
        return offer.linkType === 'medicine_product'
      }

      return false
    })
  }

  // Render Special Offers Carousel (from offers table)
  const renderSpecialOffersCarousel = () => {
    const filteredOffers = getFilteredOffers()
    if (filteredOffers.length === 0) return null

    return (
      <View style={styles.specialOffersSection}>
        <Text style={styles.sectionTitle}>Special Offers</Text>
        <ScrollView
          ref={offersScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleOfferScroll}
          style={styles.offersCarousel}
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

  // Render Trending Brands (Restaurants/Stores)
  const renderTrendingBrands = () => {
    if (!selectedCategory || selectedCategory === ProductCategory.MEDICINE || trendingBrands.length === 0) return null

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

  // Render All Offers with Pagination
  const renderAllOffers = () => {
    if (!selectedCategory || selectedCategory === ProductCategory.MEDICINE) return null

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
    if (selectedCategory !== ProductCategory.MEDICINE || hospitals.length === 0) return null

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
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
                  { backgroundColor: category.color },
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

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066FF',
  },
  logoImage: {
    width: 250,
    height: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    margin: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  searchPlaceholder: {
    color: '#666',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
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
    marginRight: 20,
    width: 80,
  },
  categoryCardActive: {
    // Active state styling
  },
  categoryIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconContainerActive: {
    borderWidth: 3,
    borderColor: '#0066FF',
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  specialOffersSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  offersCarousel: {
    height: 200,
  },
  offerCard: {
    width: screenWidth - 40,
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    marginRight: 20,
    position: 'relative',
  },
  offerBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  offerBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  offerImage: {
    width: '100%',
    height: '100%',
  },
  offerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 15,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  offerDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  offerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    gap: 8,
  },
  offerIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  offerIndicatorActive: {
    backgroundColor: '#0066FF',
    width: 24,
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
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  brandsScroll: {
    marginTop: 10,
  },
  brandCard: {
    width: 100,
    marginRight: 15,
    alignItems: 'center',
  },
  brandLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  brandPlaceholder: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0066FF',
  },
  brandName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  allOffersSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  allOfferCard: {
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
  allOfferImage: {
    width: 120,
    height: 120,
  },
  allOfferContent: {
    flex: 1,
    padding: 15,
    justifyContent: 'space-between',
  },
  allOfferName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  allOfferSubtext: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  allOfferTags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  newTag: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  locationsTag: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  locationsTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  allOfferCategory: {
    alignSelf: 'flex-end',
  },
  allOfferCategoryText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  paginationButton: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  paginationButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.5,
  },
  paginationButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
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
})
