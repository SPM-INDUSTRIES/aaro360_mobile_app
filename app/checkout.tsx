import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSelector } from 'react-redux'
import { store, RootState, useAppDispatch } from '../src/store/store'
import { clearCartAsync } from '../src/store/slices/cartSlice'
import { orderApi, userApi } from '../src/lib/api'
import { useState, useEffect, useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'

const CUSTOMER_ID_STORAGE_KEY = '@aaro360/customerId'

export default function CheckoutScreen() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const { items, total, deliveryFee } = useSelector((state: RootState) => state.cart)

  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch user profile to get saved address whenever the screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchUserProfile = async () => {
        if (user?.id) {
          try {
            console.log('Fetching profile for user:', user.id)
            const response = await userApi.getProfile(user.id)
            if (response.data?.address) {
              console.log('Found saved address:', response.data.address)
              setDeliveryAddress(response.data.address)
            }
          } catch (error) {
            console.error('Failed to fetch user profile:', error)
          }
        }
      }
      fetchUserProfile()
    }, [user?.id])
  )

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      Alert.alert('Error', 'Please enter delivery address')
      return
    }

    setIsSubmitting(true)
    try {
      if (!user?.id) {
        Alert.alert('Error', 'You must be logged in to place an order')
        return
      }

      const customerId = user.id

      // Ensure all items have valid data
      if (items.length === 0) {
        Alert.alert('Error', 'Your cart is empty')
        return
      }

      const orderData = {
        customerId: Number(customerId),
        items: items.map((item) => {
          if (!item.itemName || item.quantity <= 0 || item.unitPrice <= 0) {
            throw new Error(`Invalid item: ${item.itemName}`)
          }
          return {
            itemName: String(item.itemName),
            itemType: String(item.itemType || 'food'), // Ensure itemType is always a string
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          }
        }),
        deliveryAddress: String(deliveryAddress).trim(),
        deliveryLatitude: parseFloat('25.2048'), // TODO: Get from location
        deliveryLongitude: parseFloat('55.2708'),
        deliveryFee: Number(deliveryFee || 0),
        discount: Number(0), // Add discount field
        paymentMethod: String(paymentMethod || 'cash_on_delivery'),
      }

      const response = await orderApi.create(orderData)
      dispatch(clearCartAsync())

      // Backend returns order object directly in response.data
      const order = response.data
      console.log('Order creation response:', JSON.stringify(order, null, 2))

      if (!order || !order.id) {
        throw new Error('Invalid order response')
      }

      router.push(`/order-tracking?id=${order.id}&fromCheckout=true`)
    } catch (error: any) {
      console.error('Order creation error:', error)
      console.error('Error response:', error.response?.data)

      // Extract validation errors if present
      let errorMessage = 'Failed to place order'
      if (error.response?.status === 400) {
        const validationErrors = error.response?.data?.message
        if (Array.isArray(validationErrors)) {
          errorMessage = 'Validation errors:\n' + validationErrors.join('\n')
        } else if (typeof validationErrors === 'string') {
          errorMessage = validationErrors
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else {
          errorMessage = 'Invalid request data. Please check all fields.'
        }
      } else {
        errorMessage = error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          'Unknown error'
      }
      Alert.alert('Order Error', errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your delivery address"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'cash_on_delivery' && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod('cash_on_delivery')}
          >
            <Ionicons name="cash-outline" size={24} color="#000" />
            <Text style={styles.paymentText}>Cash on Delivery</Text>
            {paymentMethod === 'cash_on_delivery' && (
              <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              ${(total - deliveryFee).toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeOrderButton, isSubmitting && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting}
        >
          <Text style={styles.placeOrderButtonText}>
            {isSubmitting ? 'Placing Order...' : 'Place Order'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    gap: 15,
  },
  paymentOptionActive: {
    borderColor: '#FFD700',
    backgroundColor: '#FFF9E6',
  },
  paymentText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 10,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  placeOrderButton: {
    backgroundColor: '#000000',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeOrderButtonDisabled: {
    opacity: 0.6,
  },
  placeOrderButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
