import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for sending response
const sendResponseSchema = z.object({
  response_text: z.string().min(1, 'Response text is required'),
})

/**
 * POST /api/crm/reviews/[id]/send-response
 * Mark a review response as sent
 * - Stores the final response text in response_sent field
 * - This should be called AFTER the manager manually posts the response to the review platform
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = sendResponseSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Call database function to mark response as sent
  const { error: sendError } = await supabase
    .rpc('send_review_response', {
      p_review_id: id,
      p_response_text: validation.data.response_text,
    })

  if (sendError) {
    return NextResponse.json(
      { error: `Failed to mark response as sent: ${sendError.message}` },
      { status: 500 }
    )
  }

  // Fetch updated review
  const { data: updatedReview, error: fetchError } = await supabase
    .from('customer_reviews')
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        vip
      )
    `)
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json(
      { error: `Failed to fetch updated review: ${fetchError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    review: updatedReview,
    message: 'Review response marked as sent',
  })
}
