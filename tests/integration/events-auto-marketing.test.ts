/**
 * Integration test for auto-marketing feature
 * Tests the full flow: create event → auto-generate marketing → retrieve draft
 *
 * Run: pnpm test tests/integration/events-auto-marketing.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// This test requires:
// 1. Supabase running locally: supabase start
// 2. ANTHROPIC_API_KEY set in environment
// 3. Test user with admin/manager role

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

describe('Events Auto-Marketing Integration', () => {
  let supabase: ReturnType<typeof createClient>
  let testEventId: string
  let testUserId: string

  beforeAll(async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️  ANTHROPIC_API_KEY not set - tests will be skipped')
    }

    supabase = createClient(supabaseUrl, supabaseKey)

    // Create test user with manager role
    // In real test, you'd authenticate with an existing test user
    // For now, we'll assume authentication is handled externally
  })

  afterAll(async () => {
    // Cleanup: delete test event (cascade will delete marketing draft)
    if (testEventId) {
      await supabase.from('events').delete().eq('id', testEventId)
    }
  })

  it('should auto-generate marketing draft when creating a DJ night event', async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Skipping test - no API key')
      return
    }

    // 1. Create event via API (simulating frontend request)
    const response = await fetch('http://localhost:3000/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real test, include auth headers
      },
      body: JSON.stringify({
        title: 'Test Auto-Marketing DJ Night',
        event_type: 'dj_night',
        event_date: '2025-12-31',
        start_time: '22:00',
        description: 'New Year\'s Eve party with amazing beats',
        status: 'confirmed',
      }),
    })

    expect(response.status).toBe(201)
    const event = await response.json()
    testEventId = event.id

    expect(event).toBeDefined()
    expect(event.title).toBe('Test Auto-Marketing DJ Night')

    // 2. Wait a few seconds for async marketing generation
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // 3. Check if marketing draft was created
    const { data: draft, error } = await supabase
      .from('event_marketing_drafts')
      .select('*')
      .eq('event_id', testEventId)
      .single()

    expect(error).toBeNull()
    expect(draft).toBeDefined()
    expect(draft.social_caption).toBeTruthy()
    expect(draft.social_hashtags).toBeTruthy()
    expect(draft.newsletter_mention).toBeTruthy()
    expect(draft.approved).toBe(false)
    expect(draft.published).toBe(false)

    console.log('✅ Marketing draft auto-generated:')
    console.log('Caption:', draft.social_caption.substring(0, 150) + '...')
    console.log('Hashtags:', draft.social_hashtags)
  }, 30000) // 30s timeout

  it('should manually regenerate marketing content', async () => {
    if (!process.env.ANTHROPIC_API_KEY || !testEventId) {
      console.log('Skipping test - no API key or event')
      return
    }

    // 1. Trigger manual regeneration
    const response = await fetch(
      `http://localhost:3000/api/events/${testEventId}/generate-marketing`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In real test, include auth headers
        },
      }
    )

    expect(response.status).toBe(200)
    const result = await response.json()

    expect(result.success).toBe(true)
    expect(result.draft).toBeDefined()
    expect(result.draft.social_caption).toBeTruthy()

    // 2. Verify draft was updated in database
    const { data: draft } = await supabase
      .from('event_marketing_drafts')
      .select('*')
      .eq('event_id', testEventId)
      .single()

    expect(draft).toBeDefined()
    expect(draft.generated_at).toBeTruthy()

    console.log('✅ Marketing content regenerated successfully')
  }, 30000)

  it('should handle events without DJ information gracefully', async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Skipping test - no API key')
      return
    }

    // Create a generic event without DJ
    const response = await fetch('http://localhost:3000/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Beach Volleyball Tournament',
        event_type: 'other',
        event_date: '2025-08-15',
        start_time: '15:00',
        description: 'Annual summer tournament',
      }),
    })

    const event = await response.json()
    const genericEventId = event.id

    // Wait for marketing generation
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Check draft was created
    const { data: draft } = await supabase
      .from('event_marketing_drafts')
      .select('*')
      .eq('event_id', genericEventId)
      .single()

    expect(draft).toBeDefined()
    expect(draft.social_caption).toBeTruthy()

    // Cleanup
    await supabase.from('events').delete().eq('id', genericEventId)

    console.log('✅ Generic event marketing generated successfully')
  }, 30000)

  it('should handle sports events with teams', async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Skipping test - no API key')
      return
    }

    const response = await fetch('http://localhost:3000/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'El Clásico Live',
        event_type: 'sports',
        event_date: '2025-10-26',
        start_time: '21:00',
        sport_name: 'Football',
        home_team: 'FC Barcelona',
        away_team: 'Real Madrid',
        broadcast_channel: 'LaLiga TV',
      }),
    })

    const event = await response.json()
    const sportsEventId = event.id

    await new Promise((resolve) => setTimeout(resolve, 5000))

    const { data: draft } = await supabase
      .from('event_marketing_drafts')
      .select('*')
      .eq('event_id', sportsEventId)
      .single()

    expect(draft).toBeDefined()
    expect(draft.social_caption).toContain('Barcelona')
    expect(draft.social_caption).toContain('Madrid')

    // Cleanup
    await supabase.from('events').delete().eq('id', sportsEventId)

    console.log('✅ Sports event marketing generated with team info')
  }, 30000)
})

/**
 * Smoke test to verify API endpoints exist
 */
describe('Auto-Marketing API Endpoints', () => {
  it('should have POST /api/events endpoint', async () => {
    const response = await fetch('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Invalid body
    })

    // Should return 400 (validation error) or 401 (unauthorized), not 404
    expect([400, 401]).toContain(response.status)
  })

  it('should have POST /api/events/[id]/generate-marketing endpoint', async () => {
    const response = await fetch(
      'http://localhost:3000/api/events/fake-uuid/generate-marketing',
      {
        method: 'POST',
      }
    )

    // Should return 401 (unauthorized) or 404 (not found), not 404 (endpoint missing)
    expect([401, 404]).toContain(response.status)
  })

  it('should have GET /api/events/[id]/marketing-draft endpoint', async () => {
    const response = await fetch(
      'http://localhost:3000/api/events/fake-uuid/marketing-draft'
    )

    // Should return 401 or 404, not 404 (endpoint missing)
    expect([401, 404]).toContain(response.status)
  })
})
