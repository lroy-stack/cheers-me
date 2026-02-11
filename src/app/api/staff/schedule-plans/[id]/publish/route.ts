import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/staff/schedule-plans/[id]/publish
 * Validate and publish a schedule plan
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id: planId } = await params
  const supabase = await createClient()

  // Get plan
  const { data: plan } = await supabase
    .from('schedule_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  if (plan.status === 'published') {
    return NextResponse.json({ error: 'Plan is already published' }, { status: 400 })
  }

  // Update plan status
  const { data: updatedPlan, error } = await supabase
    .from('schedule_plans')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: authResult.data.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Record history
  await supabase.from('schedule_plan_history').insert({
    schedule_plan_id: planId,
    action: 'published',
    changed_by: authResult.data.user.id,
    changes: { status: 'published' },
  })

  return NextResponse.json({ plan: updatedPlan })
}
