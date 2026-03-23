import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { RootState } from '../../src/store/store'
import { orderApi } from '../../src/lib/api'

const CUSTOMER_ID_STORAGE_KEY = '@aaro360/customerId'

type OrderStatus = 'created' | 'accepted' | 'picked' | 'en_route' | 'delivered' | 'cancelled' | string

interface Order {
  id: number
  orderNumber: string
  status: OrderStatus
  total: number | string
  deliveryAddress: string
  createdAt: string
}

export default function OrdersScreen() {
  const router = useRouter()

  const { user } = useSelector((state: RootState) => state.auth)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  // Refresh orders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadOrders()
    }, [])
  )

  const loadOrders = async () => {
    try {
      setLoading(true)

      if (!user?.id) {
        if (__DEV__) console.log('No user id found in auth state')
        setOrders([])
        return
      }

      if (__DEV__) console.log('Fetching orders for userId:', user.id)
      const res = await orderApi.getByCustomer(user.id)
      if (__DEV__) console.log('Orders API response:', res)

      // Handle different response structures
      let ordersData: Order[] = []
      if (Array.isArray(res.data)) {
        ordersData = res.data
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        ordersData = res.data.data
      } else if (Array.isArray(res)) {
        ordersData = res
      }

      if (__DEV__) console.log('Parsed orders:', ordersData.length)
      setOrders(ordersData)
    } catch (error: any) {
      if (__DEV__) {
        console.error('Failed to load orders:', error)
        console.error('Error details:', error.response?.data || error.message)
      }
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const formatStatus = (status: string) =>
    status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await loadOrders()
              setRefreshing(false)
            }}
            colors={['#f27424']}
            tintColor="#f27424"
          />
        }
      >
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#f27424" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubtext}>
              {user?.firstName
                ? `${user.firstName}, you haven't placed any orders yet. Start shopping to see your orders here!`
                : 'Place an order to see it here'}
            </Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push('/(tabs)/')}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {orders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/order-tracking?id=${order.id}`)}
              >
                <View style={styles.orderHeaderRow}>
                  <Text style={styles.orderNumber} numberOfLines={1}>
                    {order.orderNumber}
                  </Text>
                  <Text style={styles.orderTotal}>
                    රු{Number(order.total || 0).toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.orderStatus}>{formatStatus(order.status)}</Text>
                <Text style={styles.orderAddress} numberOfLines={2}>
                  {order.deliveryAddress}
                </Text>
                <Text style={styles.orderDate}>
                  {new Date(order.createdAt).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#124569',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    marginBottom: 30,
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: '#f27424',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ordersList: {
    paddingBottom: 30,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  orderNumber: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f27424',
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#124569',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  orderAddress: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
})
