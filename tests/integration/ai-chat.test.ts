import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// This test file demonstrates how to test the AI chat API
// Note: These are integration tests that require a valid Anthropic API key

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

describe('AI Chat API', () => {
  let authToken: string

  beforeAll(async () => {
    // Create a test user session
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Sign in with test user (you'll need to create a test user first)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123',
    })

    if (error || !data.session) {
      console.warn('⚠️  No test user available. Skipping AI chat tests.')
      return
    }

    authToken = data.session.access_token
  })

  it('should respond to a simple greeting', async () => {
    if (!authToken) {
      console.log('Skipping test - no auth token')
      return
    }

    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        message: 'Hello! What can you help me with?',
      }),
    })

    expect(response.ok).toBe(true)
    const data = await response.json()

    expect(data).toHaveProperty('response')
    expect(data).toHaveProperty('conversation_id')
    expect(typeof data.response).toBe('string')
    expect(data.response.length).toBeGreaterThan(0)
  })

  it('should handle tool use for sales query', async () => {
    if (!authToken) {
      console.log('Skipping test - no auth token')
      return
    }

    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        message: 'What were the sales yesterday?',
      }),
    })

    expect(response.ok).toBe(true)
    const data = await response.json()

    expect(data).toHaveProperty('tools_used')
    expect(Array.isArray(data.tools_used)).toBe(true)
    // The AI should use the query_sales tool
    expect(data.tools_used).toContain('query_sales')
  })

  it('should handle stock level queries', async () => {
    if (!authToken) {
      console.log('Skipping test - no auth token')
      return
    }

    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        message: 'Show me all items that are low on stock',
      }),
    })

    expect(response.ok).toBe(true)
    const data = await response.json()

    expect(data.tools_used).toContain('get_stock_levels')
    expect(data.response).toBeTruthy()
  })

  it('should return 401 for unauthenticated requests', async () => {
    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hello',
      }),
    })

    expect(response.status).toBe(401)
  })

  it('should return 400 for missing message', async () => {
    if (!authToken) {
      console.log('Skipping test - no auth token')
      return
    }

    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({}),
    })

    expect(response.status).toBe(400)
  })
})
