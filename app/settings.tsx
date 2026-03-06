import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import Constants from 'expo-constants'
import { Theme } from '../src/styles/theme'
import { authApi } from '../src/lib/api'
import { useAlert } from '../src/context/AlertContext'

const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message
    }
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}

type ForgotStep = 'email' | 'otp' | 'newPassword'

export default function SettingsScreen() {
  const router = useRouter()
  const { showAlert } = useAlert()

  const [showResetModal, setShowResetModal] = useState(false)
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)

  const appVersion = Constants.default.expoConfig?.version || '1.0.0'

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (resendCountdown > 0) {
      interval = setInterval(() => setResendCountdown((prev) => prev - 1), 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [resendCountdown])

  const resetModalState = () => {
    setForgotStep('email')
    setEmail('')
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setResendCountdown(0)
    setShowPassword(false)
  }

  const handleSendResetCode = async () => {
    if (!email.trim()) {
      showAlert({ title: 'Email required', message: 'Please enter your registered email', type: 'warning' })
      return
    }

    setIsLoading(true)
    try {
      await authApi.forgotPassword(email.trim())
      setForgotStep('otp')
      setResendCountdown(60)
      showAlert({ title: 'Code sent', message: 'Check your email for the 6-digit code', type: 'success' })
    } catch (error: unknown) {
      showAlert({ title: 'Failed', message: extractErrorMessage(error), type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCountdown > 0) {
      showAlert({ title: 'Please wait', message: `You can resend in ${resendCountdown}s`, type: 'info' })
      return
    }
    await handleSendResetCode()
  }

  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      showAlert({ title: 'Invalid code', message: 'Enter the 6-digit code sent to your email', type: 'warning' })
      return
    }
    setForgotStep('newPassword')
  }

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      showAlert({ title: 'Weak password', message: 'Password must be at least 6 characters long', type: 'warning' })
      return
    }
    if (newPassword !== confirmPassword) {
      showAlert({ title: 'Mismatch', message: 'Passwords do not match', type: 'warning' })
      return
    }

    setIsLoading(true)
    try {
      await authApi.resetPassword({ email: email.trim(), otp, newPassword })
      showAlert({
        title: 'Success',
        message: 'Password has been reset. Please login with your new password.',
        type: 'success',
      })
      setShowResetModal(false)
      resetModalState()
    } catch (error: unknown) {
      showAlert({ title: 'Error', message: extractErrorMessage(error), type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const modalButtonLabel = useMemo(() => {
    if (forgotStep === 'email') return 'Send code'
    if (forgotStep === 'otp') return 'Verify code'
    return 'Save password'
  }, [forgotStep])

  const handleModalAction = () => {
    if (forgotStep === 'email') return handleSendResetCode()
    if (forgotStep === 'otp') return handleVerifyOtp()
    return handleResetPassword()
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              resetModalState()
              setShowResetModal(true)
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Theme.colors.primary} />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuText}>Reset Password</Text>
              <Text style={styles.menuSubtitle}>Use email + OTP verification to update your password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>{appVersion}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showResetModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.modalWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowResetModal(false)
                  resetModalState()
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {forgotStep === 'email' && 'Enter the email associated with your account.'}
              {forgotStep === 'otp' && 'Enter the 6-digit code sent to your email.'}
              {forgotStep === 'newPassword' && 'Choose a new password and confirm it.'}
            </Text>

            {forgotStep === 'email' && (
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}

            {forgotStep === 'otp' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  placeholderTextColor="#999"
                  value={otp}
                  onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <TouchableOpacity onPress={handleResendCode} disabled={isLoading}>
                  <Text style={styles.resendText}>
                    {resendCountdown > 0 ? `Resend available in ${resendCountdown}s` : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {forgotStep === 'newPassword' && (
              <>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="New password"
                    placeholderTextColor="#999"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={Theme.colors.textGray}
                    />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.modalButton, isLoading && styles.disabledButton]}
              onPress={handleModalAction}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.modalButtonText}>{modalButtonLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  section: {
    marginBottom: 16,
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EDF7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Theme.colors.textGray,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.textGray,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContainer: {
    backgroundColor: Theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: Theme.colors.textGray,
  },
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resendText: {
    marginTop: 8,
    fontSize: 12,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  modalButton: {
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.white,
  },
  disabledButton: {
    opacity: 0.6,
  },
})
