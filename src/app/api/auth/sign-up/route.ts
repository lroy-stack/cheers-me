import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1).max(255),
  role: z.enum(['admin', 'manager', 'kitchen', 'bar', 'waiter', 'dj', 'owner']).default('waiter'),
  phone: z.string().max(20).optional(),
  language: z.enum(['en', 'nl', 'es']).default('en'),
})

/**
 * POST /api/auth/sign-up
 * Register a new user with email and password
 * Note: In production, this should be restricted to admins only
 */
export async function POST(request: NextRequest) {
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
  const supabase = await createClient()

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
      },
    },
  })

  if (authError) {
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 400 }
    )
  }

  if (!authData.user) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }

  // Create profile
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
    // If profile creation fails, we should ideally rollback the auth user
    // For now, just return the error
    return NextResponse.json(
      { error: 'Failed to create profile: ' + profileError.message },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      user: authData.user,
      session: authData.session,
      profile,
      message: 'User registered successfully. Please check your email for verification.',
    },
    { status: 201 }
  )
}
