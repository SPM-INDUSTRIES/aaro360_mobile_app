import { auth } from '../config/firebase.config'
import {
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth'
import { normalizePhoneNumber } from '../utils/phone-normalizer'

/**
 * Format phone number with country code
 * Uses shared normalizer for consistency
 * @deprecated Use normalizePhoneNumber from phone-normalizer.ts instead
 */
export const formatPhoneNumber = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone)
  return normalized || phone
}

/**
 * Create a promise with timeout
 */
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ])
}

/**
 * Send OTP to phone number
 * Note: Phone authentication requires a reCAPTCHA verifier
 * For React Native, use expo-firebase-recaptcha's FirebaseRecaptchaVerifierModal
 */
export const sendOTP = async (
  phoneNumber: string,
  verifier: any
): Promise<ConfirmationResult> => {
  try {
    // Check if auth is initialized
    if (!auth) {
      throw new Error('Firebase authentication is not initialized. Please check your Firebase configuration in .env file.')
    }

    if (!verifier) {
      throw new Error('Phone authentication verifier is required. Please use FirebaseRecaptchaVerifierModal from expo-firebase-recaptcha.')
    }

    const formattedPhone = normalizePhoneNumber(phoneNumber)

    if (!formattedPhone) {
      throw new Error('Invalid phone number format. Please enter a valid Sri Lankan phone number.')
    }

    if (__DEV__) console.log('Sending OTP to:', formattedPhone)

    // Add timeout to prevent infinite loading (30 seconds)
    const confirmationResult = await withTimeout(
      signInWithPhoneNumber(auth, formattedPhone, verifier),
      30000,
      'Request timed out. Please check your internet connection and try again.'
    )

    if (__DEV__) console.log('OTP sent successfully')
    return confirmationResult
  } catch (error: any) {
    if (__DEV__) console.error('Error sending OTP:', error)
    
    // Provide more specific error messages
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number. Please check and try again.')
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please try again later.')
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('SMS quota exceeded. Please contact support.')
    } else if (error.code === 'auth/captcha-check-failed') {
      throw new Error('Verification failed. Please try again.')
    } else if (error.message?.includes('timed out')) {
      throw error
    } else if (error.message) {
      throw new Error(error.message)
    }
    
    throw new Error('Failed to send OTP. Please check your phone number and internet connection.')
  }
}

/**
 * Verify OTP code
 */
export const verifyOTP = async (
  confirmationResult: ConfirmationResult,
  code: string
): Promise<string> => {
  try {
    const result = await confirmationResult.confirm(code)
    if (!result.user) {
      throw new Error('Failed to verify OTP')
    }

    // Get Firebase ID token
    const idToken = await result.user.getIdToken()
    return idToken
  } catch (error: any) {
    if (__DEV__) console.error('Error verifying OTP:', error)
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Invalid OTP code. Please try again.')
    } else if (error.code === 'auth/code-expired') {
      throw new Error('OTP code has expired. Please request a new one.')
    }
    throw new Error(error.message || 'Failed to verify OTP')
  }
}

/**
 * Check if a phone number is a test number
 * Test numbers are configured in Firebase Console
 */
export const isTestPhoneNumber = (phoneNumber: string): boolean => {
  // Add test phone numbers from Firebase Console here
  // These numbers will use the test OTP code configured in Firebase Console
  const testNumbers: string[] = [
    // Example: '+94700000000',
  ]
  const formatted = normalizePhoneNumber(phoneNumber)
  return formatted ? testNumbers.includes(formatted) : false
}
