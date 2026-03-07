import { createAdminClient } from '@/lib/supabase/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// In-memory rate limiter: 5 attempts per 15 minutes per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function getRateLimitKey(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  entry.count++
  return { allowed: true, retryAfterSeconds: 0 }
}

/**
 * POST /api/auth/sign-in
 * Sign in with email and password
 */
export async function POST(request: NextRequest) {
  // Rate limit check
  const rateLimitKey = getRateLimitKey(request)
  const rateLimit = checkRateLimit(rateLimitKey)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = signInSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const { email, password } = validation.data

  // Collect cookies to set on the final response
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookiesToSet.push({ name, value, options })
        },
        remove(name: string, options: CookieOptions) {
          cookiesToSet.push({ name, value: '', options: { ...options, maxAge: 0 } })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 400 }
    )
  }

  // Fetch user profile using admin client (bypasses RLS)
  const adminClient = createAdminClient()
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (profileError) {
    return NextResponse.json(
      { error: 'Failed to fetch user profile', details: profileError.message },
      { status: 500 }
    )
  }

  // Build response with auth session cookies
  const response = NextResponse.json({
    user: data.user,
    session: data.session,
    profile,
  })

  // Apply all collected auth cookies to the response
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}
