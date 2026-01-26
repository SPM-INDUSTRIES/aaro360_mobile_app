import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

interface Restaurant {
  id: number
  name: string
  logoUrl?: string
  coverImageUrl?: string
  address?: string
  phone?: string
  isActive: boolean
}

export default function AllRestaurantsScreen() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      const response = await fetch('${process.env.EXPO_PUBLIC_API_URL}/vendors?type=restaurant')
      const data = await response.json()
      setRestaurants(data.data || [])
    } catch (error) {
      console.error('Failed to fetch restaurants:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) && restaurant.isActive
  )

  return (
    <>
      <Stack.Screen
        options={{
          title: 'All Restaurants',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#000000',
        }}
      />
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search restaurants..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066FF" />
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {filteredRestaurants.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                style={styles.restaurantCard}
                onPress={() => router.push(`/restaurant/${restaurant.id}`)}
              >
                {restaurant.coverImageUrl ? (
                  <Image
                    source={{ uri: restaurant.coverImageUrl }}
                    style={styles.coverImage}
                  />
                ) : (
                  <View style={[styles.coverImage, styles.placeholderCover]}>
                    <Text style={styles.placeholderEmoji}>🍽️</Text>
                  </View>
                )}
                <View style={styles.restaurantInfo}>
                  {restaurant.logoUrl ? (
                    <Image
                      source={{ uri: restaurant.logoUrl }}
                      style={styles.logo}
                    />
                  ) : (
                    <View style={[styles.logo, styles.placeholderLogo]}>
                      <Text style={styles.logoEmoji}>🍴</Text>
                    </View>
                  )}
                  <View style={styles.restaurantDetails}>
                    <Text style={styles.restaurantName}>{restaurant.name}</Text>
                    {restaurant.address && (
                      <Text style={styles.restaurantAddress} numberOfLines={1}>
                        {restaurant.address}
                      </Text>
                    )}
                    {restaurant.phone && (
                      <Text style={styles.restaurantPhone}>{restaurant.phone}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#999" />
                </View>
              </TouchableOpacity>
            ))}

            {filteredRestaurants.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No restaurants found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  restaurantCard: {
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
  coverImage: {
    width: '100%',
    height: 150,
  },
  placeholderCover: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  restaurantInfo: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginTop: -30,
  },
  placeholderLogo: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 24,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  restaurantPhone: {
    fontSize: 14,
    color: '#666',
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
