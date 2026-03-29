import { useState, useEffect } from 'react'
import { Theme } from '../src/styles/theme'

import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { orderApi } from '../src/lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'
import { rs, rf, hp } from '../src/utils/responsive'

interface Order {
  id: number
  orderNumber: string
  status: string
  deliveryAddress: string
  deliveryLatitude: number
  deliveryLongitude: number
  estimatedDeliveryMinutes?: number
  total: number
  items: any[]
}

export default function OrderTrackingScreen() {
  const { id, fromCheckout } = useLocalSearchParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await orderApi.getById(Number(id))
      setOrder(response.data)
    } catch (error) {
      console.error('Failed to fetch order:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top']}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </SafeAreaView>
    )
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top']}>
        <Text style={styles.errorText}>Order not found</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {!fromCheckout && (
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={rs(24)} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topNavTitle}>Order Details</Text>
          <View style={{ width: rs(44) }} />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {fromCheckout ? (
          <View style={styles.header}>
            <Ionicons name="checkmark-circle" size={rs(60)} color="#10B981" style={styles.successIcon} />
            <Text style={styles.orderNumber}>Order Placed Successfully!</Text>
            <Text style={styles.orderId}>Order ID: #{order.orderNumber}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {order.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Created'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.header, { alignItems: 'flex-start' }]}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.orderIdTitle}>Order #{order.orderNumber}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {order.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Created'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Items Ordered</Text>
          {order.items && order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemQuantityBadge}>
                <Text style={styles.itemQuantityText}>{item.quantity}x</Text>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <Text style={styles.itemType}>{item.itemType}</Text>
              </View>
              <Text style={styles.itemPrice}>
                රු{(item.unitPrice * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.totalSummaryRow}>
            <Text style={styles.totalSummaryLabel}>Total Amount</Text>
            <Text style={styles.totalSummaryValue}>රු{Number(order.total || 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Delivery Information</Text>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={rs(20)} color="#6B7280" />
            <View style={styles.detailText}>
              <Text style={styles.infoLabel}>Delivery Address</Text>
              <Text style={styles.infoValue}>{order.deliveryAddress || 'Address not provided'}</Text>
            </View>
          </View>

          {order.estimatedDeliveryMinutes && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={rs(20)} color="#6B7280" />
              <View style={styles.detailText}>
                <Text style={styles.infoLabel}>Estimated Delivery</Text>
                <Text style={styles.infoValue}>{order.estimatedDeliveryMinutes} minutes</Text>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={rs(20)} color="#6B7280" />
            <View style={styles.detailText}>
              <Text style={styles.infoLabel}>Order Date</Text>
              <Text style={styles.infoValue}>
                {new Date((order as any).createdAt || Date.now()).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>
        </View>

        {fromCheckout && (
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.replace('/(tabs)/')}
          >
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: rs(40) }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: rs(Theme.spacing.lg),
    paddingHorizontal: rs(15),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: rs(10),
    minHeight: Theme.touchTarget.medium,
    justifyContent: 'center',
  },
  topNavTitle: {
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: rs(30),
    paddingTop: rs(40),
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: rs(10),
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  orderIdTitle: {
    fontSize: rf(Theme.fontSize.xl),
    fontWeight: '800',
    color: '#111827',
  },
  successIcon: {
    marginBottom: rs(Theme.spacing.lg),
  },
  orderNumber: {
    fontSize: rf(22),
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  orderId: {
    fontSize: rf(Theme.fontSize.sm),
    color: '#6B7280',
    marginTop: rs(Theme.spacing.sm),
  },
  statusBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: rs(Theme.spacing.md),
    paddingVertical: rs(6),
    borderRadius: 20,
  },
  statusText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: rf(Theme.fontSize.xs),
    textTransform: 'uppercase',
  },
  detailsCard: {
    margin: rs(15),
    padding: rs(Theme.spacing.lg),
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '700',
    color: '#111827',
    marginBottom: rs(Theme.spacing.lg),
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rs(Theme.spacing.base),
  },
  itemQuantityBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: rs(Theme.spacing.sm),
    paddingVertical: rs(4),
    borderRadius: 6,
    marginRight: rs(Theme.spacing.md),
  },
  itemQuantityText: {
    fontSize: rf(Theme.fontSize.xs),
    fontWeight: '700',
    color: '#4B5563',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: rf(15),
    fontWeight: '600',
    color: '#111827',
  },
  itemType: {
    fontSize: rf(Theme.fontSize.xs),
    color: '#9CA3AF',
    textTransform: 'capitalize',
    marginTop: rs(2),
  },
  itemPrice: {
    fontSize: rf(15),
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: rs(15),
  },
  totalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSummaryLabel: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '700',
    color: '#111827',
  },
  totalSummaryValue: {
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: rs(Theme.spacing.lg),
  },
  detailText: {
    marginLeft: rs(15),
    flex: 1,
  },
  infoLabel: {
    fontSize: rf(Theme.fontSize.xs),
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: rf(15),
    color: '#374151',
    fontWeight: '600',
    marginTop: rs(4),
  },
  homeButton: {
    backgroundColor: Theme.colors.primary,
    padding: rs(Theme.spacing.base),
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    margin: rs(15),
    minHeight: Theme.touchTarget.medium,
    justifyContent: 'center',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: rf(Theme.fontSize.base),
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: rs(10),
    color: '#6B7280',
    fontSize: rf(Theme.fontSize.sm),
  },
  errorText: {
    fontSize: rf(Theme.fontSize.xl),
    color: '#EF4444',
    fontWeight: '600',
  },
})
