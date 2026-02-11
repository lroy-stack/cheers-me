/**
 * Coupon Code Utilities
 * Client-side formatting and validation for gift coupon codes.
 * Format: GC-XXXXXX (6 chars, no I/O/0/1)
 */

const VALID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_REGEX = /^GC-[A-HJ-NP-Z2-9]{6}$/

/**
 * Validate a coupon code format
 */
export function isValidCouponCode(code: string): boolean {
  return CODE_REGEX.test(code.toUpperCase().trim())
}

/**
 * Format user input into proper coupon code format
 * - Uppercase
 * - Add GC- prefix if missing
 * - Strip invalid characters
 */
export function formatCouponCode(input: string): string {
  let cleaned = input.toUpperCase().trim()

  // Remove GC- prefix if present (we'll re-add)
  if (cleaned.startsWith('GC-')) {
    cleaned = cleaned.slice(3)
  }

  // Keep only valid characters
  cleaned = cleaned
    .split('')
    .filter((c) => VALID_CHARS.includes(c))
    .join('')
    .slice(0, 6)

  return `GC-${cleaned}`
}

/**
 * Format cents to currency display
 */
export function formatCouponAmount(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}
