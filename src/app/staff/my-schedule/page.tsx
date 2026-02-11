import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MyScheduleDashboard } from '@/components/staff/my-schedule/my-schedule-dashboard'
import { CalendarDays } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function MySchedulePage() {
  const t = await getTranslations('staff')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: employeeRecord } = await supabase
    .from('employees')
    .select('id, profile:profiles(id, full_name)')
    .eq('profile_id', user.id)
    .single()

  if (!employeeRecord) {
    return (
      <div className="max-w-7xl mx-auto py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">{t('mySchedule.employeeNotFound')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('mySchedule.contactManager')}
          </p>
        </div>
      </div>
    )
  }

  const profileData = employeeRecord.profile as unknown as { id: string; full_name: string | null } | null
  const employeeName = profileData?.full_name || ''

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-3">
          <CalendarDays className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('mySchedule.title')}</h1>
          <p className="text-muted-foreground">
            {t('mySchedule.subtitle')}
          </p>
        </div>
      </div>

      <MyScheduleDashboard employeeId={employeeRecord.id} employeeName={employeeName} />
    </div>
  )
}
