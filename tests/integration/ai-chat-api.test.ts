import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/ai/chat/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as claudeModule from '@/lib/ai/claude'

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/ai/claude', () => ({
  chat: vi.fn(),
  Anthropic: {
    TextBlock: class {},
    ToolUseBlock: class {},
  },
}))

describe('AI Chat API Route', () => {
  let mockSupabase: any
  let mockRequest: Partial<NextRequest>

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase)

    mockRequest = {
      json: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      mockRequest.json = vi.fn().mockResolvedValue({
        message: 'What were yesterday sales?',
      })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json).toHaveProperty('error')
      expect(json.error).toBe('Unauthorized')
    })

    it('returns 401 when auth error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Auth failed'),
      })

      mockRequest.json = vi.fn().mockResolvedValue({
        message: 'What were yesterday sales?',
      })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(401)
    })
  })

  describe('Request Validation', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'manager@cheers.com' } },
        error: null,
      })
    })

    it('returns 400 when message is missing', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        conversation_id: 'conv-1',
      })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('Message is required')
    })

    it('returns 400 when message is not a string', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        message: 123,
      })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('Message is required')
    })

    it('returns 400 when message is empty', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        message: '',
      })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('Message is required')
    })
  })

  describe('Chat Response', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'manager@cheers.com' } },
        error: null,
      })
    })

    it('returns a successful response with text content', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        message: 'What were yesterday sales?',
        conversation_id: 'conv-1',
      })

      // Mock Claude response without tool use
      vi.mocked(claudeModule.chat).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Yesterday sales were €2,500 with 80 covers.',
          },
        ],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 150,
          output_tokens: 30,
        },
      } as any)

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json).toHaveProperty('response')
      expect(json).toHaveProperty('conversation_id')
      expect(json).toHaveProperty('tools_used')
      expect(json).toHaveProperty('stop_reason')
      expect(json.response).toContain('sales were')
    })

    it('handles conversation_id parameter', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        message: 'Continue with more details',
        conversation_id: 'existing-conv-123',
      })

      vi.mocked(claudeModule.chat).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Additional details about sales...',
          },
        ],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 100,
          output_tokens: 40,
        },
      } as any)

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(json.conversation_id).toBe('existing-conv-123')
    })

    it('generates new conversation_id when not provided', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        message: 'Hello AI',
      })

      vi.mocked(claudeModule.chat).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Hello! How can I help?',
          },
        ],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 50,
          output_tokens: 20,
        },
      } as any)

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(json.conversation_id).toBeDefined()
      expect(json.conversation_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      )
    })
  })

  describe('Tool Use Handling', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'manager@cheers.com' } },
        error: null,
      })
    })

    it('returns information about tools used', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        message: 'What are the low stock items?',
      })

      // Mock Claude response without tool use
      vi.mocked(claudeModule.chat).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Here are the low stock items...',
          },
        ],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 200,
          output_tokens: 100,
        },
      } as any)

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(json).toHaveProperty('tools_used')
      expect(Array.isArray(json.tools_used)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'manager@cheers.com' } },
        error: null,
      })
    })

    it('handles JSON parsing error', async () => {
      mockRequest.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'))

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json).toHaveProperty('error')
    })

    it('handles Claude API error', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        message: 'What were sales?',
      })

      vi.mocked(claudeModule.chat).mockRejectedValue(
        new Error('Claude API error')
      )

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json).toHaveProperty('error')
      expect(json.error).toContain('Claude API error')
    })

    it('handles unexpected errors gracefully', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        message: 'Test message',
      })

      vi.mocked(claudeModule.chat).mockRejectedValue(
        new Error('Unexpected error')
      )

      const response = await POST(mockRequest as NextRequest)

      expect(response.status).toBe(500)
      expect(await response.json()).toHaveProperty('error')
    })
  })

  describe('Response Structure', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'manager@cheers.com' } },
        error: null,
      })
    })

    it('always returns required fields in response', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        message: 'Test query',
      })

      vi.mocked(claudeModule.chat).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Test response',
          },
        ],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      } as any)

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      // Check all required fields are present
      expect(json).toHaveProperty('response')
      expect(json).toHaveProperty('conversation_id')
      expect(json).toHaveProperty('tools_used')
      expect(json).toHaveProperty('stop_reason')

      // Verify field types
      expect(typeof json.response).toBe('string')
      expect(typeof json.conversation_id).toBe('string')
      expect(Array.isArray(json.tools_used)).toBe(true)
      expect(typeof json.stop_reason).toBe('string')
    })
  })
})
