import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Theme } from '../src/styles/theme'
import { SafeAreaView } from 'react-native-safe-area-context'

const faqItems = [
  {
    question: 'How do I place an order?',
    answer: 'Browse through the categories, add items to your cart, and proceed to checkout. You can pay cash on delivery.',
  },
  {
    question: 'How do I track my order?',
    answer: 'Go to the Orders section in your profile to see the current status of your order.',
  },
  {
    question: 'What are the delivery hours?',
    answer: 'We deliver from 8:00 AM to 10:00 PM, seven days a week.',
  },
  {
    question: 'Is there a minimum order amount?',
    answer: 'No, there is no minimum order amount. We deliver single items as well.',
  },
  {
    question: 'How do I cancel an order?',
    answer: 'You can cancel your order within 5 minutes of placing it. Contact our support team for assistance.',
  },
]

export default function HelpSupportScreen() {
  const router = useRouter()

  const handleCall = () => {
    Linking.openURL('tel:+94779200889')
  }

  const handleEmail = () => {
    Linking.openURL('mailto:aaroeats@gmail.com')
  }

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/94779200889')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          
          <View style={styles.contactCard}>
            <View style={styles.contactRow}>
              <Ionicons name="location" size={20} color={Theme.colors.primary} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Address</Text>
                <Text style={styles.contactValue}>268/13, Bar Road, Batticaloa</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.contactRow} onPress={handleCall}>
              <Ionicons name="call" size={20} color={Theme.colors.primary} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={[styles.contactValue, styles.linkText]}>+94 77 920 0889</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.textGray} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.contactRow} onPress={handleEmail}>
              <Ionicons name="mail" size={20} color={Theme.colors.primary} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={[styles.contactValue, styles.linkText]}>aaroeats@gmail.com</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.textGray} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsApp} activeOpacity={0.7}>
            <Ionicons name="logo-whatsapp" size={24} color="#FFF" />
            <Text style={styles.whatsappButtonText}>Chat on WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          {faqItems.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginBottom: 16,
  },
  contactCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactLabel: {
    fontSize: 12,
    color: Theme.colors.textGray,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    color: Theme.colors.textDark,
    fontWeight: '500',
  },
  linkText: {
    color: Theme.colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: 8,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    padding: 16,
    borderRadius: 12,
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  faqItem: {
    backgroundColor: Theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: Theme.colors.textGray,
    lineHeight: 20,
  },
})
