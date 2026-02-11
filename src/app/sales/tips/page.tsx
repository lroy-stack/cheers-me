import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCurrentUser } from '@/lib/utils/auth'
import { TipsEntryDialog } from '@/components/sales/tips-entry-dialog'
import { TipsList } from '@/components/sales/tips-list'
import { TipsSummary } from '@/components/sales/tips-summary'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Euro, Calendar, Download } from 'lucide-react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export const metadata = {
  title: 'Tips Tracking | GrandCafe Cheers',
  description: 'Track and manage staff tips by shift',
}

async function fetchTodayShifts() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const today = format(new Date(), 'yyyy-MM-dd')

  try {
    const res = await fetch(`${baseUrl}/api/staff/shifts?start_date=${today}&end_date=${today}`, {
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      return []
    }

    return await res.json()
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return []
  }
}

async function fetchTips(params: { start_date?: string; end_date?: string; employee_id?: string } = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const searchParams = new URLSearchParams()

  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.employee_id) searchParams.set('employee_id', params.employee_id)
  searchParams.set('limit', '100')

  try {
    const res = await fetch(`${baseUrl}/api/sales/tips?${searchParams}`, {
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      return []
    }

    return await res.json()
  } catch (error) {
    console.error('Error fetching tips:', error)
    return []
  }
}

function calculateTipsSummary(tips: any[]) {
  const totalTips = tips.reduce((sum, tip) => sum + tip.amount, 0)
  const totalShifts = new Set(tips.map(tip => tip.shift_id)).size

  // Group by employee
  const byEmployee = tips.reduce((acc, tip) => {
    const employeeId = tip.employee_id
    const employeeName = tip.employee.profile.full_name

    if (!acc[employeeId]) {
      acc[employeeId] = {
        employee_id: employeeId,
        employee_name: employeeName,
        total_tips: 0,
        tip_count: 0,
      }
    }

    acc[employeeId].total_tips += tip.amount
    acc[employeeId].tip_count += 1

    return acc
  }, {} as Record<string, any>)

  const employeeSummaries = Object.values(byEmployee).map((emp: any) => ({
    ...emp,
    avg_tip: emp.tip_count > 0 ? emp.total_tips / emp.tip_count : 0,
  }))

  return {
    total_tips: totalTips,
    total_shifts: totalShifts,
    avg_tip_per_shift: totalShifts > 0 ? totalTips / totalShifts : 0,
    by_employee: employeeSummaries,
  }
}

export default async function TipsTrackingPage() {
  const t = await getTranslations('sales')
  const userData = await getCurrentUser()

  if (!userData) {
    redirect('/login')
  }

  // Allow managers and staff to view (staff see their own tips via RLS)
  const allowedRoles = ['admin', 'manager', 'owner', 'waiter', 'bar', 'kitchen']
  if (!allowedRoles.includes(userData.profile.role)) {
    redirect('/dashboard')
  }

  const isManager = ['admin', 'manager', 'owner'].includes(userData.profile.role)

  // Fetch data for different periods
  const today = format(new Date(), 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const [todayShifts, todayTips, weekTips, monthTips] = await Promise.all([
    isManager ? fetchTodayShifts() : Promise.resolve([]),
    fetchTips({ start_date: today, end_date: today }),
    fetchTips({ start_date: weekStart, end_date: weekEnd }),
    fetchTips({ start_date: monthStart, end_date: monthEnd }),
  ])

  const todaySummary = calculateTipsSummary(todayTips)
  const weekSummary = calculateTipsSummary(weekTips)
  const monthSummary = calculateTipsSummary(monthTips)

  return (
    <div className="bg-muted -m-4 md:-m-6 p-4 md:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Euro className="h-6 w-6 text-pink-500" />
              <h1 className="text-3xl font-bold">{t('tips.title')}</h1>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isManager && (
              <>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <TipsEntryDialog shifts={todayShifts} />
              </>
            )}
          </div>
        </div>

        {/* Info Card for Staff */}
        {!isManager && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
            <CardContent className="flex items-start gap-3 pt-6">
              <Euro className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-400">
                  Your Tips History
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-500 mt-1">
                  You can view your tip earnings below. Only managers can record new tips.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Different Time Periods */}
        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="today">
              {t('overview.today')}
              {todayTips.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {todayTips.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="week">
              {t('overview.thisWeek')}
              {weekTips.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {weekTips.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="month">
              {t('overview.thisMonth')}
              {monthTips.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {monthTips.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Today Tab */}
          <TabsContent value="today" className="space-y-6">
            {isManager && <TipsSummary summary={todaySummary} period="today" />}
            <TipsList tips={todayTips} showEmployee={isManager} />
          </TabsContent>

          {/* Week Tab */}
          <TabsContent value="week" className="space-y-6">
            {isManager && <TipsSummary summary={weekSummary} period="this week" />}
            <TipsList tips={weekTips} showEmployee={isManager} />
          </TabsContent>

          {/* Month Tab */}
          <TabsContent value="month" className="space-y-6">
            {isManager && <TipsSummary summary={monthSummary} period="this month" />}
            <TipsList tips={monthTips} showEmployee={isManager} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
