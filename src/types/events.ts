/**
 * Events & DJ Management — TypeScript Types
 * Module M8
 * Generated from database schema
 */

export type EventStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type EventType = 'dj_night' | 'sports' | 'themed' | 'private';

export type MusicRequestStatus = 'pending' | 'played' | 'skipped';

export interface DJ {
  id: string;
  name: string;
  genre: string | null;
  fee: number | null;
  email: string | null;
  phone: string | null;
  social_links: string | null; // JSON string: {"instagram": "@dj", "spotify": "..."}
  rider_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DJSocialLinks {
  instagram?: string;
  spotify?: string;
  soundcloud?: string;
  facebook?: string;
  website?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string | null;
  event_type: string | null; // EventType
  dj_id: string | null;
  status: EventStatus;

  // Sports-specific fields
  sport_name: string | null;
  home_team: string | null;
  away_team: string | null;
  broadcast_channel: string | null;
  match_info: string | null;

  created_at: string;
  updated_at: string;
}

export interface EventWithDJ extends Event {
  dj: DJ | null;
}

export interface EventEquipmentChecklist {
  id: string;
  event_id: string;
  equipment_name: string;
  is_checked: boolean;
  created_at: string;
}

export interface MusicRequest {
  id: string;
  event_id: string;
  guest_name: string | null;
  song_title: string;
  artist: string;
  status: MusicRequestStatus;
  created_at: string;
}

export interface EventMarketingDraft {
  id: string;
  event_id: string;
  social_caption: string | null;
  social_hashtags: string | null;
  suggested_platforms: string[] | null;
  newsletter_mention: string | null;
  generated_at: string;
  approved: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateEventRequest {
  title: string;
  description?: string;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time?: string;
  event_type: EventType;
  dj_id?: string;

  // Sports-specific
  sport_name?: string;
  home_team?: string;
  away_team?: string;
  broadcast_channel?: string;
  match_info?: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  event_type?: EventType;
  dj_id?: string;
  status?: EventStatus;

  // Sports-specific
  sport_name?: string;
  home_team?: string;
  away_team?: string;
  broadcast_channel?: string;
  match_info?: string;
}

export interface UpdateEventStatusRequest {
  status: EventStatus;
  reason?: string; // Required if cancelling
}

export interface CreateDJRequest {
  name: string;
  genre?: string;
  fee?: number;
  email?: string;
  phone?: string;
  social_links?: string; // JSON string
  rider_notes?: string;
}

export interface UpdateDJRequest {
  name?: string;
  genre?: string;
  fee?: number;
  email?: string;
  phone?: string;
  social_links?: string;
  rider_notes?: string;
}

export interface CreateMusicRequestRequest {
  event_id: string;
  guest_name?: string;
  song_title: string;
  artist: string;
}

export interface UpdateMusicRequestRequest {
  status: MusicRequestStatus;
}

export interface AddEquipmentRequest {
  equipment_name: string;
}

export interface UpdateEquipmentRequest {
  is_checked: boolean;
}

export interface ListEventsParams {
  event_type?: EventType;
  status?: EventStatus;
  start_date?: string; // YYYY-MM-DD
  end_date?: string;
  include_dj?: boolean;
}

export interface ListDJsParams {
  genre?: string;
  available_on?: string; // YYYY-MM-DD
}

export interface ListMusicRequestsParams {
  event_id: string;
  status?: MusicRequestStatus;
}

export interface DJWithStats extends DJ {
  upcoming_events: Event[];
  past_events_count: number;
  total_earnings: number;
}

export interface APIResponse<T> {
  data: T;
  count?: number;
  message?: string;
}

export interface APIError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
