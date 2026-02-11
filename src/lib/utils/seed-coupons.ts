import { SupabaseClient } from '@supabase/supabase-js'

const SAMPLE_COUPONS = [
  {
    amount_cents: 5000,
    remaining_cents: 5000,
    currency: 'EUR',
    theme: 'elegant' as const,
    purchaser_name: 'John Smith',
    purchaser_email: 'john@example.com',
    recipient_name: 'Sarah Smith',
    personal_message: 'Happy Birthday! Enjoy a night at Cheers!',
    status: 'active' as const,
    gdpr_consent: true,
    gdpr_consent_at: new Date().toISOString(),
    purchased_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    amount_cents: 10000,
    remaining_cents: 3000,
    currency: 'EUR',
    theme: 'tropical' as const,
    purchaser_name: 'Maria Garcia',
    purchaser_email: 'maria@example.com',
    recipient_name: 'Pedro Garcia',
    personal_message: 'Enjoy your holiday in Mallorca!',
    status: 'partially_used' as const,
    gdpr_consent: true,
    gdpr_consent_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    purchased_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    amount_cents: 2500,
    remaining_cents: 0,
    currency: 'EUR',
    theme: 'celebration' as const,
    purchaser_name: 'Jan de Vries',
    purchaser_email: 'jan@example.com',
    status: 'expired' as const,
    gdpr_consent: true,
    gdpr_consent_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
    purchased_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    amount_cents: 7500,
    remaining_cents: 7500,
    currency: 'EUR',
    theme: 'seasonal' as const,
    purchaser_name: 'Klaus Muller',
    purchaser_email: 'klaus@example.com',
    recipient_name: 'Anna Muller',
    personal_message: 'Frohe Weihnachten!',
    status: 'active' as const,
    gdpr_consent: true,
    gdpr_consent_at: new Date().toISOString(),
    purchased_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export async function seedCoupons(supabase: SupabaseClient) {
  // Check if coupons already exist
  const { count } = await supabase
    .from('gift_coupons')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) {
    return { message: `Skipped: ${count} coupons already exist`, inserted: 0 }
  }

  const { data, error } = await supabase
    .from('gift_coupons')
    .insert(SAMPLE_COUPONS)
    .select('id, code')

  if (error) {
    throw new Error(`Failed to seed coupons: ${error.message}`)
  }

  return { message: `Inserted ${data.length} sample coupons`, inserted: data.length, codes: data.map(c => c.code) }
}
