import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native'
import { Theme } from "../src/styles/theme"
import { rs, rf, wp, hp, screen, responsiveWidth } from "../src/utils/responsive"
import { useRouter } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../src/store/store'
import { sendOtp, register, clearError, registerWithPhone } from '../src/store/slices/authSlice'
import { sendOTP, verifyOTP, formatPhoneNumber } from '../src/services/phoneAuth.service'
import { ConfirmationResult } from 'firebase/auth'
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha'
import { Ionicons } from '@expo/vector-icons'
import { useAlert } from '../src/context/AlertContext'

const { width } = Dimensions.get('window')

export default function RegisterScreen() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { status, error } = useSelector((state: RootState) => state.auth)
  const { showAlert } = useAlert()

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
  const [countdown, setCountdown] = useState(0)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [otpLoading, setOtpLoading] = useState(false)
  const recaptchaVerifier = useRef<any>(null)

  useEffect(() => {
    if (error) {
      showAlert({ title: 'Error', message: error, type: 'error' })
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
      showAlert({ title: 'Validation Error', message: 'Please enter your first name', type: 'warning' })
      return false
    }
    if (!lastName.trim()) {
      showAlert({ title: 'Validation Error', message: 'Please enter your last name', type: 'warning' })
      return false
    }
    if (!email.trim()) {
      showAlert({ title: 'Validation Error', message: 'Please enter your email', type: 'warning' })
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert({ title: 'Validation Error', message: 'Please enter a valid email address', type: 'warning' })
      return false
    }
    if (!password) {
      showAlert({ title: 'Validation Error', message: 'Please enter a password', type: 'warning' })
      return false
    }
    if (password.length < 8) {
      showAlert({ title: 'Validation Error', message: 'Password must be at least 8 characters long', type: 'warning' })
      return false
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      showAlert({
        title: 'Validation Error',
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        type: 'warning'
      })
      return false
    }
    if (password !== confirmPassword) {
      showAlert({ title: 'Validation Error', message: 'Passwords do not match', type: 'warning' })
      return false
    }
    return true
  }

  const validatePhoneForm = (): boolean => {
    if (!firstName.trim()) {
      showAlert({ title: 'Validation Error', message: 'Please enter your first name', type: 'warning' })
      return false
    }
    if (!lastName.trim()) {
      showAlert({ title: 'Validation Error', message: 'Please enter your last name', type: 'warning' })
      return false
    }
    if (!phoneNumber.trim()) {
      showAlert({ title: 'Validation Error', message: 'Please enter your phone number', type: 'warning' })
      return false
    }
    const digits = phoneNumber.replace(/\D/g, '')
    if (digits.length < 9 || digits.length > 10) {
      showAlert({ title: 'Validation Error', message: 'Please enter a valid 9-10 digit phone number', type: 'warning' })
      return false
    }
    return true
  }

  const handleSendOtp = async () => {
    if (authMode === 'email') {
      if (!validateEmailForm()) return
      const result = await dispatch(sendOtp(email))
      if (sendOtp.fulfilled.match(result)) {
        setCountdown(60)
        setStep('otp')
      }
    } else {
      if (!validatePhoneForm()) return
      if (!recaptchaVerifier.current) {
        showAlert({
          title: 'Error',
          message: 'reCAPTCHA not initialized. Please try again.',
          type: 'error'
        })
        return
      }
      try {
        setOtpLoading(true)
        const result = await sendOTP(phoneNumber, recaptchaVerifier.current)
        setConfirmationResult(result)
        setCountdown(60)
        setStep('otp')
      } catch (error: any) {
        showAlert({ title: 'Error', message: error.message || 'Failed to send OTP', type: 'error' })
      } finally {
        setOtpLoading(false)
      }
    }
  }

  const handleResendOtp = async () => {
    if (countdown > 0) {
      showAlert({ title: 'Please wait', message: `You can resend OTP in ${countdown} seconds`, type: 'info' })
      return
    }

    if (authMode === 'email') {
      const result = await dispatch(sendOtp(email))
      if (sendOtp.fulfilled.match(result)) {
        setCountdown(60)
      }
    } else {
      if (!recaptchaVerifier.current) {
        showAlert({ title: 'Error', message: 'reCAPTCHA not initialized. Please try again.', type: 'error' })
        return
      }
      try {
        setOtpLoading(true)
        const result = await sendOTP(phoneNumber, recaptchaVerifier.current)
        setConfirmationResult(result)
        setCountdown(60)
      } catch (error: any) {
        showAlert({ title: 'Error', message: error.message || 'Failed to send OTP', type: 'error' })
      } finally {
        setOtpLoading(false)
      }
    }
  }

  const handleRegister = async () => {
    if (!otp || otp.length !== 6) {
      showAlert({ title: 'Validation Error', message: 'Please enter a valid 6-digit OTP', type: 'warning' })
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
        showAlert({ title: 'Error', message: 'OTP session expired. Please request a new OTP.', type: 'error' })
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
        showAlert({ title: 'Error', message: error.message || 'Failed to verify OTP', type: 'error' })
      } finally {
        setOtpLoading(false)
      }
    }
  }

  if (step === 'otp') {
    return (
      <SafeAreaView style={styles.otpScreen}>
        <View style={styles.otpHeader}>
          <TouchableOpacity onPress={() => setStep('form')} style={styles.backBtnStyled}>
            <Ionicons name="chevron-back" size={24} color={Theme.colors.textDark} />
          </TouchableOpacity>
        </View>

        <View style={styles.otpContent}>
          <View style={styles.otpHeadlineSection}>
            <Text style={styles.otpTitle}>Verification Code</Text>
            <Text style={styles.otpSubtitle}>
              We have sent the code verification to {'\n'}
              <Text style={styles.otpPhone}>{authMode === 'email' ? email : `+94 ${phoneNumber}`}</Text>
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
            <TouchableOpacity disabled={countdown > 0} onPress={handleResendOtp}>
              <Text style={[styles.resendLink, countdown > 0 && styles.resendDisabled]}>
                {countdown > 0
                  ? `Resend in 00:${countdown.toString().padStart(2, '0')}`
                  : 'Resend Now'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.otpFooter}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (otp.length < 6 || status === 'loading') && styles.buttonDisabled
              ]}
              onPress={handleRegister}
              disabled={otp.length < 6 || status === 'loading'}
            >
              {status === 'loading' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Register</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={{
          apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        }}
        attemptInvisibleVerification={true}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topBackBtn}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started with Aaro360</Text>
          </View>

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

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>First Name</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="First name"
                    placeholderTextColor="#999"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Last Name</Text>
                <View style={styles.inputWrapper}>
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
            </View>

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
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
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
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Theme.colors.textGray} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={Theme.colors.textGray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#999"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </>
            ) : (
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
            )}

            <TouchableOpacity
              style={[styles.primaryButton, (status === 'loading' || otpLoading) && styles.buttonDisabled]}
              onPress={handleSendOtp}
              disabled={status === 'loading' || otpLoading}
            >
              {(status === 'loading' || otpLoading) ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Send OTP</Text>
              )}
            </TouchableOpacity>

            {/* Social Divider and Buttons - HIDDEN (Google/Apple login not implemented yet)
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialGrid}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => showAlert({ title: 'Coming Soon', message: 'Google Registration is currently under development.', type: 'info' })}
              >
                <Ionicons name="logo-google" size={20} color="#EA4335" />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => showAlert({ title: 'Coming Soon', message: 'Apple Registration is currently under development.', type: 'info' })}
              >
                <Ionicons name="logo-apple" size={20} color="#000000" />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>
            */}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.signInLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 40,
  },
  topBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: wp(75),
    height: rs(100),
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
    fontSize: rf(Theme.fontSize.md),
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
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: rf(Theme.fontSize.md),
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
    fontSize: rf(Theme.fontSize.base),
    color: Theme.colors.textDark,
  },
  eyeButton: {
    paddingRight: 16,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
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
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: rf(Theme.fontSize.md),
    color: Theme.colors.textGray,
  },
  signInLink: {
    fontSize: rf(Theme.fontSize.md),
    fontWeight: '700',
    color: Theme.colors.deepBlue,
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
    fontSize: rf(Theme.fontSize.md),
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
  socialButtonText: {
    fontSize: rf(Theme.fontSize.md),
    fontWeight: '500',
    color: Theme.colors.textDark,
  },
  countryCode: {
    paddingLeft: 16,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    marginRight: 8,
  },
  countryCodeText: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  // OTP Styles
  otpScreen: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  otpHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtnStyled: {
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
  },
  otpSubtitle: {
    fontSize: rf(Theme.fontSize.base),
    color: Theme.colors.textGray,
    lineHeight: 24,
  },
  otpPhone: {
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  otpInputContainer: {
    marginBottom: 32,
    height: 70,
    justifyContent: 'center',
  },
  otpBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpBox: {
    width: responsiveWidth.otpBox(),
    height: Theme.touchTarget.large,
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
    fontSize: rf(Theme.fontSize.xxl),
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
  },
  resendLabel: {
    fontSize: rf(Theme.fontSize.md),
    color: Theme.colors.textGray,
  },
  resendLink: {
    fontSize: rf(Theme.fontSize.md),
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

