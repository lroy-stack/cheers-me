import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireKioskSession, validateEmployeeMatch } from '@/lib/kiosk/auth-middleware'

const schema = z.object({
  employee_id: z.string().uuid(),
  clock_record_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
  anomaly_type: z.string().max(50).optional(),
  anomaly_reason: z.string().max(100).optional(),
  anomaly_comment: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  // Verify session token
  const authResult = await requireKioskSession(request)
  if (!authResult.success) {
    return authResult.response
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const {
    employee_id,
    clock_record_id,
    rating,
    feedback,
    anomaly_type,
    anomaly_reason,
    anomaly_comment,
  } = validation.data

  // Verify employee_id matches session token
  const mismatchError = await validateEmployeeMatch(authResult.employeeId, employee_id, request)
  if (mismatchError) {
    return mismatchError
  }

  const supabase = createAdminClient()

  // Verify clock record belongs to employee and has clock_out_time
  const { data: clockRecord, error: clockError } = await supabase
    .from('clock_in_out')
    .select('id, employee_id, clock_in_time, clock_out_time, shift_id')
    .eq('id', clock_record_id)
    .eq('employee_id', employee_id)
    .single()

  if (clockError || !clockRecord) {
    return NextResponse.json(
      { error: 'Clock record not found' },
      { status: 404 }
    )
  }

  if (!clockRecord.clock_out_time) {
    return NextResponse.json(
      { error: 'Clock record must be closed before submitting survey' },
      { status: 400 }
    )
  }

  // Check for duplicate survey
  const { data: existingSurvey } = await supabase
    .from('shift_survey_responses')
    .select('id')
    .eq('clock_record_id', clock_record_id)
    .single()

  if (existingSurvey) {
    return NextResponse.json(
      { error: 'Survey already submitted for this shift' },
      { status: 409 }
    )
  }

  // Calculate variance from clock_in_out data
  const clockInTime = new Date(clockRecord.clock_in_time).getTime()
  const clockOutTime = new Date(clockRecord.clock_out_time).getTime()
  const workedMinutes = Math.round((clockOutTime - clockInTime) / 60000)

  // Fetch scheduled shift if linked
  let scheduledMinutes: number | null = null
  let shiftType: string | null = null
  if (clockRecord.shift_id) {
    const { data: shift } = await supabase
      .from('shifts')
      .select('start_time, end_time, shift_type')
      .eq('id', clockRecord.shift_id)
      .single()

    if (shift) {
      shiftType = shift.shift_type
      const startParts = shift.start_time.split(':')
      const endParts = shift.end_time.split(':')
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1])
      let endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1])
      if (endMinutes < startMinutes) endMinutes += 24 * 60 // Handle overnight shifts
      scheduledMinutes = endMinutes - startMinutes
    }
  }

  const varianceMinutes = scheduledMinutes ? workedMinutes - scheduledMinutes : null

  // Calculate break variance
  const { data: breaks } = await supabase
    .from('clock_breaks')
    .select('start_time, end_time')
    .eq('clock_record_id', clock_record_id)

  let breakMinutes = 0
  if (breaks) {
    for (const b of breaks) {
      if (b.end_time) {
        const start = new Date(b.start_time).getTime()
        const end = new Date(b.end_time).getTime()
        breakMinutes += (end - start) / 60000
      }
    }
  }

  const breakVarianceMinutes = Math.round(breakMinutes)

  // Insert survey response
  const { data: survey, error: surveyError } = await supabase
    .from('shift_survey_responses')
    .insert({
      clock_record_id,
      employee_id,
      rating,
      feedback,
      shift_type: shiftType,
      worked_minutes: workedMinutes,
      scheduled_minutes: scheduledMinutes,
      variance_minutes: varianceMinutes,
      break_variance_minutes: breakVarianceMinutes,
      anomaly_type,
      anomaly_reason,
      anomaly_comment,
    })
    .select('id')
    .single()

  if (surveyError || !survey) {
    console.error('Error inserting survey:', surveyError)
    return NextResponse.json(
      { error: 'Failed to save survey' },
      { status: 500 }
    )
  }

  // Trigger AI analysis if low rating or anomaly
  const shouldAnalyze = rating <= 2 || anomaly_type
  if (shouldAnalyze) {
    try {
      // Call AI analysis endpoint (fire and forget, don't wait)
      fetch(`${request.nextUrl.origin}/api/ai/analyze-shift-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_id: survey.id,
          rating,
          feedback,
          anomaly_type,
          anomaly_reason,
          anomaly_comment,
          worked_minutes: workedMinutes,
          variance_minutes: varianceMinutes,
          break_variance_minutes: breakVarianceMinutes,
        }),
      }).catch((e) => console.error('Failed to trigger AI analysis:', e))
    } catch (e) {
      console.error('Failed to trigger AI analysis:', e)
    }

    // Create notification for managers
    const { data: managers } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'manager', 'owner'])

    if (managers) {
      const notificationType = rating <= 2 ? 'shift_feedback_flagged' : 'shift_feedback_received'
      const title = rating <= 2 ? 'Low Shift Rating' : 'Shift Feedback with Anomaly'
      const body = rating <= 2
        ? `An employee reported a ${rating}/5 shift rating. Review needed.`
        : `An employee reported a shift anomaly: ${anomaly_type}. Review feedback.`

      for (const manager of managers) {
        await supabase.rpc('create_notification', {
          p_user_id: manager.id,
          p_type: notificationType,
          p_title: title,
          p_body: body,
          p_data: { survey_id: survey.id, rating },
          p_action_url: '/staff/feedback',
        })
      }
    }
  }

  return NextResponse.json({ success: true })
}
