import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  default_priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  default_assigned_role: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  estimated_minutes: z.number().int().min(0).nullable().optional(),
  items: z.array(z.object({
    text: z.string().min(1),
    sort_order: z.number().int().min(0),
  })).optional(),
})

/**
 * GET /api/staff/tasks/templates
 * List all task templates
 */
export async function GET() {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()

  const { data: templates, error } = await supabase
    .from('staff_task_templates')
    .select('*')
    .order('title', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(templates || [])
}

/**
 * POST /api/staff/tasks/templates
 * Create a new task template
 * Auth: admin/manager/owner
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

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
  const { data: userData } = authResult

  const { data: newTemplate, error } = await supabase
    .from('staff_task_templates')
    .insert({
      title: validation.data.title,
      description: validation.data.description ?? null,
      default_priority: validation.data.default_priority ?? 'medium',
      default_assigned_role: validation.data.default_assigned_role ?? null,
      frequency: validation.data.frequency ?? null,
      estimated_minutes: validation.data.estimated_minutes ?? null,
      items: validation.data.items ?? [],
      created_by: userData.user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newTemplate, { status: 201 })
}
