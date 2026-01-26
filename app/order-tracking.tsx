import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import MapView, { Marker } from 'react-native-maps'
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
  const { id } = useLocalSearchParams()
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
      <View style={styles.header}>
        <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
        <Text style={styles.status}>
          Status: {order.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Created'}
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: order.deliveryLatitude,
            longitude: order.deliveryLongitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{
              latitude: order.deliveryLatitude,
              longitude: order.deliveryLongitude,
            }}
            title="Delivery Location"
          />
        </MapView>
      </View>

      <View style={styles.info}>
        {order.estimatedDeliveryMinutes && (
          <>
            <Text style={styles.infoLabel}>Estimated Delivery</Text>
            <Text style={styles.infoValue}>{order.estimatedDeliveryMinutes} minutes</Text>
          </>
        )}
        <Text style={styles.infoLabel}>Delivery Address</Text>
        <Text style={styles.infoValue}>{order.deliveryAddress || 'Address not provided'}</Text>
        <Text style={styles.infoLabel}>Total Amount</Text>
        <Text style={styles.infoValue}>රු{Number(order.total || 0).toFixed(2)}</Text>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },
  status: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  mapContainer: {
    height: 400,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  info: {
    padding: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  errorText: {
    fontSize: 18,
    color: '#E53E3E',
    fontWeight: '600',
  },
})
