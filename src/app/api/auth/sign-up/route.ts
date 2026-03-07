import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1).max(255),
  role: z.enum(['admin', 'manager', 'kitchen', 'bar', 'waiter', 'dj', 'owner']).default('waiter'),
  phone: z.string().max(20).optional(),
  language: z.enum(['en', 'nl', 'es', 'de']).default('en'),
})

/**
 * POST /api/auth/sign-up
 * Admin/owner only — create a new user account.
 * Self-registration is NOT supported; admins manage all credentials.
 */
export async function POST(request: NextRequest) {
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
