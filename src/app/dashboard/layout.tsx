import { getCurrentUser } from '@/lib/utils/auth'
import { AuthProvider } from '@/components/providers/auth-provider'
import { AppShell } from '@/components/layout/app-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userData = await getCurrentUser()

  return (
    <AuthProvider
      user={userData?.user ?? null}
      profile={userData?.profile ?? null}
    >
      <AppShell>{children}</AppShell>
    </AuthProvider>
  )
}
