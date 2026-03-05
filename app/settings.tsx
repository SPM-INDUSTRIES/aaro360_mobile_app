import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native'
import { useState, useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../src/store/store'
import { userApi } from '../src/lib/api'
import { updateUser } from '../src/store/slices/authSlice'
import { Theme } from '../src/styles/theme'
import * as ImagePicker from 'expo-image-picker'
import * as Constants from 'expo-constants'
import { useAlert } from '../src/context/AlertContext'
import { resolveImageUrl } from '../src/utils/imageUrl'

export default function SettingsScreen() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const { showAlert } = useAlert()

  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '')
  const [address, setAddress] = useState((user as any)?.address || '')
  const [city, setCity] = useState((user as any)?.city || '')
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'
  const appVersion = Constants.default.expoConfig?.version || '1.0.0'

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        showAlert({
          title: 'Permission Denied',
          message: 'Sorry, we need camera roll permissions to make this work!',
          type: 'warning',
        })
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: false,
      })

      if (!result.canceled && result.assets[0].uri) {
        setIsUploadingImage(true)
        try {
          const url = await userApi.uploadProfilePicture(result.assets[0].uri)
          setProfilePicture(url)
          showAlert({ title: 'Success', message: 'Profile picture updated', type: 'success' })
        } catch (uploadError) {
          console.error('Upload image error:', uploadError)
          showAlert({
            title: 'Upload Failed',
            message: 'Failed to upload profile picture',
            type: 'error',
          })
        } finally {
          setIsUploadingImage(false)
        }
      }
    } catch (error) {
      console.error('Pick image error:', error)
      showAlert({ title: 'Error', message: 'Failed to pick image', type: 'error' })
    }
  }

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showAlert({
        title: 'Error',
        message: 'First and last name are required',
        type: 'warning',
      })
      return
    }

    const phoneRegex = /^0[0-9]{9}$/
    if (phoneNumber && !phoneRegex.test(phoneNumber.trim())) {
      showAlert({
        title: 'Invalid Phone Number',
        message: 'Please enter a valid 10-digit phone number starting with 0 (e.g., 0712345678)',
        type: 'warning',
      })
      return
    }

    try {
      setIsSubmitting(true)
      const updateData = {
        firstName,
        lastName,
        phoneNumber,
        address,
        city,
        profilePicture,
      }

      await userApi.updateProfile(user!.id, updateData)
      dispatch(updateUser(updateData))

      showAlert({
        title: 'Success',
        message: 'Settings updated successfully',
        type: 'success',
      })
    } catch (error: any) {
      console.error('Update profile error:', error)
      showAlert({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update settings',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Picture Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Picture</Text>
          <View style={styles.sectionContent}>
            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={handlePickImage}
                style={styles.avatarButton}
                disabled={isUploadingImage}
              >
                {profilePicture ? (
                  <Image source={{ uri: resolveImageUrl(profilePicture) ?? profilePicture }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={50} color="#CCC" />
                  </View>
                )}
                {isUploadingImage ? (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="#FFF" />
                  </View>
                ) : (
                  <View style={styles.cameraIcon}>
                    <Ionicons name="camera" size={20} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.avatarHelp}>
                {isUploadingImage ? 'Uploading...' : 'Tap to change photo'}
              </Text>
            </View>
          </View>
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.sectionContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First Name"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last Name"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email (Cannot be changed)</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={user?.email || ''}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Phone Number (e.g., 0712345678)"
                keyboardType="phone-pad"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="Street Address"
                multiline
                numberOfLines={3}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                editable={!isSubmitting}
              />
            </View>
          </View>
        </View>

        {/* App Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.sectionContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>{appVersion}</Text>
            </View>
            <View style={[styles.infoRow, styles.lastInfoRow]}>
              <Text style={styles.infoLabel}>API Server</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {API_URL}
              </Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.disabledButton]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save All Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 10,
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
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.deepBlue,
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatarButton: {
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cameraIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: Theme.colors.primary,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  uploadingOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  avatarHelp: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  disabledInput: {
    backgroundColor: '#F9F9F9',
    color: '#999',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastInfoRow: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: Theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
})
