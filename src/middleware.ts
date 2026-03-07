import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, icons, manifest)
     * - api/public/* (public API routes)
     * - booking/* (public booking pages)
     * - kiosk/* (public kiosk)
     * - digital/* (public digital menu)
     * - gift/* (public gift card pages)
     * - login, auth (auth pages)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons/|sw\\.js|workbox-.*\\.js|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)).*)',
  ],
}
