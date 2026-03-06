import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { Theme } from '../src/styles/theme'
import { AppDispatch, RootState } from '../src/store/store'
import { userApi } from '../src/lib/api'
import { updateUser } from '../src/store/slices/authSlice'
import type { AddressLabel, UserAddress } from '../src/store/slices/authSlice'
import { useAlert } from '../src/context/AlertContext'

const labelOptions: AddressLabel[] = ['Home', 'Work', 'Other']

const generateId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export default function AddressesScreen() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { showAlert } = useAlert()

  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [selectedLabel, setSelectedLabel] = useState<AddressLabel>('Home')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const currentUserId = user?.id

  useEffect(() => {
    if (user?.addresses && Array.isArray(user.addresses)) {
      setAddresses(user.addresses)
    } else if (user) {
      setAddresses([])
    }
  }, [user])

  const resetForm = useCallback(() => {
    setSelectedLabel('Home')
    setStreet('')
    setCity('')
    setEditingId(null)
  }, [])

  const persistAddresses = useCallback(
    async (payload: UserAddress[]) => {
      if (!currentUserId) return

      setIsSaving(true)
      try {
        await userApi.updateProfile(currentUserId, { addresses: payload })
        dispatch(updateUser({ addresses: payload }))
        showAlert({ title: 'Saved', message: 'Addresses updated successfully.', type: 'success' })
      } catch (error: unknown) {
        showAlert({ title: 'Error', message: 'Failed to update addresses.', type: 'error' })
        console.error('Update addresses error:', error)
      } finally {
        setIsSaving(false)
      }
    },
    [currentUserId, dispatch, showAlert]
  )

  const handleSaveAddress = async () => {
    if (!street.trim() || !city.trim()) {
      showAlert({ title: 'Validation', message: 'Street and city are required', type: 'warning' })
      return
    }

    const trimmedStreet = street.trim()
    const trimmedCity = city.trim()

    let updatedAddresses: UserAddress[]

    if (editingId) {
      updatedAddresses = addresses.map((address) =>
        address.id === editingId
          ? { ...address, label: selectedLabel, street: trimmedStreet, city: trimmedCity }
          : address
      )
    } else {
      const newAddress: UserAddress = {
        id: generateId(),
        label: selectedLabel,
        street: trimmedStreet,
        city: trimmedCity,
        isDefault: addresses.length === 0,
      }
      updatedAddresses = [...addresses, newAddress]
    }

    setAddresses(updatedAddresses)
    await persistAddresses(updatedAddresses)
    resetForm()
  }

  const handleDeleteAddress = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedAddresses = addresses.filter((address) => address.id !== id)
          setAddresses(updatedAddresses)
          await persistAddresses(updatedAddresses)
        },
      },
    ])
  }

  const handleEditAddress = (address: UserAddress) => {
    setSelectedLabel(address.label)
    setStreet(address.street)
    setCity(address.city)
    setEditingId(address.id)
  }

  const handleSetDefault = async (id: string) => {
    const updatedAddresses = addresses.map((address) => ({
      ...address,
      isDefault: address.id === id,
    }))

    const hasDefault = updatedAddresses.some((address) => address.isDefault)
    if (!hasDefault && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true
    }

    setAddresses(updatedAddresses)
    await persistAddresses(updatedAddresses)
  }

  const canSave = street.trim().length > 0 && city.trim().length > 0

  const actionLabel = editingId ? 'Update Address' : 'Add Address'

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Addresses</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Addresses</Text>
          {addresses.length === 0 ? (
            <Text style={styles.emptyText}>No addresses yet. Add one below to get started.</Text>
          ) : (
            addresses.map((address) => (
              <View key={address.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardLabel}>{address.label}</Text>
                  {address.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardText}>{address.street}</Text>
                <Text style={styles.cardText}>{address.city}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.cardButton}
                    onPress={() => handleSetDefault(address.id)}
                    disabled={address.isDefault}
                  >
                    <Text style={[styles.cardButtonText, address.isDefault && styles.disabledText]}>
                      {address.isDefault ? 'Default' : 'Set as default'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cardButton} onPress={() => handleEditAddress(address)}>
                    <Text style={styles.cardButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardButton}
                    onPress={() => handleDeleteAddress(address.id)}
                  >
                    <Text style={[styles.cardButtonText, styles.dangerText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{editingId ? 'Edit Address' : 'Add New Address'}</Text>

          <View style={styles.labelRow}>
            {labelOptions.map((label) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.labelOption,
                  selectedLabel === label && styles.labelOptionActive,
                ]}
                onPress={() => setSelectedLabel(label)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.labelOptionText,
                    selectedLabel === label && styles.labelOptionTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput
              style={styles.input}
              value={street}
              onChangeText={setStreet}
              placeholder="123 Main Street"
              placeholderTextColor="#999"
              editable={!isSaving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Batticaloa"
              placeholderTextColor="#999"
              editable={!isSaving}
            />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!canSave || isSaving) && styles.disabledButton,
              ]}
              onPress={handleSaveAddress}
              disabled={!canSave || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>{actionLabel}</Text>
              )}
            </TouchableOpacity>
            {editingId && (
              <TouchableOpacity style={styles.textButton} onPress={resetForm}>
                <Text style={styles.textButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
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
  section: {
    marginBottom: 24,
    backgroundColor: Theme.colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 16,
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
    marginBottom: 12,
  },
  emptyText: {
    color: Theme.colors.textGray,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Theme.colors.backgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.deepBlue,
  },
  defaultBadge: {
    backgroundColor: Theme.colors.greenLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  defaultBadgeText: {
    color: Theme.colors.greenText,
    fontSize: 12,
    fontWeight: '600',
  },
  cardText: {
    fontSize: 14,
    color: Theme.colors.textDark,
    marginBottom: 2,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  cardButton: {
    marginRight: 12,
    marginBottom: 6,
  },
  cardButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.deepBlue,
  },
  dangerText: {
    color: '#FF4D4F',
  },
  disabledText: {
    color: '#999999',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  labelOption: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  labelOptionActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  labelOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  labelOptionTextActive: {
    color: Theme.colors.white,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textGray,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
  },
  actionsRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Theme.colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  textButton: {
    marginLeft: 12,
  },
  textButtonText: {
    color: Theme.colors.deepBlue,
    fontWeight: '600',
  },
})
