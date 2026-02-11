import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClockPageClient } from './clock-page-client'
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
      <div className="container mx-auto py-10">
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-3">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('clock.title')}</h1>
          <p className="text-muted-foreground">
            {t('clock.pageSubtitle')}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <ClockPageClient employeeId={employeeRecord.id} />

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
