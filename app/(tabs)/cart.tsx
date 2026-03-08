import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useAppDispatch, useAppSelector } from '../../src/store/store'
import {
  removeCartItem,
  updateCartItemQuantity,
  clearCartAsync,
  fetchCart
} from '../../src/store/slices/cartSlice'
import { Ionicons } from '@expo/vector-icons'

export default function CartScreen() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { items, total, deliveryFee, discount, loading } = useAppSelector(
    (state) => state.cart
  )

  useEffect(() => {
    dispatch(fetchCart())
  }, [dispatch])

  const handleCheckout = () => {
    if (items.length > 0) {
      router.push('/checkout')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={() => dispatch(clearCartAsync())}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={80} color="#CCC" />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <Text style={styles.emptySubtext}>Add items to get started</Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push('/search')}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {items.map((item, index) => (
              <View key={index} style={styles.cartItem}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.itemName}</Text>
                  <Text style={styles.itemType}>{item.itemType}</Text>
                  <Text style={styles.itemPrice}>රු{Number(item.unitPrice || 0).toFixed(2)} each</Text>
                </View>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => {
                      if (item.id) {
                        if (item.quantity > 1) {
                          dispatch(updateCartItemQuantity({ id: item.id, quantity: item.quantity - 1 }))
                        } else {
                          dispatch(removeCartItem(item.id))
                        }
                      }
                    }}
                  >
                    <Ionicons name="remove" size={20} color="#1E3A8A" />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => {
                      if (item.id) {
                        dispatch(updateCartItemQuantity({ id: item.id, quantity: item.quantity + 1 }))
                      }
                    }}
                  >
                    <Ionicons name="add" size={20} color="#1E3A8A" />
                  </TouchableOpacity>
                </View>
                <View style={styles.itemTotal}>
                  <Text style={styles.itemTotalText}>
                    රු{(Number(item.unitPrice || 0) * item.quantity).toFixed(2)}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => item.id && dispatch(removeCartItem(item.id))}
                  >
                    <Ionicons name="trash-outline" size={20} color="#E53E3E" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.summary}>
              {deliveryFee > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery Fee</Text>
                  <Text style={styles.summaryValue}>රු{deliveryFee.toFixed(2)}</Text>
                </View>
              )}
              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={styles.summaryValue}>-රු{discount.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>රු{total.toFixed(2)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#124569',
  },
  clearText: {
    fontSize: 16,
    color: '#E53E3E',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    marginBottom: 30,
  },
  shopButton: {
    backgroundColor: '#f27424',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cartItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemInfo: {
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#124569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#124569',
    minWidth: 40,
    textAlign: 'center',
  },
  itemTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  itemTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#124569',
  },
  removeButton: {
    padding: 8,
  },
  summary: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f27424',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  checkoutButton: {
    backgroundColor: '#f27424',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
})
