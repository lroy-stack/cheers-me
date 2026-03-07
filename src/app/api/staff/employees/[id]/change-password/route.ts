import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Password must be min 12 chars with uppercase, lowercase, and number
const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .refine((p) => /[A-Z]/.test(p), 'Password must contain at least one uppercase letter')
  .refine((p) => /[a-z]/.test(p), 'Password must contain at least one lowercase letter')
  .refine((p) => /[0-9]/.test(p), 'Password must contain at least one number')

const changePasswordSchema = z.object({
  new_password: passwordSchema,
})

/**
 * POST /api/staff/employees/[id]/change-password
 * Admin sets a new password for an employee.
 * Only admin/owner can call this endpoint.
 * Employees do NOT manage their own passwords — all credential management is admin-only.
 * Password requirements: min 12 chars, uppercase, lowercase, number.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only admin/owner can change employee passwords
  const authResult = await requireRole(['admin', 'owner'])

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

  const validation = changePasswordSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const { id } = await params
  const supabase = createAdminClient()

  // Look up the employee to get their profile_id (which maps to auth.users.id)
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('profile_id')
    .eq('id', id)
    .single()

  if (empError || !employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  // Update the password via admin API — no email/token flow needed
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    employee.profile_id,
    { password: validation.data.new_password }
  )

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
