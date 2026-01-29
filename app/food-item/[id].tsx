import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDispatch } from 'react-redux'
import { addItem } from '../../src/store/slices/cartSlice'
import { CategoryType } from '../../src/types'
import { Skeleton } from '../../src/components/SkeletonLoader'
import { Theme } from '../../src/styles/theme'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3000'

interface FoodCategory {
  id: number
  name: string
  type: string
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

interface Restaurant {
  id: string
  name: string
  logoUrl?: string
  address?: string
  phone?: string
}

interface FoodItem {
  id: number
  name: string
  price: number
  imageUrl?: string
  description?: string
  isAvailable: boolean
  quantity: number
  category: FoodCategory
  restaurant: Restaurant
  addons: FoodAddon[]
  variants: FoodItemVariant[]
}

export default function FoodItemDetailScreen() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const dispatch = useDispatch()
  const itemId = params.id as string

  const [foodItem, setFoodItem] = useState<FoodItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState<FoodItemVariant | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<number[]>([])
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    fetchFoodItem()
  }, [itemId])

  const fetchFoodItem = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/food-items/${itemId}`)
      const data = await response.json()
      setFoodItem(data)

      // If item has variants, select the first active variant by default
      if (data.variants && data.variants.length > 0) {
        const firstActiveVariant = data.variants.find((v: FoodItemVariant) => v.isActive)
        if (firstActiveVariant) {
          setSelectedVariant(firstActiveVariant)
        }
      }
    } catch (error) {
      console.error('Failed to fetch food item:', error)
      Alert.alert('Error', 'Failed to load food item details')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentPrice = (): number => {
    if (selectedVariant) {
      return Number(selectedVariant.price) || 0
    }
    return Number(foodItem?.price) || 0
  }

  const getTotalPrice = (): number => {
    const basePrice = getCurrentPrice()
    const addonsPrice = selectedAddons.reduce((sum, addonId) => {
      const addon = foodItem?.addons.find(a => a.id === addonId)
      return sum + (Number(addon?.price) || 0)
    }, 0)
    return (basePrice + addonsPrice) * quantity
  }

  const toggleAddon = (addonId: number) => {
    setSelectedAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    )
  }

  const handleAddToCart = () => {
    if (!foodItem) return

    const isSoldOut = foodItem.quantity === 0 || !foodItem.isAvailable
    if (isSoldOut) {
      Alert.alert('Out of Stock', 'This item is currently sold out.')
      return
    }

    // Determine item type based on category type
    let itemType: CategoryType
    if (foodItem.category?.type === 'food') {
      itemType = CategoryType.FOOD
    } else if (foodItem.category?.type === 'grocery') {
      itemType = CategoryType.GROCERY
    } else {
      itemType = CategoryType.MEDICINE
    }

    // Calculate total price including variant and addons
    const basePrice = getCurrentPrice()
    const addonsPrice = selectedAddons.reduce((sum, addonId) => {
      const addon = foodItem.addons.find(a => a.id === addonId)
      return sum + (Number(addon?.price) || 0)
    }, 0)
    const unitPrice = basePrice + addonsPrice

    // Build item name with variant and addons
    let itemName = foodItem.name
    if (selectedVariant) {
      itemName += ` (${selectedVariant.name})`
    }
    if (selectedAddons.length > 0) {
      const addonNames = selectedAddons
        .map(id => foodItem.addons.find(a => a.id === id)?.name)
        .filter(Boolean)
        .join(', ')
      itemName += ` with ${addonNames}`
    }

    // Get restaurant ID
    const restaurantId = foodItem.restaurant?.id ? parseInt(foodItem.restaurant.id) : undefined

    // Add item to cart with quantity
    dispatch(addItem({
      itemName: itemName,
      itemType: itemType,
      quantity: quantity,
      unitPrice: unitPrice,
      restaurantId: restaurantId,
    }))

    // Show success message
    Alert.alert(
      'Added to Cart',
      `${quantity}x ${itemName} added to cart`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => router.push('/cart') }
      ]
    )
  }

  const renderSkeleton = () => {
    return (
      <View style={styles.container}>
        <Skeleton height={300} borderRadius={0} />
        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Skeleton width="70%" height={28} style={{ marginBottom: 8 }} />
              <Skeleton width="40%" height={16} />
            </View>
            <Skeleton width={80} height={28} />
          </View>

          <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={16} style={{ marginBottom: 20 }} />

          <View style={styles.restaurantCard}>
            <Skeleton width={50} height={50} borderRadius={25} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Skeleton width="60%" height={18} style={{ marginBottom: 4 }} />
              <Skeleton width="80%" height={14} />
            </View>
          </View>

          <Skeleton width={150} height={20} style={{ marginBottom: 15 }} />
          <View style={styles.variantsContainer}>
            <Skeleton width={120} height={60} borderRadius={12} />
            <Skeleton width={120} height={60} borderRadius={12} />
          </View>

          <View style={{ marginTop: 25 }}>
            <Skeleton width={150} height={20} style={{ marginBottom: 15 }} />
            <Skeleton height={50} borderRadius={12} style={{ marginBottom: 10 }} />
            <Skeleton height={50} borderRadius={12} />
          </View>
        </View>
      </View>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: foodItem?.name || (loading ? 'Loading...' : 'Item Details'),
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: Theme.colors.deepBlue,
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
      {loading ? renderSkeleton() : (
        <>
          {!foodItem ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={64} color="#CCC" />
              <Text style={styles.errorText}>Food item not found</Text>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView style={styles.container}>
                {/* Food Item Image */}
                <View style={styles.imageContainer}>
                  {foodItem.imageUrl ? (
                    <Image
                      source={{ uri: foodItem.imageUrl }}
                      style={styles.foodImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.foodImage, styles.placeholderImage]}>
                      <Text style={styles.placeholderEmoji}>🍽️</Text>
                    </View>
                  )}
                  {(foodItem.quantity === 0 || !foodItem.isAvailable) && (
                    <View style={styles.soldOutOverlay}>
                      <Text style={styles.soldOutText}>Sold Out</Text>
                    </View>
                  )}
                </View>

                {/* Food Item Info */}
                <View style={styles.infoContainer}>
                  <View style={styles.headerRow}>
                    <View style={styles.titleContainer}>
                      <Text style={styles.foodName}>{foodItem.name}</Text>
                      <Text style={styles.foodCategory}>{foodItem.category.name}</Text>
                    </View>
                    <Text style={styles.price}>රු{getCurrentPrice().toFixed(2)}</Text>
                  </View>

                  {foodItem.description && (
                    <Text style={styles.description}>{foodItem.description}</Text>
                  )}

                  {/* Restaurant Info */}
                  <TouchableOpacity
                    style={styles.restaurantCard}
                    onPress={() => router.push(`/restaurant/${foodItem.restaurant.id}`)}
                  >
                    <View style={styles.restaurantInfo}>
                      {foodItem.restaurant.logoUrl && (
                        <Image
                          source={{ uri: foodItem.restaurant.logoUrl }}
                          style={styles.restaurantLogo}
                        />
                      )}
                      <View style={styles.restaurantDetails}>
                        <Text style={styles.restaurantName}>{foodItem.restaurant.name}</Text>
                        {foodItem.restaurant.address && (
                          <Text style={styles.restaurantAddress} numberOfLines={1}>
                            {foodItem.restaurant.address}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </TouchableOpacity>

                  {/* Variants */}
                  {foodItem.variants && foodItem.variants.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Select Size/Variant</Text>
                      <View style={styles.variantsContainer}>
                        {foodItem.variants.map((variant) => (
                          <TouchableOpacity
                            key={variant.id}
                            style={[
                              styles.variantCard,
                              selectedVariant?.id === variant.id && styles.variantCardSelected,
                              !variant.isActive && styles.variantCardDisabled
                            ]}
                            onPress={() => variant.isActive && setSelectedVariant(variant)}
                            disabled={!variant.isActive}
                          >
                            <Text style={[
                              styles.variantName,
                              selectedVariant?.id === variant.id && styles.variantNameSelected,
                              !variant.isActive && styles.variantNameDisabled
                            ]}>
                              {variant.name}
                            </Text>
                            <Text style={[
                              styles.variantPrice,
                              selectedVariant?.id === variant.id && styles.variantPriceSelected,
                              !variant.isActive && styles.variantPriceDisabled
                            ]}>
                              රු{Number(variant.price || 0).toFixed(2)}
                            </Text>
                            {!variant.isActive && (
                              <Text style={styles.variantSoldOut}>Sold Out</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Addons */}
                  {foodItem.addons && foodItem.addons.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Add-ons (Optional)</Text>
                      {foodItem.addons.map((addon) => (
                        <TouchableOpacity
                          key={addon.id}
                          style={[
                            styles.addonCard,
                            selectedAddons.includes(addon.id) && styles.addonCardSelected
                          ]}
                          onPress={() => toggleAddon(addon.id)}
                        >
                          <View style={styles.addonInfo}>
                            <Text style={[
                              styles.addonName,
                              selectedAddons.includes(addon.id) && styles.addonNameSelected
                            ]}>
                              {addon.name}
                            </Text>
                            <Text style={[
                              styles.addonPrice,
                              selectedAddons.includes(addon.id) && styles.addonPriceSelected
                            ]}>
                              +රු{Number(addon.price || 0).toFixed(2)}
                            </Text>
                          </View>
                          {selectedAddons.includes(addon.id) && (
                            <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Quantity Selector */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quantity</Text>
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        style={[styles.quantityButton, quantity === 1 && styles.quantityButtonDisabled]}
                        onPress={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity === 1}
                      >
                        <Ionicons name="remove" size={20} color={quantity === 1 ? "#CCC" : "#1E3A8A"} />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => setQuantity(quantity + 1)}
                      >
                        <Ionicons name="add" size={20} color="#1E3A8A" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Total Price */}
                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalPrice}>රු{getTotalPrice().toFixed(2)}</Text>
                  </View>
                </View>
              </ScrollView>

              {/* Add to Cart Button */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.addToCartButton, (foodItem.quantity === 0 || !foodItem.isAvailable) && styles.addToCartButtonDisabled]}
                  onPress={handleAddToCart}
                  disabled={foodItem.quantity === 0 || !foodItem.isAvailable}
                >
                  <Ionicons name="cart" size={20} color="#FFF" style={styles.cartIcon} />
                  <Text style={styles.addToCartText}>
                    {(foodItem.quantity === 0 || !foodItem.isAvailable) ? 'Sold Out' : 'Add to Cart'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: 350,
    position: 'relative',
    backgroundColor: Theme.colors.backgroundLight,
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 80,
  },
  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOutText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: '#E53E3E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  infoContainer: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  titleContainer: {
    flex: 1,
    marginRight: 15,
  },
  foodName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
    marginBottom: 5,
  },
  foodCategory: {
    fontSize: 14,
    color: '#666',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.backgroundLight,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  restaurantLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.deepBlue,
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
    marginBottom: 15,
  },
  variantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  variantCard: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 15,
    minWidth: 120,
    alignItems: 'center',
  },
  variantCardSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.orangeLight,
  },
  variantCardDisabled: {
    opacity: 0.5,
  },
  variantName: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.deepBlue,
    marginBottom: 5,
  },
  variantNameSelected: {
    color: Theme.colors.primary,
  },
  variantNameDisabled: {
    color: '#999',
  },
  variantPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  variantPriceSelected: {
    color: Theme.colors.primary,
  },
  variantPriceDisabled: {
    color: '#999',
  },
  variantSoldOut: {
    fontSize: 10,
    color: '#E53E3E',
    marginTop: 5,
    fontWeight: '600',
  },
  addonCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  addonCardSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.orangeLight,
  },
  addonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addonName: {
    fontSize: 16,
    color: Theme.colors.deepBlue,
    flex: 1,
  },
  addonNameSelected: {
    fontWeight: '600',
  },
  addonPrice: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
  },
  addonPriceSelected: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Theme.colors.deepBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    borderColor: '#E0E0E0',
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
    minWidth: 40,
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.deepBlue,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  addToCartButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#CCC',
  },
  cartIcon: {
    marginRight: 10,
  },
  addToCartText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
})
