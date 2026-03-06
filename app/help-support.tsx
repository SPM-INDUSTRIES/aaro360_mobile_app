import { useCallback } from 'react'
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Theme } from '../src/styles/theme'

const CONTACT_EMAIL = 'aaroEats@gmail.com'.toLowerCase()
const CONTACT_PHONE = '+96 77 086 0786'
const WHATSAPP_NUMBER = '96770860786'
const ADDRESS = '268/13, Bar Road, Batticaloa'

const openUrl = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url)
    if (!supported) {
      Alert.alert('Unsupported', 'Cannot open this link on your device.')
      return
    }
    await Linking.openURL(url)
  } catch (error) {
    console.error('Deep link error:', error)
    Alert.alert('Error', 'Failed to open the link. Please try again later.')
  }
}

export default function HelpSupportScreen() {
  const router = useRouter()

  const handleEmailPress = useCallback(() => {
    openUrl(`mailto:${CONTACT_EMAIL}`)
  }, [])

  const handlePhonePress = useCallback(() => {
    openUrl(`tel:${CONTACT_PHONE}`)
  }, [])

  const handleWhatsAppPress = useCallback(() => {
    openUrl(`https://wa.me/${WHATSAPP_NUMBER}`)
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.helperText}>
          Need help? Reach out to our support team using any of the contact channels below.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={Theme.colors.deepBlue} />
            <Text style={styles.infoText}>{ADDRESS}</Text>
          </View>
          <TouchableOpacity style={styles.infoRow} onPress={handlePhonePress} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={20} color={Theme.colors.deepBlue} />
            <Text style={styles.infoText}>{CONTACT_PHONE}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoRow} onPress={handleEmailPress} activeOpacity={0.7}>
            <Ionicons name="mail-outline" size={20} color={Theme.colors.deepBlue} />
            <Text style={styles.infoText}>{CONTACT_EMAIL}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WhatsApp Support</Text>
          <Text style={styles.sectionSubtitle}>
            Tap the button below to chat with us on WhatsApp, we typically respond within a few minutes.
          </Text>
          <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsAppPress} activeOpacity={0.8}>
            <Ionicons name="logo-whatsapp" size={24} color={Theme.colors.white} />
            <Text style={styles.whatsappButtonText}>Chat on WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FAQ</Text>
          <Text style={styles.infoText}>
            - Orders not arriving on time? Check the tracking tab for live updates.{'\n'}
            - Need to update your profile? Use the “Edit Profile” shortcut from the profile screen.{'\n'}
            - Want a quick callback? Use the WhatsApp button to request a call back.
          </Text>
        </View>
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
  section: {
    backgroundColor: Theme.colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 16,
    marginBottom: 16,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.deepBlue,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Theme.colors.textGray,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: Theme.colors.textDark,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  whatsappButtonText: {
    color: Theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
})
