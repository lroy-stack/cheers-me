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

const signUpSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  full_name: z.string().min(1).max(255),
  role: z.enum(['admin', 'manager', 'kitchen', 'bar', 'waiter', 'dj', 'owner']).default('waiter'),
  phone: z.string().max(20).optional(),
  language: z.enum(['en', 'nl', 'es', 'de']).default('en'),
})

// In-memory rate limiter: 3 accounts per hour per IP
const signUpRateLimitMap = new Map<string, { count: number; resetAt: number }>()
const SIGNUP_RATE_LIMIT_MAX = 3
const SIGNUP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkSignUpRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const entry = signUpRateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    signUpRateLimitMap.set(key, { count: 1, resetAt: now + SIGNUP_RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (entry.count >= SIGNUP_RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  entry.count++
  return { allowed: true, retryAfterSeconds: 0 }
}

/**
 * POST /api/auth/sign-up
 * Admin/owner only — create a new user account.
 * Self-registration is NOT supported; admins manage all credentials.
 * Password requirements: min 12 chars, uppercase, lowercase, number.
 * Rate limit: 3 accounts/hour per IP.
 */
export async function POST(request: NextRequest) {
  // Rate limit check (3 sign-ups per hour per IP)
  const ip = getClientIp(request)
  const rateLimit = checkSignUpRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      }
    )
  }

  // Only admin or owner can create accounts
  const roleResult = await requireRole(['admin', 'owner'])
  if ('error' in roleResult) {
    return NextResponse.json({ error: roleResult.error }, { status: roleResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = signUpSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const { email, password, full_name, role, phone, language } = validation.data

  // Use admin client to create user (bypasses email confirmation)
  const supabase = createAdminClient()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (authError) {
    return NextResponse.json(
      { error: 'Failed to create user account' },
      { status: 400 }
    )
  }

  if (!authData.user) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }

  // Create profile using admin client
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      full_name,
      role,
      phone: phone || null,
      language,
      active: true,
    })
    .select()
    .single()

  if (profileError) {
    // Rollback: delete the auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json(
      { error: 'Failed to create user profile' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      user: { id: authData.user.id, email: authData.user.email },
      profile,
      message: 'User account created successfully.',
    },
    { status: 201 }
  )
}
