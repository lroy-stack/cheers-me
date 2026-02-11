/**
 * Spanish Tax Utilities
 * IVA rates, NIF/CIF validation, and tax formatting
 */

import type { IVACategory } from '@/types/expenses'

/**
 * IVA rates by expense category (Spanish tax law)
 */
export const IVA_RATES: Record<IVACategory, number> = {
  alimentos: 10,
  bebidas_no_alcoholicas: 10,
  bebidas_alcoholicas: 21,
  servicios: 21,
  alquiler: 21,
  seguros: 0,
  marketing: 21,
  reparaciones: 21,
  personal_eventual: 0,
  suministros: 21,
}

/**
 * Map expense category strings to IVA categories
 */
export const CATEGORY_TO_IVA: Record<string, IVACategory> = {
  food: 'alimentos',
  'food & beverages': 'alimentos',
  ingredients: 'alimentos',
  beverages: 'bebidas_alcoholicas',
  alcohol: 'bebidas_alcoholicas',
  'non-alcoholic': 'bebidas_no_alcoholicas',
  'soft drinks': 'bebidas_no_alcoholicas',
  utilities: 'servicios',
  electricity: 'servicios',
  water: 'servicios',
  gas: 'servicios',
  phone: 'servicios',
  internet: 'servicios',
  rent: 'alquiler',
  insurance: 'seguros',
  marketing: 'marketing',
  advertising: 'marketing',
  repairs: 'reparaciones',
  maintenance: 'reparaciones',
  'temp staff': 'personal_eventual',
  supplies: 'suministros',
  cleaning: 'suministros',
  equipment: 'suministros',
  licenses: 'servicios',
  other: 'servicios',
}

/**
 * Get IVA rate for a given expense category
 */
export function getIVARateForCategory(category: string): number {
  const ivaCategory = CATEGORY_TO_IVA[category.toLowerCase()]
  if (ivaCategory) {
    return IVA_RATES[ivaCategory]
  }
  return 21 // Default to general rate
}

/**
 * Calculate IVA amounts from a total (IVA included)
 */
export function calculateIVAFromTotal(total: number, rate: number): {
  base_imponible: number
  iva_amount: number
} {
  const base_imponible = Math.round((total / (1 + rate / 100)) * 100) / 100
  const iva_amount = Math.round((total - base_imponible) * 100) / 100
  return { base_imponible, iva_amount }
}

/**
 * Calculate IVA amounts from a base amount (IVA not included)
 */
export function calculateIVAFromBase(base: number, rate: number): {
  iva_amount: number
  total: number
} {
  const iva_amount = Math.round((base * rate / 100) * 100) / 100
  const total = Math.round((base + iva_amount) * 100) / 100
  return { iva_amount, total }
}

/**
 * Validate Spanish NIF/CIF
 * NIF: 8 digits + letter (DNI) or letter + 7 digits + letter (NIE)
 * CIF: letter + 8 digits (company)
 */
export function validateNIF(nif: string): boolean {
  if (!nif) return false
  const cleaned = nif.replace(/[-\s]/g, '').toUpperCase()

  // DNI: 8 digits + letter
  if (/^\d{8}[A-Z]$/.test(cleaned)) {
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
    const num = parseInt(cleaned.substring(0, 8), 10)
    return cleaned[8] === letters[num % 23]
  }

  // NIE: X/Y/Z + 7 digits + letter
  if (/^[XYZ]\d{7}[A-Z]$/.test(cleaned)) {
    const prefix = cleaned[0] === 'X' ? '0' : cleaned[0] === 'Y' ? '1' : '2'
    const num = parseInt(prefix + cleaned.substring(1, 8), 10)
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
    return cleaned[8] === letters[num % 23]
  }

  // CIF: letter + 8 chars
  if (/^[ABCDEFGHJKLMNPQRSUVW]\d{7}[\dA-J]$/.test(cleaned)) {
    return true // Simplified CIF validation
  }

  return false
}

/**
 * Format IVA rate for display
 */
export function formatIVARate(rate: number): string {
  if (rate === 0) return 'Exento'
  return `${rate}%`
}

/**
 * Format currency in Spanish locale
 */
export function formatEUR(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

/**
 * Get quarter label from a date
 */
export function getQuarterLabel(date: Date): string {
  const month = date.getMonth()
  const year = date.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  return `${quarter}T ${year}`
}

/**
 * Get quarter date range
 */
export function getQuarterDateRange(year: number, quarter: number): {
  start: string
  end: string
} {
  const startMonth = (quarter - 1) * 3
  const endMonth = startMonth + 2
  const start = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, endMonth + 1, 0).getDate()
  const end = `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

/**
 * Expense categories for the UI dropdown
 */
export const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food & Ingredients', ivaRate: 10 },
  { value: 'beverages', label: 'Beverages (Alcoholic)', ivaRate: 21 },
  { value: 'non-alcoholic', label: 'Beverages (Non-Alcoholic)', ivaRate: 10 },
  { value: 'rent', label: 'Rent', ivaRate: 21 },
  { value: 'utilities', label: 'Utilities (Water, Electricity, Gas)', ivaRate: 21 },
  { value: 'phone', label: 'Phone & Internet', ivaRate: 21 },
  { value: 'insurance', label: 'Insurance', ivaRate: 0 },
  { value: 'marketing', label: 'Marketing & Advertising', ivaRate: 21 },
  { value: 'repairs', label: 'Repairs & Maintenance', ivaRate: 21 },
  { value: 'supplies', label: 'Supplies & Equipment', ivaRate: 21 },
  { value: 'cleaning', label: 'Cleaning', ivaRate: 21 },
  { value: 'licenses', label: 'Licenses & Permits', ivaRate: 21 },
  { value: 'temp staff', label: 'Temporary Staff', ivaRate: 0 },
  { value: 'other', label: 'Other', ivaRate: 21 },
] as const

/**
 * Modelo 347 threshold (annual operations with single supplier)
 */
export const MODELO_347_THRESHOLD = 3005.06
