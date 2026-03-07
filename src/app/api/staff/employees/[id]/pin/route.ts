import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const WEAK_PINS = [
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1234', '4321', '1010', '2580', '0852',
]

const BCRYPT_ROUNDS = 10

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/).optional(),
})

/**
 * Check if a PIN is already in use by comparing bcrypt hashes
 * Returns the employee ID if found, null otherwise
 */
async function isPinInUse(
  supabase: ReturnType<typeof createAdminClient>,
  pin: string,
  excludeEmployeeId?: string
): Promise<boolean> {
  const query = supabase
    .from('employees')
    .select('id, kiosk_pin')
    .eq('employment_status', 'active')
    .not('kiosk_pin', 'is', null)

  if (excludeEmployeeId) {
    query.neq('id', excludeEmployeeId)
  }

  const { data: employees } = await query

  if (!employees?.length) return false

  for (const emp of employees) {
    if (emp.kiosk_pin && (await bcrypt.compare(pin, emp.kiosk_pin))) {
      return true
    }
  }
  return false
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const validation = pinSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid PIN format', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Verify employee exists
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, employment_status')
    .eq('id', id)
    .single()

  if (empError || !employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  let pin = validation.data?.pin

  const MAX_ATTEMPTS = 10

  if (pin) {
    // Custom PIN — validate
    if (WEAK_PINS.includes(pin)) {
      return NextResponse.json({ error: 'PIN too weak' }, { status: 400 })
    }

    // Check uniqueness via bcrypt compare
    const inUse = await isPinInUse(supabase, pin, id)
    if (inUse) {
      return NextResponse.json({ error: 'PIN already in use' }, { status: 409 })
    }
  } else {
    // Generate random PIN
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidate = crypto.randomInt(0, 10000).toString().padStart(4, '0')

      if (WEAK_PINS.includes(candidate)) continue

      const inUse = await isPinInUse(supabase, candidate, id)
      if (!inUse) {
        pin = candidate
        break
      }
    }

    if (!pin) {
      return NextResponse.json(
        { error: 'Could not generate unique PIN. Try a custom PIN.' },
        { status: 500 }
      )
    }
  }

  // Hash the PIN before storing
  const hashedPin = await bcrypt.hash(pin, BCRYPT_ROUNDS)

  // Update employee PIN
  const { error: updateError } = await supabase
    .from('employees')
    .update({
      kiosk_pin: hashedPin,
      kiosk_pin_failed_attempts: 0,
      kiosk_pin_locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update PIN' }, { status: 500 })
  }

  // Return the plaintext PIN once (for admin to share with employee)
  return NextResponse.json({ pin })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('employees')
    .update({
      kiosk_pin: null,
      kiosk_pin_failed_attempts: 0,
      kiosk_pin_locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to remove PIN' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
