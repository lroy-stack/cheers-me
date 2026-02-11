// Event types for the Events & DJ Management module

export type EventType = 'dj_night' | 'sports' | 'themed_night' | 'private_event' | 'other'
export type EventStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface DJ {
  id: string
  name: string
  genre: string
  fee: number
  email?: string | null
  phone?: string | null
  social_links?: Record<string, string> | null
  rider_notes?: string | null
}

export interface Event {
  id: string
  title: string
  description?: string | null
  event_date: string
  start_time: string
  end_time?: string | null
  event_type: EventType
  dj_id?: string | null
  status: EventStatus
  // Sports-specific fields
  sport_name?: string | null
  home_team?: string | null
  away_team?: string | null
  broadcast_channel?: string | null
  match_info?: string | null
  created_at: string
  updated_at: string
  // Relations
  dj?: DJ | null
}

export interface EventFormData {
  title: string
  description?: string
  event_date: Date
  start_time: string
  end_time?: string
  event_type: EventType
  dj_id?: string
  status?: EventStatus
  // Sports fields
  sport_name?: string
  home_team?: string
  away_team?: string
  broadcast_channel?: string
  match_info?: string
}

export interface EquipmentItem {
  id: string
  event_id: string
  equipment_name: string
  is_checked: boolean
  notes?: string | null
  checked_at?: string | null
  checked_by_user_id?: string | null
}

export interface MusicRequest {
  id: string
  event_id: string
  guest_name?: string | null
  song_title: string
  artist?: string | null
  status: 'pending' | 'played' | 'declined'
  requested_at: string
  updated_at: string
}
