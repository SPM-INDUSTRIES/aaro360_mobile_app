import { useState, useEffect } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, SafeAreaView, Platform, StatusBar, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDispatch } from 'react-redux'
import FilterModal from '../../src/components/search/FilterModal'
import { productApi } from '../../src/lib/productApi'
import { Product, ProductCategory } from '../../src/types/product'
import { addItem } from '../../src/store/slices/cartSlice'
import { CategoryType } from '../../src/types'

const API_URL = process.env.EXPO_PUBLIC_API_URL || '${process.env.EXPO_PUBLIC_API_URL}'

export default function SearchScreen() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { category, isFeatured } = useLocalSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    rating: 0,
    mealType: '',
    brand: '',
  })

  const handleAddToCart = (product: Product, e: any) => {
    e.stopPropagation()
    
    // Determine item type based on category
    let itemType: CategoryType
    if (product.category === ProductCategory.FOOD) {
      itemType = CategoryType.FOOD
    } else if (product.category === ProductCategory.GROCERY) {
      itemType = CategoryType.GROCERY
    } else {
      itemType = CategoryType.MEDICINE
    }
    
    // Get restaurant ID if it's a food item
    let restaurantId: number | undefined
    if (typeof product.id === 'string' && product.id.startsWith('food-')) {
      // Extract restaurant ID from vendorId if available
      if (product.vendorId) {
        // vendorId might be a string UUID, we'll need to handle it
        restaurantId = undefined // We'll need to fetch or store this differently
      }
    }
    
    // Add item to cart
    dispatch(addItem({
      itemName: product.name,
      itemType: itemType,
      quantity: 1,
      unitPrice: Number(product.price || 0),
      restaurantId: restaurantId,
    }))
    
    // Show success message
    Alert.alert(
      'Added to Cart',
      `${product.name} has been added to your cart`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => router.push('/cart') }
      ]
    )
  }

  useEffect(() => {
    if (searchQuery.length > 0) {
      // If there's a search query, search across all products and food items
      fetchSearchResults()
    } else if (category || isFeatured) {
      // If no search query but category/featured is selected, show category products
      fetchProductsByCategory()
    } else {
      setProducts([])
    }
  }, [category, isFeatured, searchQuery, filters])

  const applyFilters = (products: Product[]): Product[] => {
    let filtered = [...products]
    
    // Filter by rating
    if (filters.rating > 0) {
      filtered = filtered.filter(p => (p.averageRating || 0) >= filters.rating)
    }
    
    // Filter by meal type (map to subCategory for food items)
    if (filters.mealType) {
      filtered = filtered.filter(p => {
        // Check if subCategory matches meal type
        if (p.subCategory?.toLowerCase().includes(filters.mealType.toLowerCase())) {
          return true
        }
        // Check if tags include meal type
        if (p.tags?.some(tag => tag.toLowerCase().includes(filters.mealType.toLowerCase()))) {
          return true
        }
        return false
      })
    }
    
    // Filter by brand
    if (filters.brand) {
      filtered = filtered.filter(p => {
        const brandMatch = p.brand?.toLowerCase().includes(filters.brand.toLowerCase())
        const vendorMatch = p.vendor?.name?.toLowerCase().includes(filters.brand.toLowerCase())
        const restaurantMatch = p.restaurant?.toLowerCase().includes(filters.brand.toLowerCase())
        return brandMatch || vendorMatch || restaurantMatch
      })
    }
    
    return filtered
  }

  const fetchProductsByCategory = async () => {
    try {
      setLoading(true)
      let fetchedProducts: Product[] = []
      
      if (isFeatured === 'true') {
        fetchedProducts = await productApi.getFeatured(50)
      } else if (category) {
        const categoryType = category as ProductCategory
        
        // For Food and Grocery, also fetch from food_items table
        if (categoryType === ProductCategory.FOOD || categoryType === ProductCategory.GROCERY) {
          try {
            // Fetch food items from food_items table
            const foodItemsResponse = await fetch(`${API_URL}/food-items`)
            const foodItemsData = await foodItemsResponse.json()
            const foodItems = Array.isArray(foodItemsData) ? foodItemsData : []
            
            // Filter by category type
            const categoryTypeFilter = categoryType === ProductCategory.FOOD ? 'food' : 'grocery'
            const filteredItems = foodItems.filter((item: any) => 
              item.category?.type === categoryTypeFilter && item.isAvailable
            )
            
            // Convert food items to product format
            const itemsAsProducts: Product[] = filteredItems.map((item: any) => ({
              id: `food-${item.id}`,
              name: item.name,
              description: item.description || '',
              category: categoryType,
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
            
            fetchedProducts = [...itemsAsProducts]
          } catch (error) {
            console.error(`Failed to fetch ${categoryType} items:`, error)
          }
        }
        
        // Also fetch from products table
        try {
          const productsFromTable = await productApi.getByCategory(categoryType, 100)
          fetchedProducts = [...fetchedProducts, ...productsFromTable]
        } catch (error) {
          console.error('Failed to fetch products:', error)
        }
        
        // Remove duplicates based on id
        fetchedProducts = fetchedProducts.filter((product, index, self) =>
          index === self.findIndex((p) => p.id === product.id)
        )
      }
      
      // Apply filters
      fetchedProducts = applyFilters(fetchedProducts)
      
      setProducts(fetchedProducts)
    } catch (error) {
      console.error('Failed to fetch products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSearchResults = async () => {
    try {
      setLoading(true)
      let allProducts: Product[] = []
      
      // Search in products table
      try {
        const response = await productApi.getAll({
          search: searchQuery,
          page: 1,
          limit: 100,
        })
        allProducts = response.data || []
        
        // If category is selected, filter by category
        if (category) {
          const categoryType = category as ProductCategory
          allProducts = allProducts.filter(p => p.category === categoryType)
        }
      } catch (error) {
        console.error('Failed to search products:', error)
      }
      
      // Also search in food_items table for food and grocery items
      try {
        const foodItemsResponse = await fetch(`${API_URL}/food-items`)
        const foodItemsData = await foodItemsResponse.json()
        const foodItems = Array.isArray(foodItemsData) ? foodItemsData : []
        
        // Filter by search query (case-insensitive search in name and description)
        const searchLower = searchQuery.toLowerCase()
        let filteredItems = foodItems.filter((item: any) => {
          const matchesSearch = 
            item.name?.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower)
          return matchesSearch && item.isAvailable
        })
        
        // If category is selected, also filter by category type
        if (category) {
          const categoryType = category as ProductCategory
          const categoryTypeFilter = categoryType === ProductCategory.FOOD ? 'food' : 
                                     categoryType === ProductCategory.GROCERY ? 'grocery' : null
          if (categoryTypeFilter) {
            filteredItems = filteredItems.filter((item: any) => 
              item.category?.type === categoryTypeFilter
            )
          }
        }
        
        // Convert food items to product format
        const itemsAsProducts: Product[] = filteredItems.map((item: any) => {
          // Determine category based on food category type
          let productCategory = ProductCategory.FOOD
          if (item.category?.type === 'grocery') {
            productCategory = ProductCategory.GROCERY
          } else if (item.category?.type === 'food') {
            productCategory = ProductCategory.FOOD
          }
          
          return {
            id: `food-${item.id}`,
            name: item.name,
            description: item.description || '',
            category: productCategory,
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
          }
        })
        
        allProducts = [...allProducts, ...itemsAsProducts]
      } catch (error) {
        console.error('Failed to search food items:', error)
      }
      
      // Remove duplicates based on id
      const uniqueProducts = allProducts.filter((product, index, self) =>
        index === self.findIndex((p) => p.id === product.id)
      )
      
      // Apply filters
      const filteredProducts = applyFilters(uniqueProducts)
      
      setProducts(filteredProducts)
    } catch (error) {
      console.error('Failed to search:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const getCategoryTitle = () => {
    if (category === ProductCategory.FOOD) return 'Food Products'
    if (category === ProductCategory.GROCERY) return 'Grocery Products'
    if (category === ProductCategory.MEDICINE) return 'Medicine Products'
    if (isFeatured === 'true') return 'Featured Products'
    return 'Search Products'
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      {/* Search Header */}
      <View style={styles.searchHeader}>
          {category && (
            <View style={styles.categoryTitleContainer}>
              <Text style={styles.categoryTitle}>{getCategoryTitle()}</Text>
            </View>
          )}
          <View style={styles.searchRow}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={category ? `Search ${category}...` : "Search for Pizza, Painkiller, etc..."}
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus={!category}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilters(true)}
            >
              <Ionicons name="options" size={24} color="#F59E0B" />
            </TouchableOpacity>
          </View>
        </View>

      {/* Search Results */}
      <ScrollView style={styles.results}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : products.length > 0 ? (
          <View style={styles.resultsList}>
            <Text style={styles.resultsCount}>
              {products.length} {products.length === 1 ? 'result' : 'results'}
            </Text>
            {products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productItem}
                activeOpacity={0.7}
                onPress={() => {
                  // Check if it's a food item (ID starts with "food-")
                  if (typeof product.id === 'string' && product.id.startsWith('food-')) {
                    const foodItemId = product.id.replace('food-', '')
                    router.push(`/food-item/${foodItemId}`)
                  } else {
                    // TODO: Navigate to product detail page when created
                    console.log('Product selected:', product.name)
                  }
                }}
              >
                <View style={styles.productImageContainer}>
                  {product.mainImage ? (
                    <Image 
                      source={{ uri: product.mainImage }} 
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.productImage, styles.placeholderImage]}>
                      <Ionicons name="image-outline" size={32} color="#CCC" />
                    </View>
                  )}
                </View>
                <View style={styles.productDetails}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    {(product.vendor?.name || product.restaurant) && (
                      <View style={styles.vendorRow}>
                        <Ionicons name="location" size={14} color="#999" />
                        <Text style={styles.productVendor} numberOfLines={1}>
                          {product.vendor?.name || product.restaurant}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.productFooter}>
                    <View style={styles.priceContainer}>
                      <Text style={styles.productPrice}>රු{Number(product.price || 0).toFixed(2)}</Text>
                      {product.discountPrice && (
                        <Text style={styles.productOriginalPrice}>
                          රු{Number(product.discountPrice || 0).toFixed(2)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={(e) => handleAddToCart(product, e)}
                    >
                      <Ionicons name="add" size={24} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : searchQuery.length === 0 && !category && !isFeatured ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>Start typing to search...</Text>
            <Text style={styles.emptySubtext}>
              Search for food, groceries, or medicines
            </Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        )}
      </ScrollView>

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApplyFilters={setFilters}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  searchHeader: {
    padding: 15,
    paddingTop: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryTitleContainer: {
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    flex: 1,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 12,
  },
  filterButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  results: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  resultsList: {
    paddingBottom: 20,
  },
  resultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'stretch',
  },
  productImageContainer: {
    width: 120,
    height: 150,
    backgroundColor: '#F8F8F8',
    alignSelf: 'stretch' as const,
    resizeMode: 'cover',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  productDetails: {
    flex: 1,
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 12,
    paddingLeft: 16,
    justifyContent: 'space-between',
  },
  productHeader: {
    flex: 1,
  },
  productName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 22,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  productVendor: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  productOriginalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  addButton: {
    backgroundColor: '#F59E0B',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
})
