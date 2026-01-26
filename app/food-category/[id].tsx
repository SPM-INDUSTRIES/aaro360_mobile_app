import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

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

  useEffect(() => {
    fetchData()
  }, [categoryId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [categoryRes, foodItemsRes] = await Promise.all([
        fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3000'}/food-categories/${categoryId}`),
        fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3000'}/food-items/category/${categoryId}`),
      ])

      const categoryData = await categoryRes.json()
      const foodItemsData = await foodItemsRes.json()

      setCategory(categoryData)
      setFoodItems(foodItemsData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = foodItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMinPrice = !minPrice || item.price >= parseFloat(minPrice)
    const matchesMaxPrice = !maxPrice || item.price <= parseFloat(maxPrice)
    return matchesSearch && matchesMinPrice && matchesMaxPrice && item.isAvailable
  })

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: category?.name || 'Category',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#000000',
        }}
      />
      <ScrollView style={styles.container}>
        {/* Category Header */}
        {category && (
          <View style={styles.categoryHeader}>
            {category.imageUrl && (
              <Image
                source={{ uri: category.imageUrl }}
                style={styles.categoryImage}
                resizeMode="cover"
              />
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
  },
  categoryImage: {
    width: '100%',
    height: 150,
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
    color: '#0066FF',
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
