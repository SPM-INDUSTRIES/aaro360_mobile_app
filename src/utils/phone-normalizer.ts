/**
 * Phone Number Normalizer Utility for Mobile App
 * Standardizes Sri Lankan phone numbers to international format: +947XXXXXXXX
 */

/**
 * Normalize Sri Lankan phone number to international format
 * Input formats accepted:
 *   - 07XXXXXXXX (local format, 10 digits with leading 0)
 *   - 7XXXXXXXX (9 digits without leading 0)
 *   - +947XXXXXXXX (international format)
 *   - +94 7XX XXX XXXX (with spaces)
 * 
 * Output: +947XXXXXXXX (11 digits with + prefix)
 * Returns null if invalid format
 */
export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null

  let cleaned = phone.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('+94')) {
    const digits = cleaned.substring(1)
    if (digits.length === 11 && /^94[0-9]{9}$/.test(digits)) {
      return '+' + digits
    }
    if (digits.length === 12 && /^94[0-9]{10}$/.test(digits)) {
      return '+' + digits.substring(0, 11)
    }
  }

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  if (cleaned.startsWith('94') && cleaned.length >= 11) {
    cleaned = cleaned.substring(2)
  }

  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  if (cleaned.length === 9 && /^[0-9]{9}$/.test(cleaned)) {
    return '+94' + cleaned
  }

  if (cleaned.length === 10 && /^[0-9]{10}$/.test(cleaned)) {
    return '+94' + cleaned.substring(1)
  }

  return null
}

/**
 * Format phone number for display (local format)
 * Input: +947XXXXXXXX
 * Output: 07XXXXXXXX
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string | null {
  if (!phone) return null
  const normalized = normalizePhoneNumber(phone)
  if (!normalized) return phone
  return '0' + normalized.substring(3)
}

/**
 * Validate if a phone number is a valid Sri Lankan number
 * Accepts both local (07XXXXXXXX) and international (+947XXXXXXXX) formats
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false

  const cleaned = phone.replace(/[^\d]/g, '')

  if (cleaned.length === 10 && /^0[0-9]{9}$/.test(cleaned)) {
    return true
  }

  if (cleaned.length === 11 && /^94[0-9]{9}$/.test(cleaned)) {
    return true
  }

  if (cleaned.length === 9 && /^[0-9]{9}$/.test(cleaned)) {
    return true
  }

  return normalizePhoneNumber(phone) !== null
}

/**
 * Get user-friendly validation message for phone input
 */
export function getPhoneValidationMessage(): string {
  return 'Please enter a valid phone number (e.g., 0712345678 or +94771234567)'
}