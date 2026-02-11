import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const assignmentSchema = z.object({
  section_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  shift_id: z.string().uuid().optional(),
  shift_type: z.enum(['morning', 'afternoon', 'night']).optional(),
  notes: z.string().optional(),
})

const syncSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift_type: z.enum(['morning', 'afternoon', 'night']),
  assignments: z.array(assignmentSchema),
})

/**
 * POST /api/staff/zones/assignments/sync
 * Bulk sync zone assignments for a specific date + shift
 * Replaces all assignments for that date+shift with the new set
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = syncSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { date, shift_type, assignments } = validation.data

  // Delete existing assignments for this date + shift
  const { error: deleteError } = await supabase
    .from('zone_assignments')
    .delete()
    .eq('assignment_date', date)
    .eq('shift_type', shift_type)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Insert new assignments
  if (assignments.length > 0) {
    const toInsert = assignments.map(a => ({
      ...a,
      assignment_date: date,
      shift_type,
      assigned_by: authResult.data.user.id,
    }))

    const { error: insertError } = await supabase
      .from('zone_assignments')
      .insert(toInsert)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  // Fetch updated
  const { data } = await supabase
    .from('zone_assignments')
    .select(`
      *,
      section:floor_sections(id, name, description, is_active),
      employee:employees(
        id,
        profile:profiles(id, full_name, role, avatar_url)
      )
    `)
    .eq('assignment_date', date)
    .eq('shift_type', shift_type)

  return NextResponse.json({ assignments: data || [] })
}
