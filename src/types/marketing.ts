export interface ContentCalendarEntry {
  id: string
  title: string
  description?: string | null
  content_text?: string | null
  image_url?: string | null
  platform?: 'instagram' | 'facebook' | 'multi' | null
  scheduled_date?: string | null
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  language?: 'nl' | 'en' | 'es' | null
  created_by?: string | null
  created_at: string
  updated_at: string
  created_by_employee?: {
    id: string
    profile: {
      id: string
      full_name: string
    } | null
  } | null
}

export interface SocialPost {
  id: string
  content_calendar_id?: string | null
  platform: 'instagram' | 'facebook'
  platform_post_id?: string | null
  content_text?: string | null
  image_url?: string | null
  published_at?: string | null
  status: 'pending' | 'published' | 'failed'
  likes?: number | null
  comments?: number | null
  shares?: number | null
  reach?: number | null
  engagement_rate?: number | null
  error_message?: string | null
  created_at: string
  updated_at: string
  content_calendar?: {
    id: string
    title: string
    scheduled_date: string | null
  } | null
}

export interface PublishPostRequest {
  content_calendar_id: string
  platform: 'instagram' | 'facebook' | 'multi'
  caption: string
  hashtags?: string[]
  image_url?: string
}

export interface PublishPostResult {
  platform: string
  success: boolean
  postId?: string
  error?: string
}

export interface PublishPostResponse {
  success: boolean
  results: PublishPostResult[]
  message: string
}

export interface SyncAnalyticsRequest {
  post_id?: string
  sync_all?: boolean
  limit?: number
}

export interface SyncAnalyticsResult {
  post_id: string
  platform: string
  success: boolean
  error?: string
}

export interface SyncAnalyticsResponse {
  success: boolean
  synced: number
  total: number
  results: SyncAnalyticsResult[]
  message: string
}

export interface ContentFilters {
  status?: 'draft' | 'scheduled' | 'published' | 'failed'
  platform?: 'instagram' | 'facebook' | 'multi'
  language?: 'nl' | 'en' | 'es'
  from?: string
  to?: string
}
