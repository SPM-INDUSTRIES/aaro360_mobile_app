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
  Dimensions,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../src/store/store'
import { sendOtp, register, clearError, registerWithPhone } from '../src/store/slices/authSlice'
import { sendOTP, verifyOTP, formatPhoneNumber } from '../src/services/phoneAuth.service'
import { ConfirmationResult } from 'firebase/auth'
import { Theme } from '../src/styles/theme'
import { Ionicons } from '@expo/vector-icons'

const { width } = Dimensions.get('window')

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
  const [countdown, setCountdown] = useState(0)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [otpLoading, setOtpLoading] = useState(false)

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
    const digits = phoneNumber.replace(/\D/g, '')
    if (digits.length < 9 || digits.length > 10) {
      Alert.alert('Validation Error', 'Please enter a valid 9-10 digit phone number')
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
      Alert.alert(
        'Phone Authentication Unavailable',
        'Phone authentication requires a reCAPTCHA verifier. Please use email registration.'
      )
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
      }
    } else {
      Alert.alert('Phone Authentication Unavailable', 'Please use email.')
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
        Alert.alert('Error', 'OTP session expired.')
        return
      }
      // Phone register logic...
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

            {/* Social Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialGrid}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => Alert.alert('Coming Soon', 'Google Registration is currently under development.')}
              >
                <Ionicons name="logo-google" size={20} color="#EA4335" />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => Alert.alert('Coming Soon', 'Apple Registration is currently under development.')}
              >
                <Ionicons name="logo-apple" size={20} color="#000000" />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>

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
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: '700',
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
  signInLink: {
    fontSize: 14,
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
  socialButtonText: {
    fontSize: 14,
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
    fontSize: 16,
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
    height: 70,
    justifyContent: 'center',
  },
  otpBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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

