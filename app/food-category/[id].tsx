import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Skeleton } from '../../src/components/SkeletonLoader'
import { Theme } from '../../src/styles/theme'
import { foodCategoryApi, foodItemApi } from '../../src/lib/api'

interface FoodCategory {
  id: number
  name: string
  description?: string
  imageUrl?: string
}

interface Restaurant {
  id: number
  name: string
  logoUrl?: string
}

interface FoodItem {
  id: number
  name: string
  price: number
  imageUrl?: string
  description?: string
  isAvailable: boolean
  restaurant: Restaurant
  category: FoodCategory
}

export default function FoodCategoryDetailScreen() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const categoryId = params.id as string

  const [category, setCategory] = useState<FoodCategory | null>(null)
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [priceError, setPriceError] = useState('')

  useEffect(() => {
    fetchData()
  }, [categoryId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [categoryRes, foodItemsRes] = await Promise.all([
        foodCategoryApi.getById(Number(categoryId)),
        foodItemApi.getByCategory(Number(categoryId)),
      ])

      const categoryData = categoryRes.data
      const foodItemsData = foodItemsRes.data

      setCategory(categoryData)
      setFoodItems(Array.isArray(foodItemsData) ? foodItemsData : [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = foodItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())

    const min = minPrice ? parseFloat(minPrice) : 0
    const max = maxPrice ? parseFloat(maxPrice) : Infinity

    // Basic numerical validation
    if (minPrice && isNaN(min)) return false
    if (maxPrice && isNaN(max)) return false

    const matchesMinPrice = !minPrice || item.price >= min
    const matchesMaxPrice = !maxPrice || item.price <= max

    return matchesSearch && matchesMinPrice && matchesMaxPrice && item.isAvailable
  })

  // Add a side effect to check min/max logic and warn user
  useEffect(() => {
    if (minPrice && maxPrice) {
      const min = parseFloat(minPrice)
      const max = parseFloat(maxPrice)
      if (!isNaN(min) && !isNaN(max) && min > max) {
        setPriceError('Min should be less than Max')
      } else {
        setPriceError('')
      }
    } else {
      setPriceError('')
    }
  }, [minPrice, maxPrice])

  const renderSkeleton = () => {
    return (
      <View style={styles.container}>
        <View style={styles.categoryHeader}>
          <Skeleton height={150} borderRadius={0} />
          <View style={styles.categoryInfo}>
            <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
            <Skeleton width="90%" height={16} />
          </View>
        </View>

        <View style={styles.filtersContainer}>
          <Skeleton height={45} style={{ marginBottom: 15 }} />
          <View style={styles.priceFilters}>
            <Skeleton width={100} height={16} style={{ marginRight: 10 }} />
            <Skeleton height={45} style={{ flex: 1 }} />
            <View style={{ width: 20 }} />
            <Skeleton height={45} style={{ flex: 1 }} />
          </View>
        </View>

        <View style={styles.itemsContainer}>
          <Skeleton width={100} height={20} style={{ marginBottom: 15 }} />
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.foodCard}>
              <Skeleton width={120} height={120} borderRadius={0} />
              <View style={{ flex: 1, padding: 12 }}>
                <Skeleton width="70%" height={18} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={12} style={{ marginBottom: 4 }} />
                <Skeleton width="80%" height={12} style={{ marginBottom: 12 }} />
                <View style={styles.foodFooter}>
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
          title: category?.name || (loading ? 'Loading...' : 'Category'),
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: Theme.colors.deepBlue,
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
      {loading ? renderSkeleton() : (
        <ScrollView style={styles.container}>
          {/* Category Header */}
          {category && (
            <View style={styles.categoryHeader}>
              {category.imageUrl ? (
                <Image
                  source={{ uri: category.imageUrl }}
                  style={styles.categoryImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.categoryImage, { backgroundColor: Theme.colors.blueLight }]} />
              )}
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {category.description && (
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                )}
              </View>
            </View>
          )}

          {/* Search and Filters */}
          <View style={styles.filtersContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search food items..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.priceFilters}>
              <Text style={styles.filterLabel}>Price Range:</Text>
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
            {priceError ? <Text style={styles.errorText}>{priceError}</Text> : null}
          </View>

          {/* Food Items */}
          <View style={styles.itemsContainer}>
            <Text style={styles.itemsTitle}>
              {filteredItems.length} {filteredItems.length === 1 ? 'Item' : 'Items'}
            </Text>
            {filteredItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.foodCard}
                onPress={() => router.push(`/food-item/${item.id}`)}
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
                  <Text style={styles.restaurantName}>{item.restaurant.name}</Text>
                  {item.description && (
                    <Text style={styles.foodDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <View style={styles.foodFooter}>
                    <Text style={styles.foodPrice}>රු{Number(item.price || 0).toFixed(2)}</Text>
                    <TouchableOpacity style={styles.addButton}>
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
  categoryHeader: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: 220,
  },
  categoryInfo: {
    padding: 20,
  },
  categoryName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  categoryDescription: {
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
  priceFilters: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
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
  itemsContainer: {
    padding: 15,
  },
  itemsTitle: {
    fontSize: 18,
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
  restaurantName: {
    fontSize: 12,
    color: '#124569',
    marginBottom: 4,
  },
  foodDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  foodFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#124569',
  },
  addButton: {
    backgroundColor: '#124569',
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
  errorText: {
    color: '#DC2626',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'right',
  },
})
