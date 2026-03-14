import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MyScheduleDashboard } from '@/components/staff/my-schedule/my-schedule-dashboard'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getTranslations } from 'next-intl/server'
import { format } from 'date-fns'

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
    .select('id, profile:profiles(id, full_name), contract_type, hourly_rate, date_hired, job_title')
    .eq('profile_id', user.id)
    .single()

  if (!employeeRecord) {
    return (
      <div className="max-w-7xl mx-auto py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">{t('mySchedule.employeeNotFound')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('mySchedule.contactManager')}
          </p>
        </div>
      </div>
    )
  }

  const profileData = employeeRecord.profile as unknown as { id: string; full_name: string | null } | null
  const employeeName = profileData?.full_name || ''

  // Format date_hired if available
  let dateHiredDisplay = '—'
  if (employeeRecord.date_hired) {
    try {
      dateHiredDisplay = format(new Date(employeeRecord.date_hired), 'dd MMM yyyy')
    } catch {
      dateHiredDisplay = String(employeeRecord.date_hired)
    }
  }

  const hasEmploymentData = employeeRecord.contract_type || employeeRecord.date_hired || employeeRecord.job_title

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={t('mySchedule.title')}
        description={t('mySchedule.subtitle')}
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      {/* My Employment — read-only contract info */}
      {hasEmploymentData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Employment</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {employeeRecord.job_title && (
                <div>
                  <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-0.5">Job Title</dt>
                  <dd className="font-medium">{employeeRecord.job_title}</dd>
                </div>
              )}
              {employeeRecord.contract_type && (
                <div>
                  <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-0.5">Contract</dt>
                  <dd className="font-medium capitalize">{String(employeeRecord.contract_type).replace(/_/g, ' ')}</dd>
                </div>
              )}
              {employeeRecord.hourly_rate != null && (
                <div>
                  <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-0.5">Hourly Rate</dt>
                  <dd className="font-medium">€{Number(employeeRecord.hourly_rate).toFixed(2)}/hr</dd>
                </div>
              )}
              {employeeRecord.date_hired && (
                <div>
                  <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-0.5">Date Hired</dt>
                  <dd className="font-medium">{dateHiredDisplay}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      <MyScheduleDashboard employeeId={employeeRecord.id} employeeName={employeeName} />
    </div>
  )
}
