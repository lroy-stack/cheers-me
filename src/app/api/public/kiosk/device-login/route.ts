import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const DEVICE_SESSION_SECRET =
  process.env.KIOSK_DEVICE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-kiosk-secret'
const DEVICE_SESSION_EXPIRY_HOURS = 24

/**
 * POST /api/public/kiosk/device-login
 * Authenticate the kiosk device with the dedicated kiosk user.
 * Returns a JWT device session token (24h expiry).
 * Only users with role 'kiosk' can authenticate here.
 */
export async function POST(request: NextRequest) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  const { email, password } = validation.data
  const supabase = createAdminClient()

  // Verify credentials via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }

  // Verify the user has kiosk role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single()

  if (!profile || profile.role !== 'kiosk') {
    return NextResponse.json(
      { error: 'This account is not authorized for kiosk access' },
      { status: 403 }
    )
  }

  // Generate device session JWT
  const deviceToken = jwt.sign(
    {
      type: 'kiosk_device',
      email,
      userId: authData.user.id,
    },
    DEVICE_SESSION_SECRET,
    { expiresIn: `${DEVICE_SESSION_EXPIRY_HOURS}h` }
  )

  // Set as httpOnly cookie + return in body
  const response = NextResponse.json({
    success: true,
    device_name: 'Kiosk Device',
    expires_in_hours: DEVICE_SESSION_EXPIRY_HOURS,
  })

  response.cookies.set('kiosk_device_session', deviceToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/kiosk',
    maxAge: DEVICE_SESSION_EXPIRY_HOURS * 60 * 60,
  })

  return response
}
