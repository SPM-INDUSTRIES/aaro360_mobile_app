import { useState, useEffect, useRef } from 'react'
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
} from 'react-native'
import { useRouter } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../src/store/store'
import { loginWithEmail, loginWithGoogle, clearError, loginWithPhone } from '../src/store/slices/authSlice'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { sendOTP, verifyOTP, formatPhoneNumber } from '../src/services/phoneAuth.service'
import { ConfirmationResult } from 'firebase/auth'

// Conditionally import reCAPTCHA - only available in development builds
let FirebaseRecaptchaVerifierModal: any = null
let isRecaptchaAvailable = false

try {
  // Try to import - will fail in Expo Go
  const recaptchaModule = require('expo-firebase-recaptcha')
  FirebaseRecaptchaVerifierModal = recaptchaModule.FirebaseRecaptchaVerifierModal
  isRecaptchaAvailable = true
} catch (error) {
  // Not available in Expo Go - will need development build
  console.warn('expo-firebase-recaptcha not available. Phone auth requires a development build.')
  isRecaptchaAvailable = false
}

WebBrowser.maybeCompleteAuthSession()

const LOGO_WIDTH = 250
const LOGO_HEIGHT = 100

export default function LoginScreen() {
  const router = useRouter()
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
  const recaptchaVerifier = useRef<any>(null)

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
    if (isAuthenticated) {
      router.replace('/(tabs)/')
    }
  }, [isAuthenticated])

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

    // Validate phone number length before attempting to send
    // Sri Lankan numbers: 9 digits (without leading 0) or 10 digits (with leading 0)
    const digits = phoneNumber.replace(/\D/g, '')
    if (digits.length < 9 || digits.length > 10) {
      Alert.alert('Validation Error', 'Please enter a valid 9-10 digit phone number')
      return
    }
    
    // Additional validation: if 10 digits, should start with 0
    if (digits.length === 10 && !digits.startsWith('0')) {
      Alert.alert('Validation Error', '10-digit numbers should start with 0')
      return
    }

    // Check if reCAPTCHA is available
    if (!isRecaptchaAvailable) {
      Alert.alert(
        'Development Build Required',
        'Phone authentication requires a development build with native modules. Please create a development build to use this feature.\n\nSee DEVELOPMENT_BUILD.md for instructions.',
        [{ text: 'OK' }]
      )
      return
    }

    try {
      setOtpLoading(true)
      console.log('Attempting to send OTP to:', phoneNumber)
      const formattedPhone = formatPhoneNumber(phoneNumber)
      
      // Pass the recaptchaVerifier ref directly - it acts as the verifier
      if (!recaptchaVerifier.current) {
        throw new Error('reCAPTCHA verifier not initialized')
      }
      
      const confirmation = await sendOTP(formattedPhone, recaptchaVerifier.current)
      console.log('OTP sent successfully, showing modal')
      setConfirmationResult(confirmation)
      setShowOtpModal(true)
      setResendCountdown(60)
    } catch (error: any) {
      console.error('Error in handlePhoneLogin:', error)
      const errorMessage = error?.message || 'Failed to send OTP. Please try again.'
      Alert.alert('Error', errorMessage)
    } finally {
      setOtpLoading(false)
    }
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

    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Phone number is missing')
      return
    }

    // Check if reCAPTCHA is available
    if (!isRecaptchaAvailable) {
      Alert.alert(
        'Development Build Required',
        'Phone authentication requires a development build. Please create a development build to use this feature.'
      )
      return
    }

    try {
      setOtpLoading(true)
      console.log('Resending OTP to:', phoneNumber)
      const formattedPhone = formatPhoneNumber(phoneNumber)
      
      // Pass the recaptchaVerifier ref directly - it acts as the verifier
      if (!recaptchaVerifier.current) {
        throw new Error('reCAPTCHA verifier not initialized')
      }
      
      const confirmation = await sendOTP(formattedPhone, recaptchaVerifier.current)
      setConfirmationResult(confirmation)
      setResendCountdown(60)
      Alert.alert('Success', 'OTP resent to your phone')
    } catch (error: any) {
      console.error('Error in handleResendOtp:', error)
      const errorMessage = error?.message || 'Failed to resend OTP. Please try again.'
      Alert.alert('Error', errorMessage)
    } finally {
      setOtpLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await promptAsync()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start Google login')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.form}>
            {/* Toggle Mode */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  authMode === 'email' && styles.toggleButtonActive,
                ]}
                onPress={() => setAuthMode('email')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    authMode === 'email' && styles.toggleButtonTextActive,
                  ]}
                >
                  Continue with Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  authMode === 'mobile' && styles.toggleButtonActive,
                ]}
                onPress={() => setAuthMode('mobile')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    authMode === 'mobile' && styles.toggleButtonTextActive,
                  ]}
                >
                  Continue with Mobile
                </Text>
              </TouchableOpacity>
            </View>

            {authMode === 'email' ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter your password"
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
                      <Text style={styles.eyeButtonText}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    status === 'loading' && styles.loginButtonDisabled,
                  ]}
                  onPress={handleEmailLogin}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.phoneContainer}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+94</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="77 123 4567"
                      placeholderTextColor="#999"
                      value={phoneNumber}
                      onChangeText={(text) => {
                        // Remove non-digits
                        const digits = text.replace(/\D/g, '')
                        setPhoneNumber(digits)
                      }}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                  <Text style={styles.phoneHint}>
                    Enter your 10-digit phone number
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    (otpLoading || status === 'loading') && styles.loginButtonDisabled,
                  ]}
                  onPress={handlePhoneLogin}
                  disabled={otpLoading || status === 'loading'}
                >
                  {otpLoading || status === 'loading' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[
                styles.googleButton,
                (status === 'loading' || !request) && styles.googleButtonDisabled,
              ]}
              onPress={handleGoogleLogin}
              disabled={status === 'loading' || !request}
            >
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* OTP Verification Modal */}
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify OTP</Text>
            <Text style={styles.modalSubtitle}>
              Enter the 6-digit code sent to {formatPhoneNumber(phoneNumber)}
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor="#999"
                value={otp}
                onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[
                styles.verifyButton,
                otpLoading && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerifyOtp}
              disabled={otpLoading}
            >
              {otpLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendOtp}
              disabled={resendCountdown > 0 || otpLoading}
            >
              <Text
                style={[
                  styles.resendButtonText,
                  resendCountdown > 0 && styles.resendButtonTextDisabled,
                ]}
              >
                {resendCountdown > 0
                  ? `Resend OTP in ${resendCountdown}s`
                  : 'Resend OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowOtpModal(false)
                setOtp('')
                setConfirmationResult(null)
              }}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* reCAPTCHA Verifier Modal - Only render if available */}
      {isRecaptchaAvailable && FirebaseRecaptchaVerifierModal && (
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={{
            apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
            authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
            projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
          }}
          attemptInvisibleVerification={true}
          title="Verification"
          subtitle="Please verify that you are a human"
          cancelLabel="Cancel"
        />
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    marginBottom: 32,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#F59E0B',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  phoneHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: '#FFFFFF',
    color: '#333',
    fontWeight: 'bold',
  },
  verifyButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: '#999',
  },
  closeButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666',
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  eyeButtonText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
})
