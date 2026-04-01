import { auth } from '../config/firebase.config'
import {
  signInWithPhoneNumber,
  ConfirmationResult,
  RecaptchaVerifier,
} from 'firebase/auth'
import { normalizePhoneNumber } from '../utils/phone-normalizer'

export const formatPhoneNumber = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone)
  return normalized || phone
}

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

let recaptchaVerifier: RecaptchaVerifier | null = null

export const initRecaptcha = (): RecaptchaVerifier | null => {
  if (!auth) {
    console.error('Firebase auth not initialized')
    return null
  }

  try {
    if (recaptchaVerifier) {
      recaptchaVerifier.clear()
    }

    recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        console.log('reCAPTCHA verified')
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired')
      },
    })

    return recaptchaVerifier
  } catch (error) {
    console.error('Failed to initialize reCAPTCHA:', error)
    return null
  }
}

export const sendOTP = async (
  phoneNumber: string,
  verifier?: any
): Promise<ConfirmationResult> => {
  try {
    if (!auth) {
      throw new Error('Firebase authentication is not initialized. Please check your Firebase configuration in .env file.')
    }

    const formattedPhone = normalizePhoneNumber(phoneNumber)

    if (!formattedPhone) {
      throw new Error('Invalid phone number format. Please enter a valid Sri Lankan phone number.')
    }

    if (__DEV__) console.log('Sending OTP to:', formattedPhone)

    let verifierToUse = verifier || recaptchaVerifier

    if (!verifierToUse) {
      verifierToUse = initRecaptcha()
    }

    if (!verifierToUse) {
      throw new Error('Failed to initialize phone verification. Please refresh and try again.')
    }

    const confirmationResult = await withTimeout(
      signInWithPhoneNumber(auth, formattedPhone, verifierToUse),
      30000,
      'Request timed out. Please check your internet connection and try again.'
    )

    if (__DEV__) console.log('OTP sent successfully')
    return confirmationResult
  } catch (error: any) {
    if (__DEV__) console.error('Error sending OTP:', error)
    
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

export const verifyOTP = async (
  confirmationResult: ConfirmationResult,
  code: string
): Promise<string> => {
  try {
    const result = await confirmationResult.confirm(code)
    if (!result.user) {
      throw new Error('Failed to verify OTP')
    }

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

export const isTestPhoneNumber = (phoneNumber: string): boolean => {
  const testNumbers: string[] = []
  const formatted = normalizePhoneNumber(phoneNumber)
  return formatted ? testNumbers.includes(formatted) : false
}