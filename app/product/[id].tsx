import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAppDispatch } from '../../src/store/store'
import { addItemToCart } from '../../src/store/slices/cartSlice'
import { CategoryType } from '../../src/types'
import { Skeleton } from '../../src/components/SkeletonLoader'
import { Theme } from '../../src/styles/theme'
import FloatingCartButton from '../../src/components/FloatingCartButton'
import ImageWithFallback from '../../src/components/ImageWithFallback'
import { productApi } from '../../src/lib/productApi'
import { Product, ProductCategory } from '../../src/types/product'

export default function ProductDetailScreen() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    fetchProduct()
  }, [productId])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const data = await productApi.getById(productId)
      setProduct(data)
    } catch (error) {
      console.error('Failed to fetch product:', error)
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!product) return

    if (!product.inStock || product.stock === 0) {
      Alert.alert('Out of Stock', 'This product is currently unavailable.')
      return
    }

    let itemType: CategoryType
    if (product.category === ProductCategory.FOOD) {
      itemType = CategoryType.FOOD
    } else if (product.category === ProductCategory.GROCERY) {
      itemType = CategoryType.GROCERY
    } else if (product.category === ProductCategory.MEDICINE) {
      itemType = CategoryType.MEDICINE
    } else {
      itemType = CategoryType.MEDICINE
    }

    const unitPrice = product.discountPrice ?? product.price

    dispatch(addItemToCart({
      itemName: product.name,
      itemType,
      quantity,
      unitPrice: Number(unitPrice),
      restaurantId: undefined,
    }))
      .unwrap()
      .catch((error) => {
        Alert.alert('Error', error || 'Failed to add item to cart')
      })
  }

  const renderSkeleton = () => (
    <View style={styles.container}>
      <Skeleton height={300} borderRadius={0} />
      <View style={styles.infoContainer}>
        <Skeleton width="70%" height={28} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={16} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={60} style={{ marginBottom: 16 }} />
        <Skeleton width={150} height={44} />
      </View>
    </View>
  )

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Loading...', headerShown: true }} />
        {renderSkeleton()}
      </>
    )
  }

  if (!product) {
    return (
      <>
        <Stack.Screen options={{ title: 'Product', headerShown: true }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CCC" />
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: product.name,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: Theme.colors.deepBlue,
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.imageContainer}>
          <ImageWithFallback
            source={product.mainImage}
            style={styles.productImage}
            contentFit="cover"
          />
          {(!product.inStock || product.stock === 0) && (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutText}>Out of Stock</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productCategory}>{product.category}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              රු{Number(product.discountPrice ?? product.price).toFixed(2)}
            </Text>
            {product.discountPrice && (
              <Text style={styles.originalPrice}>
                රු{Number(product.price).toFixed(2)}
              </Text>
            )}
          </View>

          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          {product.vendor?.name && (
            <View style={styles.vendorRow}>
              <Ionicons name="storefront-outline" size={20} color="#666" />
              <Text style={styles.vendorText}>{product.vendor.name}</Text>
            </View>
          )}

          <View style={styles.quantityRow}>
            <Text style={styles.quantityLabel}>Quantity:</Text>
            <View style={styles.quantityButtons}>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => setQuantity(q => Math.max(1, q - 1))}
              >
                <Ionicons name="remove" size={20} color="#333" />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => setQuantity(q => Math.min(product.stock || 99, q + 1))}
              >
                <Ionicons name="add" size={20} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addToCartBtn, (!product.inStock || product.stock === 0) && styles.addToCartBtnDisabled]}
            onPress={handleAddToCart}
            disabled={!product.inStock || product.stock === 0}
          >
            <Ionicons name="cart-outline" size={22} color="#FFF" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <FloatingCartButton />
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  imageContainer: { width: '100%', height: 300, backgroundColor: '#F5F5F5' },
  productImage: { width: '100%', height: '100%' },
  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  infoContainer: { padding: 20 },
  productName: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 4 },
  productCategory: { fontSize: 14, color: '#666', marginBottom: 12, textTransform: 'capitalize' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  price: { fontSize: 22, fontWeight: '700', color: Theme.colors.primary },
  originalPrice: { fontSize: 16, color: '#999', textDecorationLine: 'line-through' },
  description: { fontSize: 15, color: '#444', lineHeight: 22, marginBottom: 16 },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  vendorText: { fontSize: 14, color: '#666' },
  quantityRow: { marginBottom: 24 },
  quantityLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  quantityButtons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  quantityBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center' },
  quantityValue: { fontSize: 18, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  addToCartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Theme.colors.primary, padding: 16, borderRadius: 12 },
  addToCartBtnDisabled: { backgroundColor: '#CCC', opacity: 0.7 },
  addToCartText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { fontSize: 18, color: '#666', marginTop: 16, textAlign: 'center' },
  backButton: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Theme.colors.primary, borderRadius: 12 },
  backButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
})
