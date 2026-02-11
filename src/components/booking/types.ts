export type OccasionType = 'casual' | 'birthday' | 'group' | 'cocktails' | 'sports' | 'party'
export type BookingStep = 'occasion' | 'datetime' | 'party-size' | 'guest-info' | 'review'
export const STEPS: BookingStep[] = ['occasion', 'datetime', 'party-size', 'guest-info', 'review']

export interface BookingFormData {
  occasion: OccasionType | null
  reservation_date: string    // YYYY-MM-DD
  start_time: string          // HH:MM
  party_size: number
  guest_name: string
  guest_email: string
  guest_phone: string
  special_requests: string
  language: 'en' | 'nl' | 'es' | 'de'
}

export interface AvailabilityResult {
  available: boolean
  available_tables?: number
  reason?: string
  suggested_times?: string[]
}

export interface BookingResult {
  success: boolean
  message: string
  reservation?: {
    id: string
    guest_name: string
    party_size: number
    date: string
    time: string
    status: string
    table_number?: number
    section?: string
  }
}

export type WizardAction =
  | { type: 'SET_STEP'; step: BookingStep }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; index: number }
  | { type: 'UPDATE_FORM'; data: Partial<BookingFormData> }
  | { type: 'SET_AVAILABILITY'; result: AvailabilityResult | null }
  | { type: 'SET_BOOKING_RESULT'; result: BookingResult | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'RESET' }

export interface WizardState {
  currentStep: BookingStep
  stepIndex: number
  direction: number // 1 = forward, -1 = backward
  formData: BookingFormData
  availability: AvailabilityResult | null
  bookingResult: BookingResult | null
  isLoading: boolean
}

export const OCCASION_CONFIG: Record<OccasionType, { icon: string; label: string; description: string }> = {
  casual:    { icon: 'UtensilsCrossed', label: 'Casual Dining',  description: 'Great food, drinks & good vibes' },
  birthday:  { icon: 'PartyPopper',     label: 'Birthday',       description: 'Make it special!' },
  group:     { icon: 'Users',           label: 'Group Outing',   description: '6+ friends ready to party' },
  cocktails: { icon: 'Wine',            label: 'Cocktail Night', description: '50+ cocktails to explore' },
  sports:    { icon: 'Tv',              label: 'Sports Night',   description: '15 screens, cold beers' },
  party:     { icon: 'Music',           label: 'DJ Night',       description: 'DJ Winston from 22:00' },
}
