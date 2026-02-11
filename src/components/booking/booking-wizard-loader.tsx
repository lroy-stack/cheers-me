'use client'

import dynamic from 'next/dynamic'
import BookingSkeleton from './booking-skeleton'

const BookingWizard = dynamic(
  () => import('./booking-wizard'),
  { ssr: false, loading: () => <BookingSkeleton /> }
)

export default function BookingWizardLoader() {
  return <BookingWizard />
}
