import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getCurrentUser } from '@/lib/utils/auth'
import { getTranslations } from 'next-intl/server'
import {
  FinanceKPICards,
  AlertsPanel,
} from '@/components/finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PiggyBank,
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  Download,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { FinanceDashboardActions } from '@/components/finance/dashboard-actions'

const CostRatioGauges = dynamic(
  () => import('@/components/finance/cost-ratio-gauges').then(m => ({ default: m.CostRatioGauges }))
)
const ProfitTrendChart = dynamic(
  () => import('@/components/finance/profit-trend-chart').then(m => ({ default: m.ProfitTrendChart }))
)
const CostBreakdownChart = dynamic(
  () => import('@/components/finance/cost-breakdown-chart').then(m => ({ default: m.CostBreakdownChart }))
)

export const metadata = {
  title: 'Finance Dashboard | GrandCafe Cheers',
  description: 'View financial metrics, P&L, cost ratios, and profitability',
}

async function fetchFinanceDashboard() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const res = await fetch(`${baseUrl}/api/finance/dashboard`, {
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      return null
    }

    return await res.json()
  } catch (error) {
    console.error('Error fetching finance dashboard:', error)
    return null
  }
}

export default async function FinanceDashboardPage() {
  const userData = await getCurrentUser()

  if (!userData) {
    redirect('/login')
  }

  // Only allow admin, manager, and owner to view finances
  const allowedRoles = ['admin', 'manager', 'owner']
  if (!allowedRoles.includes(userData.profile.role)) {
    redirect('/dashboard')
  }

  const t = await getTranslations('finance')
  const dashboardData = await fetchFinanceDashboard()

  // Extract data from API response
  const today = dashboardData?.today || null
  const yesterday = dashboardData?.yesterday || null
  const weekData = dashboardData?.week_to_date || {}
  const monthData = dashboardData?.month_to_date || {}
  const targets = dashboardData?.targets || null
  const alerts = dashboardData?.alerts || []
  // Calculate values with fallbacks
  const todayRevenue = today?.revenue || 0
  const todayProfit = today?.profit || 0
  const todayProfitMargin =
    todayRevenue > 0 ? Number(((todayProfit / todayRevenue) * 100).toFixed(2)) : 0
  const todayCOGS = today?.cost_of_goods_sold || 0
  const todayLabor = today?.labor_cost || 0
  const todayOverhead = today?.overhead_cost || 0

  const yesterdayRevenue = yesterday?.revenue || null
  const yesterdayProfit = yesterday?.profit || null

  const weekRevenue = weekData?.totals?.revenue || 0
  const weekProfit = weekData?.totals?.profit || 0

  const monthRevenue = monthData?.totals?.revenue || 0
  const monthProfit = monthData?.totals?.profit || 0

  // Cost ratios
  const foodCostRatio = today?.food_cost_ratio || 0
  const beverageCostRatio = today?.beverage_cost_ratio || 0
  const laborCostRatio = today?.labor_cost_ratio || 0

  const targetFoodCost = targets?.target_food_cost_ratio || 30
  const targetBeverageCost = targets?.target_beverage_cost_ratio || 22
  const targetLaborCost = targets?.target_labor_cost_ratio || 30

  // 7-day trend data for chart — use week_to_date daily data from dashboard API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sevenDayTrend: any[] = dashboardData?.week_daily || []
  // Fallback: if week_daily isn't available, build from today's data
  if (sevenDayTrend.length === 0 && today) {
    sevenDayTrend.push({
      date: dashboardData?.date || new Date().toISOString().split('T')[0],
      revenue: todayRevenue,
      cost_of_goods_sold: todayCOGS,
      labor_cost: todayLabor,
      overhead_cost: todayOverhead,
      profit: todayProfit,
    })
  }

  const todayDate = format(new Date(), 'EEEE, MMMM d, yyyy')

  return (
    <div className="bg-muted -m-4 md:-m-6 p-4 md:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="h-6 w-6 text-emerald-500" />
              <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {todayDate}
            </p>
          </div>
          <FinanceDashboardActions />
        </div>

        {/* No Data Warning */}
        {!today && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-400">
                  {t('dashboard.noData')}
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-500 mt-1">
                  {t('dashboard.noDataHint')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Alerts */}
        {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

        {/* KPI Cards */}
        <FinanceKPICards
          todayRevenue={todayRevenue}
          todayProfit={todayProfit}
          todayProfitMargin={todayProfitMargin}
          todayCOGS={todayCOGS}
          todayLabor={todayLabor}
          todayOverhead={todayOverhead}
          yesterdayRevenue={yesterdayRevenue}
          yesterdayProfit={yesterdayProfit}
          weekRevenue={weekRevenue}
          weekProfit={weekProfit}
          monthRevenue={monthRevenue}
          monthProfit={monthProfit}
        />

        {/* Charts and Ratios Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Cost Ratio Gauges */}
          <CostRatioGauges
            foodCostRatio={foodCostRatio}
            beverageCostRatio={beverageCostRatio}
            laborCostRatio={laborCostRatio}
            targetFoodCost={targetFoodCost}
            targetBeverageCost={targetBeverageCost}
            targetLaborCost={targetLaborCost}
          />

          {/* Cost Breakdown Chart */}
          <CostBreakdownChart
            revenue={todayRevenue}
            cogs={todayCOGS}
            labor={todayLabor}
            overhead={todayOverhead}
            profit={todayProfit}
          />
        </div>

        {/* Profit Trend Chart */}
        {sevenDayTrend.length > 0 && <ProfitTrendChart data={sevenDayTrend} />}

        {/* Week & Month Summary Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Week Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                {t('dashboard.weekToDate')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.daysThisWeek', { count: weekData?.days_count || 0 })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('dashboard.totalRevenue')}</p>
                  <p className="text-xl font-bold">&euro;{weekRevenue.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('dashboard.totalProfit')}</p>
                  <p className={`text-xl font-bold ${weekProfit < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    &euro;{weekProfit.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('dashboard.avgFoodCost')}</p>
                  <p className="text-lg font-semibold">
                    {weekData?.avg_ratios?.food_cost_ratio?.toFixed(1) || '0.0'}%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('dashboard.avgLaborCost')}</p>
                  <p className="text-lg font-semibold">
                    {weekData?.avg_ratios?.labor_cost_ratio?.toFixed(1) || '0.0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-violet-500" />
                {t('dashboard.monthToDate')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.daysThisMonth', { count: monthData?.days_count || 0 })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('dashboard.totalRevenue')}</p>
                  <p className="text-xl font-bold">&euro;{monthRevenue.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('dashboard.totalProfit')}</p>
                  <p className={`text-xl font-bold ${monthProfit < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    &euro;{monthProfit.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('dashboard.profitMargin')}</p>
                  <p className="text-lg font-semibold">
                    {monthData?.profit_margin?.toFixed(1) || '0.0'}%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('dashboard.status')}</p>
                  <Badge
                    variant={monthProfit > 0 ? 'default' : 'destructive'}
                    className={monthProfit > 0 ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {monthProfit > 0 ? t('dashboard.profitable') : t('dashboard.loss')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.quickActions')}</CardTitle>
            <CardDescription>{t('dashboard.quickActionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/finance/reports?tab=daily">
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/30 transition-colors cursor-pointer">
                  <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-center">{t('dashboard.dailyReports')}</span>
                </div>
              </Link>
              <Link href="/finance/reports?tab=weekly">
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/30 transition-colors cursor-pointer">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-center">{t('dashboard.weeklyReports')}</span>
                </div>
              </Link>
              <Link href="/finance/budget-vs-actual">
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/30 transition-colors cursor-pointer">
                  <PiggyBank className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-center">{t('dashboard.budgetVsActual')}</span>
                </div>
              </Link>
              <Link href="/finance/export/tax">
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/30 transition-colors cursor-pointer">
                  <Download className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-center">{t('dashboard.taxExport')}</span>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
