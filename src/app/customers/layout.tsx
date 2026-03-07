import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/utils/auth'
import { AuthProvider } from '@/components/providers/auth-provider'
import { AppShell } from '@/components/layout/app-shell'

const ALLOWED_ROLES = ['admin', 'owner', 'manager']

export default async function CustomersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userData = await getCurrentUser()

  if (!userData) {
    redirect('/login')
  }

  if (!ALLOWED_ROLES.includes(userData.profile.role)) {
    redirect('/dashboard')
  }

  return (
    <AuthProvider
      user={userData?.user ?? null}
      profile={userData?.profile ?? null}
    >
      <AppShell>{children}</AppShell>
    </AuthProvider>
  )
}
