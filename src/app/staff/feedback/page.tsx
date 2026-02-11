import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ShiftSurveyDashboard } from '@/components/staff/shift-survey-dashboard'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('staff.feedback')
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function FeedbackPage() {
  const t = await getTranslations('staff.feedback')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
      </div>

      <ShiftSurveyDashboard />
    </div>
  )
}
