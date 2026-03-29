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
  Modal,
  Dimensions,
  SafeAreaView,
} from 'react-native'
import { Theme } from "../src/styles/theme"
import { rs, rf, wp, hp, screen, responsiveWidth } from "../src/utils/responsive"
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
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha'
import { Ionicons } from '@expo/vector-icons'
import { authApi } from '../src/lib/api'
import { useAlert } from '../src/context/AlertContext'

const { width } = Dimensions.get('window')

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const router = useRouter()
  const navigationState = useRootNavigationState()
  const dispatch = useDispatch<AppDispatch>()
  const { status, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  )
  const { showAlert } = useAlert()

  const [authMode, setAuthMode] = useState<'email' | 'mobile'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showOtpModal, setShowOtpModal] = useState(false)
  const recaptchaVerifier = useRef<any>(null)
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'newPassword'>('email')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

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
      showAlert({ title: 'Authentication Error', message: response.error?.message || 'Failed to authenticate with Google', type: 'error' })
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
      showAlert({ title: 'Login Error', message: error, type: 'error' })
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
      showAlert({ title: 'Validation Error', message: 'Please enter both email and password', type: 'warning' })
      return
    }
    dispatch(loginWithEmail({ email, password }))
  }

  const handlePhoneLogin = async () => {
    if (!phoneNumber.trim()) {
      showAlert({ title: 'Validation Error', message: 'Please enter your phone number', type: 'warning' })
      return
    }
    const digits = phoneNumber.replace(/\D/g, '')
    if (digits.length < 9 || digits.length > 10) {
      showAlert({ title: 'Validation Error', message: 'Please enter a valid 9-10 digit phone number', type: 'warning' })
      return
    }

    if (!recaptchaVerifier.current) {
      showAlert({ title: 'Error', message: 'reCAPTCHA not initialized. Please try again.', type: 'error' })
      return
    }
    try {
      setOtpLoading(true)
      const result = await sendOTP(phoneNumber, recaptchaVerifier.current)
      setConfirmationResult(result)
      setShowOtpModal(true)
      setResendCountdown(60)
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message || 'Failed to send OTP', type: 'error' })
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      showAlert({ title: 'Validation Error', message: 'Please enter a valid 6-digit OTP', type: 'warning' })
      return
    }

    if (!confirmationResult) {
      showAlert({ title: 'Error', message: 'OTP session expired. Please request a new OTP.', type: 'error' })
      return
    }

    try {
      setOtpLoading(true)
      const idToken = await verifyOTP(confirmationResult, otp)
      const result = await dispatch(loginWithPhone(idToken))
      
      if (loginWithPhone.rejected.match(result)) {
        const errorMsg = result.payload as string
        dispatch(clearError())
        if (errorMsg && (errorMsg.toLowerCase().includes('not registered') || errorMsg.toLowerCase().includes('sign up'))) {
          setShowOtpModal(false)
          setOtp('')
          showAlert({
            title: 'Phone Not Registered',
            message: 'This phone number is not registered with us. Would you like to sign up?',
            type: 'warning',
            confirmText: 'Sign Up',
            cancelText: 'Cancel',
            onConfirm: () => router.push('/register')
          })
        } else {
          showAlert({ title: 'Error', message: errorMsg || 'Failed to verify OTP', type: 'error' })
        }
      } else {
        setShowOtpModal(false)
        setOtp('')
      }
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message || 'Failed to verify OTP', type: 'error' })
    } finally {
      setOtpLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCountdown > 0) {
      showAlert({ title: 'Please wait', message: `You can resend OTP in ${resendCountdown} seconds`, type: 'info' })
      return
    }
    if (!recaptchaVerifier.current) {
      showAlert({ title: 'Error', message: 'reCAPTCHA not initialized. Please try again.', type: 'error' })
      return
    }
    try {
      setOtpLoading(true)
      const result = await sendOTP(phoneNumber, recaptchaVerifier.current)
      setConfirmationResult(result)
      setResendCountdown(60)
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message || 'Failed to send OTP', type: 'error' })
    } finally {
      setOtpLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    showAlert({ title: 'Coming Soon', message: 'Google Login is currently under development.', type: 'info' })
  }

  const handleForgotPassword = async () => {
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

  const handleVerifyForgotOtp = async () => {
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
                    <TouchableOpacity onPress={() => setShowForgotPassword(true)}>
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

            {/* Social Divider and Buttons - HIDDEN (Google/Apple login not implemented yet)
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

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
                onPress={() => showAlert({ title: 'Coming Soon', message: 'Apple Login is currently under development.', type: 'info' })}
                disabled={status === 'loading'}
              >
                <Ionicons name="logo-apple" size={20} color="#000000" />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>
            */}

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

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        animationType="slide"
        onRequestClose={() => {
          setShowForgotPassword(false)
          resetForgotState()
        }}
      >
        <SafeAreaView style={styles.otpScreen}>
          <View style={styles.otpHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowForgotPassword(false)
                resetForgotState()
              }}
              style={styles.backBtn}
            >
              <Ionicons name="close" size={24} color={Theme.colors.textDark} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.otpContent}>
            {forgotStep === 'email' && (
              <>
                <View style={styles.otpHeadlineSection}>
                  <Text style={styles.otpTitle}>Forgot Password</Text>
                  <Text style={styles.otpSubtitle}>
                    Enter your email address and we'll send you a 6-digit code to reset your password.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color={Theme.colors.textGray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, forgotLoading && styles.buttonDisabled]}
                  onPress={handleForgotPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send Code</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {forgotStep === 'otp' && (
              <>
                <View style={styles.otpHeadlineSection}>
                  <Text style={styles.otpTitle}>Verify Code</Text>
                  <Text style={styles.otpSubtitle}>
                    Enter the 6-digit code sent to {'\n'}
                    <Text style={styles.otpPhone}>{forgotEmail}</Text>
                  </Text>
                </View>

                <View style={styles.otpInputContainer}>
                  <View style={styles.otpBoxRow}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.otpBox,
                          forgotOtp.length === i && styles.otpBoxActive,
                          forgotOtp.length > i && styles.otpBoxFilled
                        ]}
                      >
                        <Text style={styles.otpBoxText}>{forgotOtp[i] || ''}</Text>
                      </View>
                    ))}
                  </View>
                  <TextInput
                    style={styles.hiddenInput}
                    value={forgotOtp}
                    onChangeText={setForgotOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>

                <View style={[styles.resendTimerSection, { marginBottom: 24 }]}>
                  <Text style={styles.resendLabel}>Didn't receive code? </Text>
                  <TouchableOpacity disabled={resendCountdown > 0} onPress={handleForgotPassword}>
                    <Text style={[styles.resendLink, resendCountdown > 0 && styles.resendDisabled]}>
                      {resendCountdown > 0
                        ? `Resend in 00:${resendCountdown.toString().padStart(2, '0')}`
                        : 'Resend Now'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, (forgotOtp.length < 6 || forgotLoading) && styles.buttonDisabled]}
                  onPress={handleVerifyForgotOtp}
                  disabled={forgotOtp.length < 6 || forgotLoading}
                >
                  <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 24, alignItems: 'center' }}
                  onPress={() => setForgotStep('email')}
                >
                  <Text style={styles.resendLink}>Change Email</Text>
                </TouchableOpacity>
              </>
            )}

            {forgotStep === 'newPassword' && (
              <>
                <View style={styles.otpHeadlineSection}>
                  <Text style={styles.otpTitle}>New Password</Text>
                  <Text style={styles.otpSubtitle}>
                    Create a strong password for your account.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={Theme.colors.textGray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={Theme.colors.textGray}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={Theme.colors.textGray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      secureTextEntry={!showNewPassword}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, forgotLoading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
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
  forgotPassword: {
    fontSize: rf(Theme.fontSize.sm),
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
    fontSize: rf(Theme.fontSize.base),
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
  socialButtonDisabled: {
    opacity: 0.5,
  },
  socialButtonText: {
    fontSize: rf(Theme.fontSize.md),
    fontWeight: '500',
    color: Theme.colors.textDark,
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
  signUpLink: {
    fontSize: rf(Theme.fontSize.md),
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
    fontSize: rf(Theme.fontSize.base),
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
    marginBottom: 40,
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

