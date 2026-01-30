import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Dimensions,
  SafeAreaView,
} from 'react-native'
import { useRouter, useRootNavigationState } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../src/store/store'
import { loginWithEmail, loginWithGoogle, clearError, loginWithPhone } from '../src/store/slices/authSlice'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import {
  sendOTP,
  verifyOTP,
  formatPhoneNumber,
} from '../src/services/phoneAuth.service'
import { ConfirmationResult } from 'firebase/auth'
import { Theme } from '../src/styles/theme'
import { Ionicons } from '@expo/vector-icons'

const { width } = Dimensions.get('window')

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const router = useRouter()
  const navigationState = useRootNavigationState()
  const dispatch = useDispatch<AppDispatch>()
  const { status, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  )

  const [authMode, setAuthMode] = useState<'email' | 'mobile'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  })

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params
      if (id_token) {
        dispatch(loginWithGoogle(id_token))
      }
    } else if (response?.type === 'error') {
      Alert.alert('Authentication Error', response.error?.message || 'Failed to authenticate with Google')
    }
  }, [response])

  useEffect(() => {
    if (!navigationState?.key) return

    if (isAuthenticated) {
      router.replace('/(tabs)/')
    }
  }, [isAuthenticated, navigationState?.key])

  useEffect(() => {
    if (error) {
      Alert.alert('Login Error', error)
      dispatch(clearError())
    }
  }, [error])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [resendCountdown])

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please enter both email and password')
      return
    }
    dispatch(loginWithEmail({ email, password }))
  }

  const handlePhoneLogin = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number')
      return
    }
    const digits = phoneNumber.replace(/\D/g, '')
    if (digits.length < 9 || digits.length > 10) {
      Alert.alert('Validation Error', 'Please enter a valid 9-10 digit phone number')
      return
    }

    Alert.alert(
      'Phone Authentication Unavailable',
      'Phone authentication requires a reCAPTCHA verifier. Please use email authentication or install expo-firebase-recaptcha for phone authentication support.'
    )
  }

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Validation Error', 'Please enter a valid 6-digit OTP')
      return
    }

    if (!confirmationResult) {
      Alert.alert('Error', 'OTP session expired. Please request a new OTP.')
      return
    }

    try {
      setOtpLoading(true)
      const idToken = await verifyOTP(confirmationResult, otp)
      dispatch(loginWithPhone(idToken))
      setShowOtpModal(false)
      setOtp('')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify OTP')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCountdown > 0) {
      Alert.alert('Please wait', `You can resend OTP in ${resendCountdown} seconds`)
      return
    }
    Alert.alert(
      'Phone Authentication Unavailable',
      'Phone authentication is currently disabled. Please use email.'
    )
  }

  const handleGoogleLogin = () => {
    Alert.alert('Coming Soon', 'Google Login is currently under development.')
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Headlines */}
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your everyday super app.</Text>
          </View>

          {/* Segmented Control */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                authMode === 'email' && styles.segmentButtonActive,
              ]}
              onPress={() => setAuthMode('email')}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  authMode === 'email' && styles.segmentButtonTextActive,
                ]}
              >
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                authMode === 'mobile' && styles.segmentButtonActive,
              ]}
              onPress={() => setAuthMode('mobile')}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  authMode === 'mobile' && styles.segmentButtonTextActive,
                ]}
              >
                Mobile
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {authMode === 'email' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color={Theme.colors.textGray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="name@example.com"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Password</Text>
                    <TouchableOpacity>
                      <Text style={styles.forgotPassword}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={Theme.colors.textGray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="password"
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

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    status === 'loading' && styles.buttonDisabled,
                  ]}
                  onPress={handleEmailLogin}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+94</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="77 123 4567"
                      placeholderTextColor="#999"
                      value={phoneNumber}
                      onChangeText={(text) => setPhoneNumber(text.replace(/\D/g, ''))}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (otpLoading || status === 'loading') && styles.buttonDisabled,
                  ]}
                  onPress={handlePhoneLogin}
                  disabled={otpLoading || status === 'loading'}
                >
                  {otpLoading || status === 'loading' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Social Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialGrid}>
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  (status === 'loading' || !request) && styles.socialButtonDisabled,
                ]}
                onPress={handleGoogleLogin}
                disabled={status === 'loading' || !request}
              >
                <Ionicons name="logo-google" size={20} color="#EA4335" />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.socialButton,
                  status === 'loading' && styles.socialButtonDisabled,
                ]}
                onPress={() => Alert.alert('Coming Soon', 'Apple Login is currently under development.')}
                disabled={status === 'loading'}
              >
                <Ionicons name="logo-apple" size={20} color="#000000" />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* OTP Verification Modal */}
      <Modal
        visible={showOtpModal}
        animationType="slide"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <SafeAreaView style={styles.otpScreen}>
          <View style={styles.otpHeader}>
            <TouchableOpacity onPress={() => setShowOtpModal(false)} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={Theme.colors.textDark} />
            </TouchableOpacity>
          </View>

          <View style={styles.otpContent}>
            <View style={styles.otpHeadlineSection}>
              <Text style={styles.otpTitle}>Verification Code</Text>
              <Text style={styles.otpSubtitle}>
                We have sent the code verification to {'\n'}
                <Text style={styles.otpPhone}>+94 {phoneNumber}</Text>
              </Text>
            </View>

            <View style={styles.otpInputContainer}>
              <View style={styles.otpBoxRow}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.otpBox,
                      otp.length === i && styles.otpBoxActive,
                      otp.length > i && styles.otpBoxFilled
                    ]}
                  >
                    <Text style={styles.otpBoxText}>{otp[i] || ''}</Text>
                  </View>
                ))}
              </View>
              <TextInput
                style={styles.hiddenInput}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                caretHidden
              />
            </View>

            <View style={styles.resendTimerSection}>
              <Text style={styles.resendLabel}>Didn't receive code? </Text>
              <TouchableOpacity disabled={resendCountdown > 0} onPress={handleResendOtp}>
                <Text style={[styles.resendLink, resendCountdown > 0 && styles.resendDisabled]}>
                  {resendCountdown > 0
                    ? `Resend in 00:${resendCountdown.toString().padStart(2, '0')}`
                    : 'Resend Now'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.otpFooter}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (otp.length < 6 || otpLoading) && styles.buttonDisabled
                ]}
                onPress={handleVerifyOtp}
                disabled={otp.length < 6 || otpLoading}
              >
                {otpLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  logo: {
    width: 280,
    height: 100,
  },
  headerTextContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Theme.colors.textGray,
    textAlign: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 6,
    marginBottom: 32,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  segmentButtonActive: {
    backgroundColor: Theme.colors.white,
    ...Theme.shadows.small,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.textGray,
  },
  segmentButtonTextActive: {
    color: Theme.colors.deepBlue,
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.textDark,
    marginLeft: 4,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: Theme.colors.textDark,
  },
  eyeButton: {
    paddingRight: 16,
  },
  forgotPassword: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: Theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: Theme.colors.textGray,
  },
  socialGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: Theme.colors.white,
    gap: 8,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.textDark,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: Theme.colors.textGray,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.deepBlue,
  },
  countryCode: {
    paddingLeft: 16,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    marginRight: 8,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  otpScreen: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  otpHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  otpContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  otpHeadlineSection: {
    marginBottom: 40,
  },
  otpTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Theme.colors.deepBlue,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  otpSubtitle: {
    fontSize: 16,
    color: Theme.colors.textGray,
    lineHeight: 24,
  },
  otpPhone: {
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  otpInputContainer: {
    marginBottom: 32,
    position: 'relative',
    height: 70,
    justifyContent: 'center',
  },
  otpBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  otpBox: {
    width: (width - 48 - 40) / 6,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: Theme.colors.primary,
    borderWidth: 2,
    backgroundColor: Theme.colors.white,
  },
  otpBoxFilled: {
    borderColor: Theme.colors.primary,
  },
  otpBoxText: {
    fontSize: 24,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  resendTimerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  resendLabel: {
    fontSize: 14,
    color: Theme.colors.textGray,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  resendDisabled: {
    color: '#9CA3AF',
  },
  otpFooter: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
})

