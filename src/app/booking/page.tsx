import { redirect } from 'next/navigation'

/**
 * /booking now redirects to / (root landing page).
 * Kept for backwards compatibility with existing links and bookmarks.
 */
export default function BookingRedirect() {
  redirect('/')
}
