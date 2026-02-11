import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/sign-out
 * Sign out the current user
 */
export async function POST(_request: NextRequest) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 400 }
    )
  }

  return NextResponse.json({
    message: 'Signed out successfully',
  })
}
