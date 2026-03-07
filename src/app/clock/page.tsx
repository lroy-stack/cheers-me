import { redirect } from 'next/navigation'

/**
 * Redirect /clock → /staff/clock to eliminate duplicate pages (Feature S12.A2)
 */
export default function ClockRedirectPage() {
  redirect('/staff/clock')
}
