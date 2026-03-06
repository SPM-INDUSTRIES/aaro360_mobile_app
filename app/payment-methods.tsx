import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Theme } from '../src/styles/theme'

const availableMethods = [
  {
    id: 'cod',
    title: 'Cash on Delivery',
    description: 'Pay when your order arrives at your doorstep.',
    enabled: true,
  },
  {
    id: 'card',
    title: 'Card Payment',
    description: 'Add a debit or credit card to complete the checkout.',
    enabled: false,
  },
  {
    id: 'bank',
    title: 'Online Banking',
    description: 'Transfer directly from your bank account.',
    enabled: false,
  },
  {
    id: 'wallet',
    title: 'Wallet / UPI',
    description: 'Use your preferred e-wallet provider.',
    enabled: false,
  },
]

export default function PaymentMethodsScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.helperText}>
          Choose how you would like to pay for your orders. Cash on Delivery is available now while other
          methods are coming soon.
        </Text>

        {availableMethods.map((method) => (
          <View key={method.id} style={[styles.card, method.enabled && styles.enabledCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{method.title}</Text>
              {method.enabled ? (
                <View style={styles.activeBadge}>
                  <Ionicons name="checkmark" size={16} color={Theme.colors.white} />
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              ) : (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardDescription}>{method.description}</Text>
            <TouchableOpacity
              style={[
                styles.button,
                method.enabled ? styles.primaryButton : styles.disabledButton,
              ]}
              disabled={!method.enabled}
            >
              <Text
                style={[
                  styles.buttonText,
                  !method.enabled && styles.disabledButtonText,
                ]}
              >
                {method.enabled ? 'Use this method' : 'Unavailable'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
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
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  helperText: {
    color: Theme.colors.textGray,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  enabledCard: {
    borderColor: Theme.colors.primary,
    backgroundColor: '#FFF7ED',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.deepBlue,
  },
  cardDescription: {
    fontSize: 14,
    color: Theme.colors.textDark,
    marginBottom: 12,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Theme.colors.primary,
  },
  activeBadgeText: {
    color: Theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Theme.colors.border,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textGray,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
  },
  disabledButton: {
    backgroundColor: '#F3F4F6',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.white,
  },
  disabledButtonText: {
    color: Theme.colors.textGray,
  },
})
