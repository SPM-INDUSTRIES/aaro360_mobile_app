import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Theme } from '../src/styles/theme'
import { SafeAreaView } from 'react-native-safe-area-context'

const paymentMethods = [
  {
    id: 'cod',
    name: 'Cash on Delivery',
    icon: 'cash-outline',
    available: true,
    description: 'Pay when you receive your order',
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: 'card-outline',
    available: false,
    description: 'Visa, Mastercard, Amex',
  },
  {
    id: 'banking',
    name: 'Online Banking',
    icon: 'globe-outline',
    available: false,
    description: 'Bank transfers',
  },
  {
    id: 'wallet',
    name: 'Wallet',
    icon: 'wallet-outline',
    available: false,
    description: 'Digital wallets',
  },
]

export default function PaymentMethodsScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Choose your preferred payment method</Text>

        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[styles.methodCard, !method.available && styles.methodCardDisabled]}
            activeOpacity={method.available ? 0.7 : 1}
            disabled={!method.available}
          >
            <View style={[styles.iconContainer, method.available ? styles.iconContainerActive : styles.iconContainerDisabled]}>
              <Ionicons
                name={method.icon as any}
                size={24}
                color={method.available ? Theme.colors.primary : '#999'}
              />
            </View>
            <View style={styles.methodInfo}>
              <View style={styles.methodNameRow}>
                <Text style={[styles.methodName, !method.available && styles.methodNameDisabled]}>
                  {method.name}
                </Text>
                {method.available && (
                  <View style={styles.activeBadge}>
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                )}
                {!method.available && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.methodDescription, !method.available && styles.methodDescriptionDisabled]}>
                {method.description}
              </Text>
            </View>
            {method.available && (
              <Ionicons name="checkmark-circle" size={24} color={Theme.colors.greenText} />
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={Theme.colors.textGray} />
          <Text style={styles.infoText}>
            Cash on Delivery is the only available payment method at the moment. Other payment options will be available soon.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    color: Theme.colors.textGray,
    marginBottom: 20,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  methodCardDisabled: {
    backgroundColor: '#F9F9F9',
    borderColor: '#F0F0F0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerActive: {
    backgroundColor: Theme.colors.orangeLight,
  },
  iconContainerDisabled: {
    backgroundColor: '#F0F0F0',
  },
  methodInfo: {
    flex: 1,
  },
  methodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.textDark,
    flex: 1,
  },
  methodNameDisabled: {
    color: '#999',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.greenText,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  activeBadgeText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  comingSoonBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  comingSoonBadgeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  methodDescription: {
    fontSize: 14,
    color: Theme.colors.textGray,
  },
  methodDescriptionDisabled: {
    color: '#BBB',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.blueLight,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Theme.colors.textGray,
    marginLeft: 12,
    lineHeight: 20,
  },
})
