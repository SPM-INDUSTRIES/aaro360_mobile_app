import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAppDispatch } from '../../src/store/store'
import { Skeleton } from '../../src/components/SkeletonLoader'
import { Theme } from '../../src/styles/theme'
import FloatingCartButton from '../../src/components/FloatingCartButton'
import AddToCartModal from '../../src/components/AddToCartModal'
import { addItemToCart } from '../../src/store/slices/cartSlice'
import { CategoryType } from '../../src/types'
import { API_URL } from '../../src/lib/api'

interface FoodCategory {
  id: number
  name: string
}

interface FoodAddon {
  id: number
  name: string
  price: number
}

interface FoodItemVariant {
  id: number
  name: string
  price: number
  quantity: number
  isActive: boolean
}

interface FoodItem {
  id: number
  name: string
  price: number
  imageUrl?: string
  description?: string
  isAvailable: boolean
  category: FoodCategory
  addons: FoodAddon[]
  variants?: FoodItemVariant[]
}

interface Restaurant {
  id: number
  name: string
  logoUrl?: string
  coverImageUrl?: string
  address?: string
  phone?: string
}

export default function RestaurantDetailScreen() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const restaurantId = params.id as string

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [categories, setCategories] = useState<FoodCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [showAddToCartModal, setShowAddToCartModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null)

  useEffect(() => {
    fetchData()
  }, [restaurantId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [restaurantRes, foodItemsRes, categoriesRes] = await Promise.all([
        fetch(`${API_URL}/vendors/${restaurantId}`),
        fetch(`${API_URL}/food-items/restaurant/${restaurantId}`),
        fetch(`${API_URL}/food-categories?type=food`),
      ])

      const restaurantData = await restaurantRes.json()
      const foodItemsData = await foodItemsRes.json()
      const categoriesData = await categoriesRes.json()

      setRestaurant(restaurantData)
      setFoodItems(foodItemsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (item: FoodItem) => {
    setSelectedItem(item)
    setShowAddToCartModal(true)
  }

  const handleConfirmAddToCart = (quantity: number, selectedVariant?: FoodItemVariant, selectedAddons?: number[]) => {
    if (!selectedItem) return

    let itemName = selectedItem.name
    let unitPrice = selectedVariant?.price || selectedItem.price

    // Add variant name to item name
    if (selectedVariant) {
      itemName += ` (${selectedVariant.name})`
    }

    // Add addons to item name and price
    if (selectedAddons && selectedAddons.length > 0) {
      const addonNames = selectedAddons
        .map(id => selectedItem.addons.find(a => a.id === id)?.name)
        .filter(Boolean)
        .join(', ')
      itemName += ` with ${addonNames}`

      const addonsTotal = selectedAddons.reduce((sum, id) => {
        const addon = selectedItem.addons.find(a => a.id === id)
        return sum + (addon?.price || 0)
      }, 0)
      unitPrice += addonsTotal
    }

    // Determine item type based on category
    const itemType = selectedItem.category.name.toLowerCase().includes('grocery')
      ? CategoryType.GROCERY
      : CategoryType.FOOD

    dispatch(addItemToCart({
      itemName,
      itemType,
      quantity,
      unitPrice: Number(unitPrice),
      restaurantId: parseInt(restaurantId),
    }))
      .unwrap()
      .catch((error) => {
        Alert.alert('Error', error || 'Failed to add item to cart')
      })
  }

  const filteredItems = foodItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || item.category.id.toString() === selectedCategory
    const matchesMinPrice = !minPrice || item.price >= parseFloat(minPrice)
    const matchesMaxPrice = !maxPrice || item.price <= parseFloat(maxPrice)
    return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && item.isAvailable
  })

  const renderSkeleton = () => {
    return (
      <View style={styles.container}>
        {/* Header Skeleton */}
        <View style={styles.restaurantHeader}>
          <Skeleton height={200} borderRadius={0} />
          <View style={styles.restaurantInfo}>
            <View style={{ marginTop: -40, marginRight: 15 }}>
              <Skeleton width={80} height={80} borderRadius={40} />
            </View>
            <View style={{ flex: 1 }}>
              <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
              <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
              <Skeleton width="40%" height={14} />
            </View>
          </View>
        </View>

        {/* Filters Skeleton */}
        <View style={styles.filtersContainer}>
          <Skeleton height={45} style={{ marginBottom: 15 }} />
          <View style={styles.filterRow}>
            <Skeleton height={45} style={{ flex: 1 }} />
            <Skeleton height={45} style={{ flex: 1 }} />
          </View>
        </View>

        {/* Menu Items Skeleton */}
        <View style={styles.menuContainer}>
          <Skeleton width={120} height={24} style={{ marginBottom: 15 }} />
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.foodCard, { height: 120 }]}>
              <Skeleton width={120} height={120} borderRadius={0} />
              <View style={{ flex: 1, padding: 12 }}>
                <Skeleton width="70%" height={18} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={14} style={{ marginBottom: 12 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <Skeleton width={60} height={24} />
                  <Skeleton width={36} height={36} borderRadius={18} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: restaurant?.name || (loading ? 'Loading...' : 'Restaurant'),
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: Theme.colors.deepBlue,
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
      {loading ? renderSkeleton() : (
        <ScrollView style={styles.container}>
          {/* Restaurant Header */}
          {restaurant && (
            <View style={styles.restaurantHeader}>
              {restaurant.coverImageUrl ? (
                <Image
                  source={{ uri: restaurant.coverImageUrl }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.coverImage, { backgroundColor: Theme.colors.blueLight }]} />
              )}
              <View style={styles.restaurantInfo}>
                <View style={styles.logoContainer}>
                  {restaurant.logoUrl ? (
                    <Image
                      source={{ uri: restaurant.logoUrl }}
                      style={styles.logo}
                    />
                  ) : (
                    <View style={[styles.logo, styles.placeholderLogo]}>
                      <Text style={styles.logoEmoji}>{restaurant.name.charAt(0)}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.restaurantDetails}>
                  <Text style={styles.restaurantName}>{restaurant.name}</Text>
                  {restaurant.address && (
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={14} color={Theme.colors.textGray} />
                      <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
                    </View>
                  )}
                  {restaurant.phone && (
                    <View style={styles.metaRow}>
                      <Ionicons name="call-outline" size={14} color={Theme.colors.textGray} />
                      <Text style={styles.restaurantPhone}>{restaurant.phone}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Search and Filters */}
          <View style={styles.filtersContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search menu..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Category</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={styles.picker}
                    onPress={() => {
                      // In a real app, show a modal with category options
                    }}
                  >
                    <Text style={styles.pickerText}>
                      {selectedCategory
                        ? categories.find(c => c.id.toString() === selectedCategory)?.name
                        : 'All'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.priceFilters}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min"
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="numeric"
                />
                <Text style={styles.priceSeparator}>-</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Food Items */}
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Menu ({filteredItems.length})</Text>
            {filteredItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.foodCard}
                onPress={() => {
                  router.push(`/food-item/${item.id}`)
                }}
              >
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.foodImage}
                  />
                ) : (
                  <View style={[styles.foodImage, styles.placeholderImage]}>
                    <Text style={styles.placeholderEmoji}>🍽️</Text>
                  </View>
                )}
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{item.name}</Text>
                  <Text style={styles.foodCategory}>{item.category.name}</Text>
                  {item.description && (
                    <Text style={styles.foodDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  {item.addons.length > 0 && (
                    <View style={styles.addonsContainer}>
                      <Text style={styles.addonsLabel}>Add-ons available</Text>
                    </View>
                  )}
                  <View style={styles.foodFooter}>
                    <Text style={styles.foodPrice}>රු{Number(item.price || 0).toFixed(2)}</Text>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={(e) => {
                        e.stopPropagation()
                        handleAddToCart(item)
                      }}
                    >
                      <Ionicons name="add" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {filteredItems.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="fast-food-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No items found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
      <AddToCartModal
        visible={showAddToCartModal}
        onClose={() => setShowAddToCartModal(false)}
        item={selectedItem}
        onAddToCart={handleConfirmAddToCart}
      />
      <FloatingCartButton />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  restaurantHeader: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 250,
  },
  restaurantInfo: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginTop: -40,
    backgroundColor: '#FFFFFF',
    ...Theme.shadows.small,
  },
  logo: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  placeholderLogo: {
    backgroundColor: Theme.colors.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 5,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  restaurantPhone: {
    fontSize: 14,
    color: '#666',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#000',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  pickerText: {
    fontSize: 14,
    color: '#000',
  },
  priceFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  priceSeparator: {
    marginHorizontal: 8,
    color: '#666',
  },
  menuContainer: {
    padding: 15,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  foodCard: {
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
  foodImage: {
    width: 120,
    height: 120,
  },
  placeholderImage: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  foodInfo: {
    flex: 1,
    padding: 12,
  },
  foodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  foodCategory: {
    fontSize: 12,
    color: '#0066FF',
    marginBottom: 4,
  },
  foodDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  addonsContainer: {
    marginBottom: 8,
  },
  addonsLabel: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  foodFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066FF',
  },
  addButton: {
    backgroundColor: '#0066FF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
})
