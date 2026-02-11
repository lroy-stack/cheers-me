import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClockInOutCard } from '@/components/staff/clock-in-out-card'
import { ClockHistory } from '@/components/staff/clock-history'
import { Clock } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function ClockPage() {
  const t = await getTranslations('staff')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get employee record for current user
  const { data: employeeRecord } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!employeeRecord) {
    return (
      <div className="max-w-7xl mx-auto py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">{t('clock.employeeNotFound')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('clock.contactManager')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-3">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('clock.title')}</h1>
          <p className="text-muted-foreground">
            {t('clock.subtitle')}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Clock In/Out Card - Takes full width on mobile, 2 cols on desktop */}
        <div className="md:col-span-1">
          <ClockInOutCard employeeId={employeeRecord.id} />
        </div>

        {/* Clock History - Takes remaining space */}
        <div className="md:col-span-1 lg:col-span-2">
          <ClockHistory employeeId={employeeRecord.id} limit={10} />
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="font-semibold mb-2">{t('clock.howItWorks')}</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="font-bold text-primary">1.</span>
            <span>{t('clock.step1')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-primary">2.</span>
            <span>{t('clock.step2')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-primary">3.</span>
            <span>{t('clock.step3')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-primary">4.</span>
            <span>{t('clock.step4')}</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
