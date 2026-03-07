import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/utils/auth'

export default async function FiscalSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userData = await getCurrentUser()

  if (!userData) {
    redirect('/login')
  }

  // Fiscal settings require admin or owner
  if (!['admin', 'owner'].includes(userData.profile.role)) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
