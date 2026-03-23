import { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator } from 'react-native'
import { resolveImageUrl } from '../../src/utils/imageUrl'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Skeleton, SkeletonProvider } from '../../src/components/SkeletonLoader'
import FloatingCartButton from '../../src/components/FloatingCartButton'
import { Theme } from '../../src/styles/theme'
import { useDebounce } from '../../src/hooks/useDebounce'
import { foodCategoryApi, foodItemApi, FoodItemFilters } from '../../src/lib/api'

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
  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [priceError, setPriceError] = useState('')

  const PAGE_SIZE = 10

  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  const debouncedMinPrice = useDebounce(minPrice, 500)
  const debouncedMaxPrice = useDebounce(maxPrice, 500)

  const buildFilters = useCallback((page: number = 1): Omit<FoodItemFilters, 'categoryId'> => {
    const filters: Omit<FoodItemFilters, 'categoryId'> = { page, limit: PAGE_SIZE }
    if (debouncedSearchQuery) filters.search = debouncedSearchQuery
    if (debouncedMinPrice && !isNaN(parseFloat(debouncedMinPrice))) filters.minPrice = parseFloat(debouncedMinPrice)
    if (debouncedMaxPrice && !isNaN(parseFloat(debouncedMaxPrice))) filters.maxPrice = parseFloat(debouncedMaxPrice)
    return filters
  }, [debouncedSearchQuery, debouncedMinPrice, debouncedMaxPrice])

  useEffect(() => {
    fetchCategory()
  }, [categoryId])

  useEffect(() => {
    fetchFoodItems(1, false)
  }, [categoryId, debouncedSearchQuery, debouncedMinPrice, debouncedMaxPrice])

  const fetchCategory = async () => {
    try {
      const categoryRes = await foodCategoryApi.getById(Number(categoryId))
      setCategory(categoryRes.data)
    } catch (error) {
      if (__DEV__) console.error('Failed to fetch category:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const fetchFoodItems = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const filters = buildFilters(page)
      const foodItemsRes = await foodItemApi.getByCategory(Number(categoryId), filters)
      
      const responseData = foodItemsRes.data
      const newFoodItems = Array.isArray(responseData?.data) ? responseData.data : []
      const total = responseData?.total || 0

      if (append) {
        setFoodItems(prev => {
          const existingIds = new Set(prev.map((item) => item.id))
          const uniqueNewItems = newFoodItems.filter((item) => !existingIds.has(item.id))
          return [...prev, ...uniqueNewItems]
        })
      } else {
        setFoodItems(newFoodItems)
      }
      
      setTotalItems(total)
    } catch (error) {
      if (__DEV__) console.error('Failed to fetch food items:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    fetchFoodItems(1, false)
  }, [buildFilters])

  const loadMore = useCallback(() => {
    if (!loadingMore && !loading && foodItems.length < totalItems) {
      const nextPage = Math.ceil(foodItems.length / PAGE_SIZE) + 1
      fetchFoodItems(nextPage, true)
    }
  }, [loadingMore, loading, foodItems.length, totalItems])

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
      <SkeletonProvider>
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
            <View style={styles.priceFiltersRow}>
              <Skeleton width={100} height={16} style={{ marginRight: 10 }} />
              <Skeleton height={45} style={{ flex: 1 }} />
              <View style={{ width: 20 }} />
              <Skeleton height={45} style={{ flex: 1 }} />
            </View>
          </View>

          <View style={styles.listContent}>
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
      </SkeletonProvider>
    )
  }

  const renderFoodItem = useCallback(
    ({ item }: { item: FoodItem }) => (
      <TouchableOpacity
        style={styles.foodCard}
        onPress={() => router.push(`/food-item/${item.id}`)}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: resolveImageUrl(item.imageUrl) ?? item.imageUrl }}
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
    ),
    [router],
  )

  const ListHeader = useCallback(
    () => (
      <>
        {category && (
          <View style={styles.categoryHeader}>
            {category.imageUrl ? (
              <Image
                source={{ uri: resolveImageUrl(category.imageUrl) ?? category.imageUrl }}
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

        <View style={styles.itemsTitleContainer}>
          <Text style={styles.itemsTitle}>
            {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
          </Text>
        </View>
      </>
    ),
    [category, searchQuery, minPrice, maxPrice, priceError, totalItems],
  )

  const ListFooter = useCallback(
    () => {
      if (loadingMore) {
        return (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="large" color="#124569" />
            <Text style={styles.loadingMoreText}>Loading more items...</Text>
          </View>
        )
      }
      if (foodItems.length > 0 && foodItems.length >= totalItems) {
        return (
          <View style={styles.endOfListContainer}>
            <Text style={styles.endOfListText}>No more items</Text>
          </View>
        )
      }
      return null
    },
    [loadingMore, foodItems.length, totalItems],
  )

  const ListEmpty = useCallback(
    () => {
      if (loading) {
        return (
          <View style={styles.dataLoadingContainer}>
            <ActivityIndicator size="large" color="#124569" />
            <Text style={styles.dataLoadingText}>Loading items...</Text>
          </View>
        )
      }
      return (
        <View style={styles.emptyState}>
          <Ionicons name="fast-food-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No items found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
        </View>
      )
    },
    [loading],
  )

  return (
    <>
      <Stack.Screen
        options={{
          title: category?.name || (initialLoading ? 'Loading...' : 'Category'),
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: Theme.colors.deepBlue,
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
      {initialLoading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={foodItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFoodItem}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
      <FloatingCartButton />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  itemsTitleContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  listContent: {
    paddingBottom: 20,
  },
  priceFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 15,
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
  dataLoadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  endOfListContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
})