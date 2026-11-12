import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { RootState } from '../src/store/store'
import { authApi } from '../src/lib/api'
import { Theme } from '../src/styles/theme'
import * as Constants from 'expo-constants'
import { useAlert } from '../src/context/AlertContext'
import { SafeAreaView } from 'react-native-safe-area-context'

type ForgotStep = 'email' | 'otp' | 'newPassword'

export default function SettingsScreen() {
  const router = useRouter()
  const { user } = useSelector((state: RootState) => state.auth)
  const { showAlert } = useAlert()

  const appVersion = Constants.default.expoConfig?.version || '1.0.0'

  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)

  const handleSendFeedback = () => {
    const subject = encodeURIComponent('Aaro360 App Feedback')
    const body = encodeURIComponent(
      `\n\n\n---\nApp Version: ${appVersion}\nAccount: ${user?.email || user?.phoneNumber || 'Guest'}`
    )
    Linking.openURL(`mailto:aaroeats@gmail.com?subject=${subject}&body=${body}`).catch(() =>
      showAlert({
        title: 'Unable to open email',
        message: 'Please send your feedback to aaroeats@gmail.com',
        type: 'error',
      })
    )
  }

  const handleSendOtp = async () => {
    if (!forgotEmail) {
      showAlert({ title: 'Error', message: 'Please enter your email address', type: 'warning' })
      return
    }
    try {
      setForgotLoading(true)
      await authApi.forgotPassword(forgotEmail)
      setForgotStep('otp')
      setResendCountdown(60)
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.response?.data?.message || 'Failed to send recovery code', type: 'error' })
    } finally {
      setForgotLoading(false)
    }
  }

  const handleVerifyOtp = () => {
    if (forgotOtp.length !== 6) {
      showAlert({ title: 'Error', message: 'Please enter a valid 6-digit code', type: 'warning' })
      return
    }
    setForgotStep('newPassword')
  }

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      showAlert({ title: 'Error', message: 'Password must be at least 6 characters long', type: 'warning' })
      return
    }
    if (newPassword !== confirmNewPassword) {
      showAlert({ title: 'Error', message: 'Passwords do not match', type: 'warning' })
      return
    }

    try {
      setForgotLoading(true)
      await authApi.resetPassword({
        email: forgotEmail,
        otp: forgotOtp,
        newPassword: newPassword
      })
      showAlert({ title: 'Success', message: 'Password has been reset successfully. Please login with your new password.', type: 'success' })
      setShowForgotPassword(false)
      resetForgotState()
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.response?.data?.message || 'Failed to reset password', type: 'error' })
    } finally {
      setForgotLoading(false)
    }
  }

  const resetForgotState = () => {
    setForgotStep('email')
    setForgotEmail('')
    setForgotOtp('')
    setNewPassword('')
    setConfirmNewPassword('')
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.notLoggedIn}>
          <Text style={styles.notLoggedInText}>Please login to access settings</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reset Password</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowForgotPassword(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="lock-closed-outline" size={24} color={Theme.colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Change Password</Text>
              <Text style={styles.menuSubtitle}>Reset your account password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textGray} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSendFeedback}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={Theme.colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Send Feedback</Text>
              <Text style={styles.menuSubtitle}>Share suggestions or report an issue</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textGray} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>{appVersion}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {showForgotPassword && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {forgotStep === 'email' && 'Reset Password'}
                {forgotStep === 'otp' && 'Enter OTP'}
                {forgotStep === 'newPassword' && 'New Password'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowForgotPassword(false)
                  resetForgotState()
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Theme.colors.textGray} />
              </TouchableOpacity>
            </View>

            {forgotStep === 'email' && (
              <View>
                <Text style={styles.modalSubtitle}>Enter your email address to receive a verification code</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    placeholder="name@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.primaryButton, forgotLoading && styles.disabledButton]}
                  onPress={handleSendOtp}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {forgotStep === 'otp' && (
              <View>
                <Text style={styles.modalSubtitle}>Enter the 6-digit code sent to {forgotEmail}</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Verification Code</Text>
                  <TextInput
                    style={styles.input}
                    value={forgotOtp}
                    onChangeText={(text) => setForgotOtp(text.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.primaryButton, forgotLoading && styles.disabledButton]}
                  onPress={handleVerifyOtp}
                  disabled={forgotLoading}
                >
                  <Text style={styles.primaryButtonText}>Verify Code</Text>
                </TouchableOpacity>
                {resendCountdown > 0 ? (
                  <Text style={styles.resendText}>Resend code in {resendCountdown}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOtp} disabled={forgotLoading}>
                    <Text style={styles.resendLink}>Resend Code</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {forgotStep === 'newPassword' && (
              <View>
                <Text style={styles.modalSubtitle}>Create a new password for your account</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.passwordInput}>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={Theme.colors.textGray}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.passwordInput}>
                    <TextInput
                      style={styles.input}
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      placeholder="Confirm new password"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={Theme.colors.textGray}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.primaryButton, forgotLoading && styles.disabledButton]}
                  onPress={handleResetPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
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
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  menuSubtitle: {
    fontSize: 14,
    color: Theme.colors.textGray,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    color: Theme.colors.textDark,
  },
  infoValue: {
    fontSize: 16,
    color: Theme.colors.textGray,
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notLoggedInText: {
    fontSize: 16,
    color: Theme.colors.textGray,
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  loginButtonText: {
    color: Theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Theme.colors.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: Theme.colors.textGray,
    marginBottom: 20,
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
  },
  passwordInput: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
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
  resendText: {
    textAlign: 'center',
    color: Theme.colors.textGray,
    marginTop: 16,
  },
  resendLink: {
    textAlign: 'center',
    color: Theme.colors.primary,
    fontWeight: '600',
    marginTop: 16,
  },
})
