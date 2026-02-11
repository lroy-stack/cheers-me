import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getTranslations } from 'next-intl/server'
import { getCurrentUser } from '@/lib/utils/auth'
import { SalesKPICards } from '@/components/sales/sales-kpi-cards'
import { TopSellersTable } from '@/components/sales/top-sellers-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart3, AlertCircle, Calendar, DollarSign } from 'lucide-react'
import { SalesDashboardActions } from '@/components/sales/sales-dashboard-actions'
import Link from 'next/link'
import { format } from 'date-fns'

const RevenueTrendChart = dynamic(
  () => import('@/components/sales/revenue-trend-chart').then(m => ({ default: m.RevenueTrendChart }))
)
const CategoryBreakdownChart = dynamic(
  () => import('@/components/sales/category-breakdown-chart').then(m => ({ default: m.CategoryBreakdownChart }))
)

export const metadata = {
  title: 'Sales Dashboard | GrandCafe Cheers',
  description: 'View sales metrics, revenue trends, and top sellers',
}

async function fetchSalesDashboard() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const res = await fetch(`${baseUrl}/api/sales/dashboard`, {
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
    console.error('Error fetching sales dashboard:', error)
    return null
  }
}

async function fetchTopSellers() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const res = await fetch(`${baseUrl}/api/sales/top-sellers?period=daily&limit=10`, {
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      return { top_sellers: [] }
    }

    return await res.json()
  } catch (error) {
    console.error('Error fetching top sellers:', error)
    return { top_sellers: [] }
  }
}

export default async function SalesDashboardPage() {
  const t = await getTranslations('sales')
  const userData = await getCurrentUser()

  if (!userData) {
    redirect('/login')
  }

  // Only allow admin, manager, and owner to view sales
  const allowedRoles = ['admin', 'manager', 'owner']
  if (!allowedRoles.includes(userData.profile.role)) {
    redirect('/dashboard')
  }

  const [dashboardData, topSellersData] = await Promise.all([
    fetchSalesDashboard(),
    fetchTopSellers(),
  ])

  // Calculate KPI data
  const todayRevenue = dashboardData?.today?.total_revenue || 0
  const todayTickets = dashboardData?.today?.ticket_count || 0
  const todayTips = dashboardData?.today?.tips || 0

  const weekRevenue = dashboardData?.week?.totals?.total_revenue || 0
  const weekTips = dashboardData?.week?.totals?.tips || 0
  const weekAvgTicket = dashboardData?.week?.avg_ticket || 0

  // Calculate week-over-week growth
  const lastWeekRevenue = dashboardData?.comparison?.last_week_revenue || null
  const weekGrowth = lastWeekRevenue && lastWeekRevenue > 0
    ? ((todayRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
    : null

  // Category breakdown
  const categoryData = dashboardData?.category_breakdown?.amounts || {
    food: 0,
    drinks: 0,
    cocktails: 0,
    desserts: 0,
    other: 0,
  }

  const weekTrend = dashboardData?.week?.trend || []

  const today = format(new Date(), 'EEEE, MMMM d, yyyy')

  return (
    <div className="bg-muted -m-4 md:-m-6 p-4 md:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-6 w-6 text-violet-500" />
              <h1 className="text-3xl font-bold">{t('overview.title')}</h1>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {today}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sales/close">
              <Button variant="outline" size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                {t('close.startClose')}
              </Button>
            </Link>
            <SalesDashboardActions />
          </div>
        </div>

        {/* No Data Warning */}
        {!dashboardData?.today && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-400">
                  No sales data for today
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-500 mt-1">
                  Add today&apos;s sales to see live metrics and trends
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <SalesKPICards
          todayRevenue={todayRevenue}
          weekRevenue={weekRevenue}
          weekGrowth={weekGrowth}
          todayTickets={todayTickets}
          weekAvgTicket={weekAvgTicket}
          todayTips={todayTips}
          weekTips={weekTips}
        />

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          <RevenueTrendChart data={weekTrend} />
          <CategoryBreakdownChart data={categoryData} />
        </div>

        {/* Top Sellers & Historical Comparison */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <TopSellersTable items={topSellersData.top_sellers} period="today" />
          </div>

          {/* Historical Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('overview.revenueByDay')}</CardTitle>
              <CardDescription>{t('overview.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboardData?.comparison ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('overview.today')}</span>
                      <span className="font-semibold">
                        €{todayRevenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last week</span>
                      <span>
                        €{(dashboardData.comparison.last_week_revenue || 0).toLocaleString()}
                      </span>
                    </div>
                    {dashboardData.comparison.last_week_revenue > 0 && (
                      <div className="pt-2 border-t">
                        <Badge
                          variant={weekGrowth && weekGrowth >= 0 ? 'default' : 'destructive'}
                          className="w-full justify-center"
                        >
                          {weekGrowth && weekGrowth >= 0 ? '+' : ''}
                          {weekGrowth?.toFixed(1)}% vs last week
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Same day last month</span>
                      <span>
                        €{(dashboardData.comparison.last_month_revenue || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Same day last year</span>
                      <span>
                        €{(dashboardData.comparison.last_year_revenue || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Not enough historical data
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cash Register Close Status */}
        {dashboardData?.register_close && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span>✓</span>
                {t('close.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('close.cashExpected')}</p>
                  <p className="font-semibold">
                    €{dashboardData.register_close.expected_cash.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('close.cashCounted')}</p>
                  <p className="font-semibold">
                    €{dashboardData.register_close.actual_cash.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('close.difference')}</p>
                  <p className={`font-semibold ${
                    dashboardData.register_close.variance === 0
                      ? 'text-green-600'
                      : Math.abs(dashboardData.register_close.variance) > 10
                      ? 'text-red-600'
                      : 'text-orange-600'
                  }`}>
                    {dashboardData.register_close.variance > 0 ? '+' : ''}
                    €{dashboardData.register_close.variance.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('close.closedBy')}</p>
                  <p className="font-semibold">
                    {dashboardData.register_close.closed_by_name || 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
