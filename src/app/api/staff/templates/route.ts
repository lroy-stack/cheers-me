import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating shift template
const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  shift_type: z.enum(['morning', 'afternoon', 'night']),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  break_duration_minutes: z.number().min(0).default(0),
})

/**
 * GET /api/staff/templates
 * List all shift templates (managers/admins only)
 */
export async function GET(_request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()

  const { data: templates, error } = await supabase
    .from('shift_templates')
    .select('*')
    .order('shift_type', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(templates)
}

/**
 * POST /api/staff/templates
 * Create a new shift template (managers/admins only)
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = createTemplateSchema.safeParse(body)
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

  // Create template
  const { data: newTemplate, error } = await supabase
    .from('shift_templates')
    .insert({
      name: validation.data.name,
      shift_type: validation.data.shift_type,
      start_time: validation.data.start_time,
      end_time: validation.data.end_time,
      break_duration_minutes: validation.data.break_duration_minutes,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newTemplate, { status: 201 })
}
