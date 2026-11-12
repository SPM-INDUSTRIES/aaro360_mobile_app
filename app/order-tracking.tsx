import { useState, useEffect, useRef, useCallback } from 'react'
import { Theme } from '../src/styles/theme'

import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Linking, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { orderApi } from '../src/lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'
import { rs, rf, hp } from '../src/utils/responsive'
import { useAlert } from '../src/context/AlertContext'

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
  rider?: { firstName: string; lastName: string; phoneNumber: string }
  phoneNumber?: string
}

const ACTIVE_STATUSES = ['created', 'accepted', 'picked', 'en_route']

export default function OrderTrackingScreen() {
  const { id, fromCheckout } = useLocalSearchParams()
  const router = useRouter()
  const { showAlert } = useAlert()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const getStatusColors = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      created: { bg: Theme.colors.orangeLight, text: '#EA580C' },
      accepted: { bg: Theme.colors.blueLight, text: Theme.colors.blueText },
      picked: { bg: Theme.colors.blueLight, text: Theme.colors.blueText },
      en_route: { bg: '#EEF2FF', text: '#4F46E5' },
      delivered: { bg: Theme.colors.greenLight, text: Theme.colors.greenText },
      cancelled: { bg: '#FEF2F2', text: '#DC2626' },
    }
    return map[status] || map.created
  }

  const formatStatus = (status: string) => {
    return status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Created'
  }

  const handleCopy = async () => {
    if (!order) return
    await Clipboard.setStringAsync(order.orderNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const fetchOrder = useCallback(async () => {
    try {
      const response = await orderApi.getById(Number(id))
      setOrder(response.data)
    } catch (error) {
      console.error('Failed to fetch order:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  useEffect(() => {
    if (order && ACTIVE_STATUSES.includes(order.status)) {
      pollingRef.current = setInterval(fetchOrder, 30000)
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [order?.status, fetchOrder])

  const handleCallRider = () => {
    const phone = order?.rider?.phoneNumber || order?.phoneNumber
    if (phone) Linking.openURL(`tel:${phone}`)
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
            <View style={[styles.orderIdRow, { justifyContent: 'center' }]}>
              <Text style={styles.orderId}>Order ID: #{order.orderNumber}</Text>
              <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={16}
                  color={copied ? Theme.colors.greenText : '#6B7280'}
                />
              </TouchableOpacity>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColors(order.status).bg }]}>
              <Text style={[styles.statusText, { color: getStatusColors(order.status).text }]}>
                {formatStatus(order.status)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.header, { alignItems: 'flex-start' }]}>
            <View style={styles.orderIdRow}>
              <Text style={styles.orderIdTitle} numberOfLines={1}>Order #{order.orderNumber}</Text>
              <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={16}
                  color={copied ? Theme.colors.greenText : '#6B7280'}
                />
              </TouchableOpacity>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColors(order.status).bg }]}>
              <Text style={[styles.statusText, { color: getStatusColors(order.status).text }]}>
                {formatStatus(order.status)}
              </Text>
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

        {order.rider && ACTIVE_STATUSES.includes(order.status) && (
          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>Delivery Rider</Text>
            <View style={styles.riderRow}>
              <View style={styles.riderAvatar}>
                <Ionicons name="person" size={20} color={Theme.colors.primary} />
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{order.rider.firstName} {order.rider.lastName}</Text>
                <Text style={styles.riderLabel}>Your delivery partner</Text>
              </View>
            </View>
            {order.rider.phoneNumber && (
              <TouchableOpacity style={styles.callRiderButton} onPress={handleCallRider}>
                <Ionicons name="call" size={18} color="#FFF" />
                <Text style={styles.callRiderButtonText}>Call Rider</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {order.status === 'created' && (
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
            onPress={() => {
              showAlert({
                title: 'Cancel Order',
                message: 'Are you sure you want to cancel this order? This action cannot be undone.',
                type: 'warning',
                onConfirm: async () => {
                  try {
                    setCancelling(true)
                    await orderApi.updateStatus(order!.id, 'cancelled')
                    await fetchOrder()
                    showAlert({ title: 'Order Cancelled', message: 'Your order has been cancelled.', type: 'success' })
                  } catch (error: any) {
                    showAlert({ title: 'Error', message: error?.response?.data?.message || 'Failed to cancel order', type: 'error' })
                  } finally {
                    setCancelling(false)
                  }
                },
              })
            }}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#EF4444" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            )}
          </TouchableOpacity>
        )}

        {order.status === 'accepted' && (
          <View style={styles.contactAaroCard}>
            <Ionicons name="information-circle" size={24} color="#EA580C" />
            <View style={styles.contactAaroInfo}>
              <Text style={styles.contactAaroTitle}>Need to cancel?</Text>
              <Text style={styles.contactAaroText}>Once accepted, orders can only be cancelled by contacting Aaro support.</Text>
            </View>
            <TouchableOpacity style={styles.callAaroButton} onPress={() => Linking.openURL('tel:+94779200889')}>
              <Ionicons name="call" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

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
  orderIdTitle: {
    fontSize: rf(Theme.fontSize.sm),
    fontWeight: '600',
    color: '#6B7280',
    flexShrink: 1,
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
    flexShrink: 1,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rs(8),
  },
  copyButton: {
    padding: 6,
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: rs(Theme.spacing.md),
    paddingVertical: rs(6),
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontWeight: '700',
    fontSize: rf(Theme.fontSize.sm),
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
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rs(Theme.spacing.base),
  },
  riderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rs(Theme.spacing.md),
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '600',
    color: '#111827',
  },
  riderLabel: {
    fontSize: rf(Theme.fontSize.xs),
    color: '#9CA3AF',
    marginTop: rs(2),
  },
  callRiderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    padding: rs(Theme.spacing.md),
    borderRadius: Theme.borderRadius.lg,
  },
  callRiderButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: rf(Theme.fontSize.base),
  },
  cancelButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: rs(Theme.spacing.base),
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    margin: rs(15),
    minHeight: Theme.touchTarget.medium,
    justifyContent: 'center',
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: rf(Theme.fontSize.base),
  },
  contactAaroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: rs(15),
    padding: rs(Theme.spacing.md),
    backgroundColor: '#FFF7ED',
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  contactAaroInfo: {
    flex: 1,
    marginLeft: rs(10),
  },
  contactAaroTitle: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '700',
    color: '#92400E',
  },
  contactAaroText: {
    fontSize: rf(Theme.fontSize.xs),
    color: '#B45309',
    marginTop: rs(2),
  },
  callAaroButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: rs(10),
  },
})
