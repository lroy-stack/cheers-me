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

  // Use getSession() instead of getUser() for faster proxy execution.
  // getSession() reads from cookies locally (~5ms) vs getUser() which makes
  // a network call to Supabase (~500ms). Token verification happens in
  // getCurrentUser() within server components.

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user

  // Protected routes - redirect to /login if not authenticated
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/booking') &&
    !request.nextUrl.pathname.startsWith('/kiosk') &&
    !request.nextUrl.pathname.startsWith('/menu/digital') &&
    !request.nextUrl.pathname.startsWith('/api/public') &&
    !request.nextUrl.pathname.startsWith('/api/ai/booking-chat') &&
    !request.nextUrl.pathname.startsWith('/gift') &&
    !request.nextUrl.pathname.startsWith('/api/coupons/stripe-webhook') &&
    !request.nextUrl.pathname.startsWith('/api/coupons/purchase')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
