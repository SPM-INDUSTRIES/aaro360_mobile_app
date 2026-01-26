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
} from 'react-native'
import { useRouter } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../src/store/store'
import { sendOtp, register, clearError, registerWithPhone } from '../src/store/slices/authSlice'
import { sendOTP, verifyOTP, formatPhoneNumber } from '../src/services/phoneAuth.service'
import { ConfirmationResult } from 'firebase/auth'

// Conditionally import reCAPTCHA - only available in development builds
let FirebaseRecaptchaVerifierModal: any = null
let isRecaptchaAvailable = false

try {
  const recaptchaModule = require('expo-firebase-recaptcha')
  FirebaseRecaptchaVerifierModal = recaptchaModule.FirebaseRecaptchaVerifierModal
  isRecaptchaAvailable = true
} catch (error) {
  console.warn('expo-firebase-recaptcha not available. Phone auth requires a development build.')
  isRecaptchaAvailable = false
}

const LOGO_WIDTH = 250
const LOGO_HEIGHT = 100

export default function RegisterScreen() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { status, error } = useSelector((state: RootState) => state.auth)

  const [authMode, setAuthMode] = useState<'email' | 'mobile'>('email')
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [otpLoading, setOtpLoading] = useState(false)
  const recaptchaVerifier = useRef<any>(null)

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error)
      dispatch(clearError())
    }
  }, [error])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [countdown])

  const validateEmailForm = (): boolean => {
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'Please enter your first name')
      return false
    }
    if (!lastName.trim()) {
      Alert.alert('Validation Error', 'Please enter your last name')
      return false
    }
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address')
      return false
    }
    if (!password) {
      Alert.alert('Validation Error', 'Please enter a password')
      return false
    }
    if (password.length < 8) {
      Alert.alert('Validation Error', 'Password must be at least 8 characters long')
      return false
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      Alert.alert(
        'Validation Error',
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      )
      return false
    }
    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match')
      return false
    }
    return true
  }

  const validatePhoneForm = (): boolean => {
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'Please enter your first name')
      return false
    }
    if (!lastName.trim()) {
      Alert.alert('Validation Error', 'Please enter your last name')
      return false
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number')
      return false
    }
    const formattedPhone = formatPhoneNumber(phoneNumber)
    // Sri Lankan phone numbers are 9 digits after +94
    if (!/^\+94\d{9}$/.test(formattedPhone)) {
      Alert.alert('Validation Error', 'Please enter a valid phone number (9 digits after removing leading 0)')
      return false
    }
    return true
  }

  const handleSendOtp = async () => {
    if (authMode === 'email') {
      if (!validateEmailForm()) {
        return
      }
      const result = await dispatch(sendOtp(email))
      if (sendOtp.fulfilled.match(result)) {
        setOtpSent(true)
        setCountdown(60)
        setStep('otp')
        Alert.alert('Success', 'OTP sent to your email')
      }
    } else {
      if (!validatePhoneForm()) {
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
        const formattedPhone = formatPhoneNumber(phoneNumber)
        
        // Pass the recaptchaVerifier ref directly - it acts as the verifier
        if (!recaptchaVerifier.current) {
          throw new Error('reCAPTCHA verifier not initialized')
        }
        
        const confirmation = await sendOTP(formattedPhone, recaptchaVerifier.current)
        setConfirmationResult(confirmation)
        setOtpSent(true)
        setCountdown(60)
        setStep('otp')
        Alert.alert('Success', 'OTP sent to your phone')
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to send OTP')
      } finally {
        setOtpLoading(false)
      }
    }
  }

  const handleResendOtp = async () => {
    if (countdown > 0) {
      Alert.alert('Please wait', `You can resend OTP in ${countdown} seconds`)
      return
    }

    if (authMode === 'email') {
      const result = await dispatch(sendOtp(email))
      if (sendOtp.fulfilled.match(result)) {
        setCountdown(60)
        Alert.alert('Success', 'OTP resent to your email')
      }
    } else {
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
        const formattedPhone = formatPhoneNumber(phoneNumber)
        
        // Pass the recaptchaVerifier ref directly - it acts as the verifier
        if (!recaptchaVerifier.current) {
          throw new Error('reCAPTCHA verifier not initialized')
        }
        
        const confirmation = await sendOTP(formattedPhone, recaptchaVerifier.current)
        setConfirmationResult(confirmation)
        setCountdown(60)
        Alert.alert('Success', 'OTP resent to your phone')
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to resend OTP')
      } finally {
        setOtpLoading(false)
      }
    }
  }

  const handleRegister = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Validation Error', 'Please enter a valid 6-digit OTP')
      return
    }

    if (authMode === 'email') {
      const result = await dispatch(
        register({
          firstName,
          lastName,
          email,
          password,
          otp,
        })
      )

      if (register.fulfilled.match(result)) {
        router.replace('/(tabs)/')
      }
    } else {
      if (!confirmationResult) {
        Alert.alert('Error', 'OTP session expired. Please request a new OTP.')
        return
      }

      try {
        setOtpLoading(true)
        const idToken = await verifyOTP(confirmationResult, otp)
        const result = await dispatch(
          registerWithPhone({
            firstName,
            lastName,
            phoneNumber: formatPhoneNumber(phoneNumber),
            idToken,
          })
        )

        if (registerWithPhone.fulfilled.match(result)) {
          router.replace('/(tabs)/')
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to verify OTP')
      } finally {
        setOtpLoading(false)
      }
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
          <Text style={styles.title}>
            {step === 'form' ? 'Create Account' : authMode === 'email' ? 'Verify Email' : 'Verify Phone'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'form'
              ? 'Sign up to get started'
              : authMode === 'email'
              ? 'Enter the OTP sent to your email'
              : 'Enter the OTP sent to your phone'}
          </Text>

          {step === 'form' ? (
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

              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="First name"
                    placeholderTextColor="#999"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Last name"
                    placeholderTextColor="#999"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
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
                    <Text style={styles.passwordHint}>
                      Must contain uppercase, lowercase, and number
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm your password"
                      placeholderTextColor="#999"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                  </View>
                </>
              ) : (
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
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  (status === 'loading' || otpLoading) && styles.buttonDisabled,
                ]}
                onPress={handleSendOtp}
                disabled={status === 'loading' || otpLoading}
              >
                {(status === 'loading' || otpLoading) ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>OTP Code</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor="#999"
                  value={otp}
                  onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                <Text style={styles.otpHint}>
                  Enter the 6-digit code sent to {authMode === 'email' ? email : formatPhoneNumber(phoneNumber)}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  (status === 'loading' || otpLoading) && styles.buttonDisabled,
                ]}
                onPress={handleRegister}
                disabled={status === 'loading' || otpLoading}
              >
                {(status === 'loading' || otpLoading) ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Register</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendOtp}
                disabled={countdown > 0}
              >
                <Text
                  style={[
                    styles.resendButtonText,
                    countdown > 0 && styles.resendButtonTextDisabled,
                  ]}
                >
                  {countdown > 0
                    ? `Resend OTP in ${countdown}s`
                    : 'Resend OTP'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep('form')}
              >
                <Text style={styles.backButtonText}>Back to Form</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

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
  row: {
    flexDirection: 'row',
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
  passwordHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
  otpHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
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
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
})
