import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Sensitive routes that require server-verified auth (getUser() network call).
  // These routes access PII, financial data, or security settings.
  const sensitiveRoutes = ['/settings/', '/customers/', '/finance/', '/api/staff/employees/', '/api/crm/']
  const isSensitiveRoute = sensitiveRoutes.some(r => request.nextUrl.pathname.startsWith(r))

  let user: import('@supabase/supabase-js').User | null = null

  if (isSensitiveRoute) {
    // getUser() makes a verified network call to Supabase — token cannot be forged
    const { data: { user: verifiedUser } } = await supabase.auth.getUser()
    user = verifiedUser
  } else {
    // getSession() reads from cookies locally — fast (~5ms) for non-sensitive routes
    const { data: { session } } = await supabase.auth.getSession()
    user = session?.user ?? null
  }

  // Protected routes - redirect to /login if not authenticated
  if (
    !user &&
    request.nextUrl.pathname !== '/' &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api/auth/sign-in') &&
    !request.nextUrl.pathname.startsWith('/api/auth/sign-out') &&
    !request.nextUrl.pathname.startsWith('/api/auth/callback') &&
    !request.nextUrl.pathname.startsWith('/api/health') &&
    !request.nextUrl.pathname.startsWith('/booking') &&
    !request.nextUrl.pathname.startsWith('/kiosk') &&
    !request.nextUrl.pathname.startsWith('/digital') &&
    !request.nextUrl.pathname.startsWith('/api/public') &&
    !request.nextUrl.pathname.startsWith('/api/ai/booking-chat') &&
    !request.nextUrl.pathname.startsWith('/gift') &&
    !request.nextUrl.pathname.startsWith('/api/coupons/stripe-webhook') &&
    !request.nextUrl.pathname.startsWith('/api/coupons/purchase') &&
    !request.nextUrl.pathname.startsWith('/legal') &&
    !request.nextUrl.pathname.startsWith('/api/marketing/subscribers/verify') &&
    !request.nextUrl.pathname.startsWith('/api/marketing/subscribers/unsubscribe') &&
    !request.nextUrl.pathname.startsWith('/api/cron/')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
