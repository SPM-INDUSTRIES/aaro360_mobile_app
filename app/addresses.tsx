import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useState, useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, useAppDispatch } from '../src/store/store'
import { userApi } from '../src/lib/api'
import { updateUser } from '../src/store/slices/authSlice'
import { Theme } from '../src/styles/theme'
import { useAlert } from '../src/context/AlertContext'
import { SafeAreaView } from 'react-native-safe-area-context'

interface Address {
  label: string
  street: string
  city: string
}

export default function AddressesScreen() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const { showAlert } = useAlert()

  const [addresses, setAddresses] = useState<Address[]>(() => {
    if (user?.address && user?.city) {
      return [{ label: 'Home', street: user.address, city: user.city }]
    }
    return []
  })
  const [isAdding, setIsAdding] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [newAddress, setNewAddress] = useState<Address>({ label: '', street: '', city: '' })
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveAddresses = async () => {
    if (addresses.length === 0) {
      showAlert({ title: 'Error', message: 'Please add at least one address', type: 'warning' })
      return
    }

    const primaryAddress = addresses[0]
    try {
      setIsSaving(true)
      await userApi.updateProfile(user!.id, {
        address: primaryAddress.street,
        city: primaryAddress.city,
      })
      dispatch(updateUser({
        address: primaryAddress.street,
        city: primaryAddress.city,
      }))
      showAlert({ title: 'Success', message: 'Address saved successfully', type: 'success' })
      setIsAdding(false)
      setEditingIndex(null)
      setNewAddress({ label: '', street: '', city: '' })
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.response?.data?.message || 'Failed to save address', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddAddress = () => {
    if (!newAddress.label.trim() || !newAddress.street.trim() || !newAddress.city.trim()) {
      showAlert({ title: 'Error', message: 'Please fill in all fields', type: 'warning' })
      return
    }
    setAddresses([...addresses, newAddress])
    setNewAddress({ label: '', street: '', city: '' })
    setIsAdding(false)
  }

  const handleDeleteAddress = (index: number) => {
    showAlert({
      title: 'Delete Address',
      message: 'Are you sure you want to delete this address?',
      type: 'warning',
      confirmText: 'Delete',
      onConfirm: () => {
        const updated = addresses.filter((_, i) => i !== index)
        setAddresses(updated)
      }
    })
  }

  const handleEditAddress = (index: number) => {
    setNewAddress(addresses[index])
    setEditingIndex(index)
    setIsAdding(true)
  }

  const handleUpdateAddress = () => {
    if (!newAddress.label.trim() || !newAddress.street.trim() || !newAddress.city.trim()) {
      showAlert({ title: 'Error', message: 'Please fill in all fields', type: 'warning' })
      return
    }
    const updated = [...addresses]
    updated[editingIndex!] = newAddress
    setAddresses(updated)
    setNewAddress({ label: '', street: '', city: '' })
    setEditingIndex(null)
    setIsAdding(false)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Addresses</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {addresses.length === 0 && !isAdding ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No addresses saved</Text>
            <Text style={styles.emptySubtext}>Add your delivery address</Text>
          </View>
        ) : (
          addresses.map((address, index) => (
            <View key={index} style={styles.addressCard}>
              <View style={styles.addressIcon}>
                <Ionicons name="location" size={24} color={Theme.colors.primary} />
              </View>
              <View style={styles.addressInfo}>
                <Text style={styles.addressLabel}>{address.label}</Text>
                <Text style={styles.addressStreet}>{address.street}</Text>
                <Text style={styles.addressCity}>{address.city}</Text>
              </View>
              <View style={styles.addressActions}>
                <TouchableOpacity onPress={() => handleEditAddress(index)} style={styles.actionButton}>
                  <Ionicons name="pencil" size={20} color={Theme.colors.textGray} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAddress(index)} style={styles.actionButton}>
                  <Ionicons name="trash-outline" size={20} color="#FF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {isAdding && (
          <View style={styles.addForm}>
            <Text style={styles.formTitle}>{editingIndex !== null ? 'Edit Address' : 'Add New Address'}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Label (e.g., Home, Work)</Text>
              <TextInput
                style={styles.input}
                value={newAddress.label}
                onChangeText={(text) => setNewAddress({ ...newAddress, label: text })}
                placeholder="Home"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newAddress.street}
                onChangeText={(text) => setNewAddress({ ...newAddress, street: text })}
                placeholder="No. 123, Main Street"
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={newAddress.city}
                onChangeText={(text) => setNewAddress({ ...newAddress, city: text })}
                placeholder="Batticaloa"
              />
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsAdding(false)
                  setEditingIndex(null)
                  setNewAddress({ label: '', street: '', city: '' })
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveAddressButton}
                onPress={editingIndex !== null ? handleUpdateAddress : handleAddAddress}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveAddressButtonText}>
                    {editingIndex !== null ? 'Update' : 'Add'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!isAdding && (
          <TouchableOpacity style={styles.addButton} onPress={() => setIsAdding(true)}>
            <Ionicons name="add" size={24} color={Theme.colors.primary} />
            <Text style={styles.addButtonText}>Add New Address</Text>
          </TouchableOpacity>
        )}

        {addresses.length > 0 && (
          <TouchableOpacity
            style={[styles.primaryButton, isSaving && styles.disabledButton]}
            onPress={handleSaveAddresses}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Save Addresses</Text>
            )}
          </TouchableOpacity>
        )}
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Theme.colors.textGray,
    marginTop: 8,
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  addressIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginBottom: 4,
  },
  addressStreet: {
    fontSize: 14,
    color: Theme.colors.textGray,
  },
  addressCity: {
    fontSize: 14,
    color: Theme.colors.textGray,
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addForm: {
    backgroundColor: Theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Theme.colors.textDark,
    backgroundColor: Theme.colors.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.textGray,
  },
  saveAddressButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
  },
  saveAddressButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.white,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.primary,
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: Theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
})
