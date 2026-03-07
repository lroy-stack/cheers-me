/**
 * Currency Formatting Utilities
 *
 * Formats numbers as EUR currency for the GrandCafe Cheers platform
 */

/**
 * Format a number as EUR currency
 * @param amount - The amount to format
 * @param locale - The locale to use (default: 'es-ES' for Spanish/European format)
 * @returns Formatted currency string (e.g., "€1.234,56")
 */
export function formatCurrency(amount: number, locale: string = 'es-ES'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a number as EUR currency with no cents (rounded)
 * @param amount - The amount to format
 * @param locale - The locale to use (default: 'es-ES')
 * @returns Formatted currency string without cents (e.g., "€1.235")
 */
export function formatCurrencyRounded(amount: number, locale: string = 'es-ES'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a number as a compact currency value (K, M notation)
 * @param amount - The amount to format
 * @param locale - The locale to use (default: 'es-ES')
 * @returns Compact formatted currency string (e.g., "€1,2K")
 */
export function formatCurrencyCompact(amount: number, locale: string = 'es-ES'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount)
}

/**
 * Round a currency amount to 2 decimal places using banker's-safe arithmetic.
 * Use this for ALL financial calculations to prevent floating-point drift.
 * @param amount - The amount to round
 * @returns Amount rounded to 2 decimal places
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Calculate IVA (Spanish VAT) from a gross amount (IVA-inclusive).
 * @param grossAmount - Total price including IVA
 * @param ivaRate - IVA rate as a decimal (default 0.21 for 21%)
 * @returns { base, iva, total } all rounded to 2 decimal places
 */
export function splitIVA(grossAmount: number, ivaRate = 0.21): { base: number; iva: number; total: number } {
  const total = roundCurrency(grossAmount)
  const base = roundCurrency(total / (1 + ivaRate))
  const iva = roundCurrency(total - base)
  return { base, iva, total }
}

/**
 * Parse a currency string to a number
 * @param value - The currency string to parse (e.g., "€1.234,56" or "1234.56")
 * @returns The parsed number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and thousands separators
  const cleaned = value
    .replace(/[€$£¥]/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '') // Remove thousands separator (European format)
    .replace(/,/g, '.') // Replace decimal comma with dot

  return parseFloat(cleaned) || 0
}
