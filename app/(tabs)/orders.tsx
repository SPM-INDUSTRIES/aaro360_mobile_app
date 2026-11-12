import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { RootState } from '../../src/store/store'
import { orderApi } from '../../src/lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Theme } from '../../src/styles/theme'
import { rs, rf, wp, hp } from '../../src/utils/responsive'

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
    <SafeAreaView style={styles.container} edges={['top']}>
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
            colors={[Theme.colors.primary]}
            tintColor={Theme.colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={rs(64)} color="#CCC" />
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
                onPress={() => router.push({ pathname: '/order-tracking', params: { id: String(order.id) } })}
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  header: {
    padding: rs(Theme.spacing.lg),
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  title: {
    fontSize: rf(Theme.fontSize.xxl),
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
  },
  content: {
    flex: 1,
    padding: rs(Theme.spacing.lg),
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp(10),
  },
  loadingText: {
    marginTop: rs(Theme.spacing.md),
    color: Theme.colors.textGray,
    fontSize: rf(Theme.fontSize.sm),
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp(12),
  },
  emptyText: {
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: '600',
    color: Theme.colors.textGray,
    marginTop: rs(Theme.spacing.lg),
  },
  emptySubtext: {
    fontSize: rf(Theme.fontSize.sm),
    color: '#999',
    marginTop: rs(Theme.spacing.sm),
    marginBottom: rs(Theme.spacing.xxl),
    textAlign: 'center',
    paddingHorizontal: rs(Theme.spacing.lg),
  },
  shopButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: rs(30),
    paddingVertical: rs(Theme.spacing.base),
    borderRadius: Theme.borderRadius.lg,
    minHeight: Theme.touchTarget.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopButtonText: {
    color: Theme.colors.white,
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '600',
  },
  ordersList: {
    paddingBottom: rs(Theme.spacing.xxl),
  },
  orderCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: rs(Theme.spacing.base),
    marginBottom: rs(Theme.spacing.md),
    borderWidth: 1,
    borderColor: '#EFEFEF',
    ...Theme.shadows.small,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: rs(Theme.spacing.md),
    marginBottom: rs(6),
  },
  orderNumber: {
    flex: 1,
    fontSize: rf(Theme.fontSize.sm),
    fontWeight: '700',
    color: '#1A1A1A',
  },
  orderTotal: {
    fontSize: rf(Theme.fontSize.sm),
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  orderStatus: {
    fontSize: rf(Theme.fontSize.xs),
    fontWeight: '600',
    color: Theme.colors.deepBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: rs(Theme.spacing.sm),
  },
  orderAddress: {
    fontSize: rf(13),
    color: Theme.colors.textGray,
    lineHeight: rs(18),
    marginBottom: rs(Theme.spacing.sm),
  },
  orderDate: {
    fontSize: rf(Theme.fontSize.xs),
    color: '#999',
  },
})
