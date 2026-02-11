import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/callback
 * Handle Supabase auth callbacks (email confirmation, OAuth, etc.)
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      // Redirect to error page or login with error message
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`
      )
    }

    // Successful authentication, redirect to the requested page
    return NextResponse.redirect(`${requestUrl.origin}${next}`)
  }

  // No code present, redirect to home
  return NextResponse.redirect(requestUrl.origin)
}
