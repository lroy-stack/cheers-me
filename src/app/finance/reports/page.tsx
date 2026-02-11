import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/utils/auth'
import { getTranslations } from 'next-intl/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DailyReportsTab,
  WeeklyReportsTab,
  MonthlyReportsTab,
} from '@/components/finance/reports'
import { FinancialReportExport } from '@/components/finance/export'
import { TaxReportsTab } from '@/components/finance/tax-reports-tab'
import { FileText, TrendingUp, Calendar, Download, Scale } from 'lucide-react'

export const metadata = {
  title: 'Financial Reports | GrandCafe Cheers',
  description: 'View detailed daily, weekly, and monthly financial reports with export capabilities',
}

export default async function FinanceReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const userData = await getCurrentUser()

  if (!userData) {
    redirect('/login')
  }

  // Only allow admin, manager, and owner to view financial reports
  const allowedRoles = ['admin', 'manager', 'owner']
  if (!allowedRoles.includes(userData.profile.role)) {
    redirect('/dashboard')
  }

  const t = await getTranslations('finance')
  const params = await searchParams
  const validTabs = ['daily', 'weekly', 'monthly', 'export', 'tax']
  const activeTab = validTabs.includes(params.tab || '') ? params.tab! : 'daily'

  return (
    <div className="bg-muted -m-4 md:-m-6 p-4 md:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-6 w-6 text-emerald-500" />
              <h1 className="text-3xl font-bold">{t('reports.title')}</h1>
            </div>
            <p className="text-muted-foreground">
              {t('reports.subtitle')}
            </p>
          </div>
        </div>

        {/* Reports Tabs */}
        <Tabs defaultValue={activeTab} className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-5 mb-6">
            <TabsTrigger value="daily" className="gap-2">
              <Calendar className="h-4 w-4" />
              {t('reports.daily')}
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('reports.weekly')}
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('reports.monthly')}
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="h-4 w-4" />
              {t('reports.export')}
            </TabsTrigger>
            <TabsTrigger value="tax" className="gap-2">
              <Scale className="h-4 w-4" />
              {t('reports.tax')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <DailyReportsTab />
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            <WeeklyReportsTab />
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <MonthlyReportsTab />
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <FinancialReportExport />
          </TabsContent>

          <TabsContent value="tax" className="space-y-4">
            <TaxReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
