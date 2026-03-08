import { auth } from '../config/firebase.config'
import {
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth'


/**
 * Format phone number with country code
 * Auto-prepends +94 if missing
 * Sri Lankan phone numbers are 9 digits (after removing leading 0)
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // If doesn't start with +, prepend +94
  if (!cleaned.startsWith('+')) {
    // Remove leading 0 if present (Sri Lankan format)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1)
    }
    cleaned = '+94' + cleaned
  }

  // Return formatted number without warning
  // Validation will happen in sendOTP where the number is actually used
  return cleaned
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

    const formattedPhone = formatPhoneNumber(phoneNumber)

    // Validate phone number format - Sri Lankan numbers are 9 digits after +94
    if (!/^\+94\d{9}$/.test(formattedPhone)) {
      throw new Error('Invalid phone number format. Expected: +94XXXXXXXXX (9 digits)')
    }

    console.log('Sending OTP to:', formattedPhone)

    // Add timeout to prevent infinite loading (30 seconds)
    const confirmationResult = await withTimeout(
      signInWithPhoneNumber(auth, formattedPhone, verifier),
      30000,
      'Request timed out. Please check your internet connection and try again.'
    )

    console.log('OTP sent successfully')
    return confirmationResult
  } catch (error: any) {
    console.error('Error sending OTP:', error)
    
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
    console.error('Error verifying OTP:', error)
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
  // You can add test number patterns here
  // Or check against a list of test numbers from your config
  const testNumbers = [
    '+94765233573', // Example test number
    // Add more test numbers as needed
  ]
  const formatted = formatPhoneNumber(phoneNumber)
  return testNumbers.includes(formatted)
}
