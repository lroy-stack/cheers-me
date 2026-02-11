import { AppShell } from '@/components/layout/app-shell'

export default function ClockLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
