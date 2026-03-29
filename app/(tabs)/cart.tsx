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
import { SafeAreaView } from 'react-native-safe-area-context'
import { Theme } from '../../src/styles/theme'
import { rs, rf, hp, wp } from '../../src/utils/responsive'

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
    <SafeAreaView style={styles.container} edges={['top']}>
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
            <Ionicons name="cart-outline" size={rs(80)} color="#CCC" />
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
                    <Ionicons name="remove" size={rs(20)} color={Theme.colors.deepBlue} />
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
                    <Ionicons name="add" size={rs(20)} color={Theme.colors.deepBlue} />
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
                    <Ionicons name="trash-outline" size={rs(20)} color="#E53E3E" />
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
            <Ionicons name="arrow-forward" size={rs(20)} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: rs(Theme.spacing.lg),
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.white,
  },
  title: {
    fontSize: rf(Theme.fontSize.xxl),
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
  },
  clearText: {
    fontSize: rf(Theme.fontSize.base),
    color: '#E53E3E',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: rs(Theme.spacing.lg),
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp(12),
  },
  emptyText: {
    fontSize: rf(Theme.fontSize.xl),
    fontWeight: '600',
    color: Theme.colors.textGray,
    marginTop: rs(Theme.spacing.lg),
  },
  emptySubtext: {
    fontSize: rf(Theme.fontSize.base),
    color: '#999',
    marginTop: rs(Theme.spacing.sm),
    marginBottom: rs(Theme.spacing.xxl),
  },
  shopButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: rs(30),
    paddingVertical: rs(Theme.spacing.md),
    borderRadius: Theme.borderRadius.md,
    minHeight: Theme.touchTarget.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopButtonText: {
    color: '#FFF',
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '600',
  },
  cartItem: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: rs(Theme.spacing.base),
    marginBottom: rs(Theme.spacing.md),
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.small,
  },
  itemInfo: {
    marginBottom: rs(Theme.spacing.md),
  },
  itemName: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: rs(4),
  },
  itemType: {
    fontSize: rf(Theme.fontSize.xs),
    color: Theme.colors.textGray,
    textTransform: 'capitalize',
    marginBottom: rs(4),
  },
  itemPrice: {
    fontSize: rf(Theme.fontSize.sm),
    color: Theme.colors.textGray,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(Theme.spacing.md),
  },
  quantityButton: {
    width: Theme.touchTarget.small,
    height: Theme.touchTarget.small,
    borderRadius: Theme.touchTarget.small / 2,
    borderWidth: 1,
    borderColor: Theme.colors.deepBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: '600',
    color: Theme.colors.deepBlue,
    minWidth: rs(40),
    textAlign: 'center',
  },
  itemTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: rs(Theme.spacing.md),
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  itemTotalText: {
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
  },
  removeButton: {
    padding: rs(Theme.spacing.sm),
  },
  summary: {
    backgroundColor: '#F8F8F8',
    borderRadius: Theme.borderRadius.lg,
    padding: rs(Theme.spacing.lg),
    marginTop: rs(Theme.spacing.lg),
    marginBottom: rs(Theme.spacing.lg),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: rs(Theme.spacing.md),
  },
  summaryLabel: {
    fontSize: rf(Theme.fontSize.base),
    color: Theme.colors.textGray,
  },
  summaryValue: {
    fontSize: rf(Theme.fontSize.base),
    color: '#1A1A1A',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: rs(Theme.spacing.md),
    marginTop: rs(Theme.spacing.sm),
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: rf(Theme.fontSize.xl),
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: rf(Theme.fontSize.xl),
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  footer: {
    padding: rs(Theme.spacing.lg),
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.white,
  },
  checkoutButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.lg,
    padding: rs(Theme.spacing.base),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: rs(10),
    minHeight: Theme.touchTarget.medium,
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: 'bold',
  },
})
