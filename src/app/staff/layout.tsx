import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/utils/auth'
import { AuthProvider } from '@/components/providers/auth-provider'
import { AppShell } from '@/components/layout/app-shell'

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userData = await getCurrentUser()

  if (!userData?.profile) {
    redirect('/login')
  }

  // All authenticated users can access /staff/* (resources, tasks, clock)
  // Individual pages enforce their own role restrictions

  return (
    <AuthProvider
      user={userData?.user ?? null}
      profile={userData?.profile ?? null}
    >
      <AppShell>{children}</AppShell>
    </AuthProvider>
  )
}
