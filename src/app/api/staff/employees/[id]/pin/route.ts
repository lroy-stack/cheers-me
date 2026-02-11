import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'

const WEAK_PINS = [
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1234', '4321', '1010', '2580', '0852',
]

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/).optional(),
})

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

    // Check uniqueness
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('kiosk_pin', pin)
      .eq('employment_status', 'active')
      .neq('id', id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'PIN already in use' }, { status: 409 })
    }
  } else {
    // Generate random PIN
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidate = crypto.randomInt(0, 10000).toString().padStart(4, '0')

      if (WEAK_PINS.includes(candidate)) continue

      const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .eq('kiosk_pin', candidate)
        .eq('employment_status', 'active')
        .neq('id', id)
        .single()

      if (!existing) {
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

  // Update employee PIN
  const { error: updateError } = await supabase
    .from('employees')
    .update({
      kiosk_pin: pin,
      kiosk_pin_failed_attempts: 0,
      kiosk_pin_locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
