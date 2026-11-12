import axios from 'axios'
import { API_URL } from './api'

/**
 * SMS OTP client (login verification only).
 *
 * SECURITY: The Notify.lk credentials (user_id / api_key / sender_id) live ONLY
 * on the backend. This client never holds the SMS API key — it just calls our
 * own backend (/auth/sms/*), which performs the actual Notify.lk send.
 * Backend implementation: backend-api/src/modules/notifications + /auth/sms endpoints.
 */

const smsHttp = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

/** Feature flag so you can switch SMS OTP on/off without a rebuild. */
export const SMS_OTP_ENABLED = process.env.EXPO_PUBLIC_SMS_OTP_ENABLED === 'true'

export interface SendOtpResponse {
  success: boolean
  message?: string
  // Optional opaque reference the backend may return to correlate verify calls
  reference?: string
  // Seconds the client should wait before allowing a resend
  resendAfter?: number
}

export interface VerifyOtpResponse {
  verified: boolean
  // true = existing account (tokens returned); false = new number, collect a name
  registered: boolean
  message?: string
  // Returned only when registered === true
  accessToken?: string
  refreshToken?: string
  user?: any
}

export interface SmsAuthResponse {
  accessToken: string
  refreshToken: string
  user: any
}

export const smsApi = {
  /**
   * Ask the backend to generate an OTP and send it via Notify.lk SMS.
   * @param phoneNumber Local number; backend normalises to 947XXXXXXXX.
   */
  sendOtp: (phoneNumber: string) =>
    smsHttp.post<SendOtpResponse>('/auth/sms/send-otp', { phoneNumber }),

  /**
   * Verify the code the user received by SMS.
   */
  verifyOtp: (phoneNumber: string, code: string, reference?: string) =>
    smsHttp.post<VerifyOtpResponse>('/auth/sms/verify-otp', {
      phoneNumber,
      code,
      reference,
    }),

  /**
   * Resend the OTP (subject to backend rate-limiting).
   */
  resendOtp: (phoneNumber: string, reference?: string) =>
    smsHttp.post<SendOtpResponse>('/auth/sms/resend-otp', { phoneNumber, reference }),

  /**
   * Register a new (already OTP-verified) phone number. Returns auth tokens.
   */
  register: (data: {
    phoneNumber: string
    firstName: string
    lastName: string
    email?: string
  }) => smsHttp.post<SmsAuthResponse>('/auth/sms/register', data),
}
