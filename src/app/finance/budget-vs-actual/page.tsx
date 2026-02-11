import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/utils/auth'
import { getTranslations } from 'next-intl/server'
import { BudgetVsActualView } from '@/components/finance/budget'
import { Target } from 'lucide-react'

export const metadata = {
  title: 'Budget vs Actual | GrandCafe Cheers',
  description: 'Compare budgeted vs actual financial performance',
}

export default async function BudgetVsActualPage() {
  const userData = await getCurrentUser()

  if (!userData) {
    redirect('/login')
  }

  // Only allow admin, manager, and owner
  const allowedRoles = ['admin', 'manager', 'owner']
  if (!allowedRoles.includes(userData.profile.role)) {
    redirect('/dashboard')
  }

  const t = await getTranslations('finance')

  return (
    <div className="bg-muted -m-4 md:-m-6 p-4 md:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-6 w-6 text-emerald-500" />
              <h1 className="text-3xl font-bold">{t('budget.title')}</h1>
            </div>
            <p className="text-muted-foreground">
              {t('budget.subtitle')}
            </p>
          </div>
        </div>

        {/* Budget Comparison View */}
        <BudgetVsActualView />
      </div>
    </div>
  )
}
