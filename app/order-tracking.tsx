import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { orderApi } from '../src/lib/api'

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
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    )
  }

  if (!order) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Order not found</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Custom Header with Back Button */}
      {!fromCheckout && (
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topNavTitle}>Order Details</Text>
          <View style={{ width: 44 }} />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Conditional Success Header */}
        {fromCheckout ? (
          <View style={styles.header}>
            <Ionicons name="checkmark-circle" size={60} color="#10B981" style={styles.successIcon} />
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

        {/* Order Items Section */}
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

        {/* Delivery Info Section */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Delivery Information</Text>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#6B7280" />
            <View style={styles.detailText}>
              <Text style={styles.infoLabel}>Delivery Address</Text>
              <Text style={styles.infoValue}>{order.deliveryAddress || 'Address not provided'}</Text>
            </View>
          </View>

          {order.estimatedDeliveryMinutes && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <View style={styles.detailText}>
                <Text style={styles.infoLabel}>Estimated Delivery</Text>
                <Text style={styles.infoValue}>{order.estimatedDeliveryMinutes} minutes</Text>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 10,
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 30,
    paddingTop: 40,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  orderIdTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  successIcon: {
    marginBottom: 20,
  },
  orderNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  orderId: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  statusBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  detailsCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemQuantityBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  itemQuantityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  itemType: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 15,
  },
  totalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSummaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalSummaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F59E0B',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailText: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
    marginTop: 4,
  },
  homeButton: {
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    margin: 15,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 14,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: '600',
  },
})
