/**
 * Types for expense tracking and Spanish tax compliance
 */

export interface ExpenseEntry {
  id: string
  date: string
  category: string
  description: string
  amount: number
  is_recurring: boolean
  recurrence_frequency?: string
  vendor?: string
  invoice_number?: string
  payment_due_date?: string
  payment_date?: string
  payment_method?: 'cash' | 'card' | 'transfer' | 'other'
  notes?: string
  created_by?: string
  created_at?: string
  updated_at?: string
  // Spanish fiscal fields
  factura_number?: string
  supplier_nif?: string
  iva_rate: number
  iva_amount?: number
  base_imponible?: number
  receipt_url?: string
  is_deductible: boolean
  expense_subcategory?: string
}

export interface IVABreakdown {
  id: string
  date: string
  category: string
  base_imponible: number
  iva_rate: number
  iva_amount: number
  total: number
  created_at?: string
}

export interface TaxDeclaration {
  id: string
  modelo: '303' | '111' | '347'
  period_label: string
  period_start: string
  period_end: string
  iva_repercutido?: number
  iva_soportado?: number
  iva_resultado?: number
  irpf_retenido?: number
  total_operaciones?: number
  status: 'draft' | 'submitted' | 'filed'
  submitted_at?: string
  notes?: string
  generated_by?: string
  created_at?: string
}

export interface DigitalSignature {
  id: string
  user_id: string
  document_type: string
  document_id: string
  signature_url: string
  signed_at: string
  ip_address?: string
}

export interface CompanyFiscalData {
  razon_social: string
  cif: string
  direccion: string
  codigo_postal: string
  ciudad: string
  provincia: string
  pais: string
  telefono: string
  email: string
}

export type IVACategory =
  | 'alimentos'
  | 'bebidas_no_alcoholicas'
  | 'bebidas_alcoholicas'
  | 'servicios'
  | 'alquiler'
  | 'seguros'
  | 'marketing'
  | 'reparaciones'
  | 'personal_eventual'
  | 'suministros'

export interface ExpenseSummary {
  total_amount: number
  total_iva: number
  total_base: number
  deductible_total: number
  by_category: Record<string, { count: number; total: number; iva: number }>
}

export interface Modelo303Data {
  quarter: string
  period_start: string
  period_end: string
  iva_repercutido: number
  iva_repercutido_by_rate: { rate: number; base: number; iva: number }[]
  iva_soportado: number
  iva_soportado_by_category: { category: string; base: number; iva: number }[]
  resultado: number
}

export interface Modelo111Data {
  quarter: string
  period_start: string
  period_end: string
  employees: { name: string; gross_salary: number; irpf_rate: number; irpf_amount: number }[]
  total_irpf: number
}

export interface Modelo347Data {
  year: number
  suppliers: { nif: string; name: string; total: number }[]
  threshold: number
}
