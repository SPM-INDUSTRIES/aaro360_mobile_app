import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native'
import { resolveImageUrl } from '../src/utils/imageUrl'
import { useState, useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../src/store/store'
import { userApi } from '../src/lib/api'
import { updateUser } from '../src/store/slices/authSlice'
import { Theme } from '../src/styles/theme'
import * as ImagePicker from 'expo-image-picker'
import { useAlert } from '../src/context/AlertContext'
import { formatPhoneForDisplay, normalizePhoneNumber, isValidPhoneNumber, getPhoneValidationMessage } from '../src/utils/phone-normalizer'

export default function EditProfileScreen() {
    const router = useRouter()
    const dispatch = useDispatch()
    const { user } = useSelector((state: RootState) => state.auth)

    const [firstName, setFirstName] = useState(user?.firstName || '')
    const [lastName, setLastName] = useState(user?.lastName || '')
    const [phoneNumber, setPhoneNumber] = useState(formatPhoneForDisplay(user?.phoneNumber) || '')
    const [address, setAddress] = useState(user?.address || '')
    const [city, setCity] = useState(user?.city || '')
    const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const { showAlert } = useAlert()

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (status !== 'granted') {
                showAlert({ title: 'Permission Denied', message: 'Sorry, we need camera roll permissions to make this work!', type: 'warning' })
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
                    showAlert({ title: 'Upload Failed', message: 'Failed to upload profile picture', type: 'error' })
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
            showAlert({ title: 'Error', message: 'First and last name are required', type: 'warning' })
            return
        }

        // Phone number validation - accept both formats
        if (phoneNumber && !isValidPhoneNumber(phoneNumber.trim())) {
            showAlert({ title: 'Invalid Phone Number', message: getPhoneValidationMessage(), type: 'warning' })
            return
        }

        // Normalize phone number to international format before sending
        const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber.trim()) : undefined

        try {
            setIsSubmitting(true)
            const updateData = {
                firstName,
                lastName,
                phoneNumber: normalizedPhone,
                address,
                city,
                profilePicture
            }

            await userApi.updateProfile(user!.id, updateData)

            // Update local state with normalized phone
            dispatch(updateUser({
                ...updateData,
                phoneNumber: normalizedPhone
            }))

            showAlert({ title: 'Success', message: 'Profile updated successfully', type: 'success', onConfirm: () => router.back() })
        } catch (error: any) {
            console.error('Update profile error:', error)
            showAlert({ title: 'Error', message: error.response?.data?.message || 'Failed to update profile', type: 'error' })
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
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={handlePickImage} style={styles.avatarButton} disabled={isUploadingImage}>
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
                    <Text style={styles.avatarHelp}>{isUploadingImage ? 'Uploading...' : 'Tap to change profile picture'}</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>First Name</Text>
                        <TextInput
                            style={styles.input}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="First Name"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Last Name</Text>
                        <TextInput
                            style={styles.input}
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Last Name"
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
                            placeholder="Phone Number"
                            keyboardType="phone-pad"
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
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>City</Text>
                        <TextInput
                            style={styles.input}
                            value={city}
                            onChangeText={setCity}
                            placeholder="City"
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, isSubmitting && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 15,
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
        padding: 20,
        paddingBottom: 40,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 30,
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
    form: {
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 20,
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
        borderRadius: 12,
        padding: 15,
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
    saveButton: {
        backgroundColor: Theme.colors.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
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
