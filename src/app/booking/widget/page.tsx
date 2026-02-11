import { getTranslations } from 'next-intl/server'
import PublicBookingForm from '@/components/reservations/public-booking-form'

/**
 * Minimal Booking Widget
 * Designed to be embedded in iframes on external websites or Instagram
 * URL: /booking/widget
 */

export async function generateMetadata() {
  const t = await getTranslations('booking')
  return {
    title: t('widget.title'),
    description: t('widget.description'),
  }
}

export default function BookingWidgetPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background p-4">
      <PublicBookingForm />
    </div>
  )
}
