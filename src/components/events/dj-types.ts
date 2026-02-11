// DJ-specific types for DJ database management

import { DJ } from './types'

export type { DJ }

export interface DJFormData {
  name: string
  genre: string
  fee: number
  email?: string
  phone?: string
  social_links?: Record<string, string>
  rider_notes?: string
}

export interface DJWithStats extends DJ {
  total_events?: number
  upcoming_events?: number
  completed_events?: number
  total_earnings?: number
  last_event_date?: string | null
}

export interface DJKPIData {
  totalDJs: number
  activeDJs: number
  totalFees: number
  avgFeePerDJ: number
}
