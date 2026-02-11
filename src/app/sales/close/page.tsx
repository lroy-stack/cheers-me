import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCurrentUser } from '@/lib/utils/auth'
import { RegisterCloseForm } from '@/components/sales/register-close-form'
import { RegisterCloseHistory } from '@/components/sales/register-close-history'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, AlertCircle, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'

export const metadata = {
  title: 'Cash Register Close | GrandCafe Cheers',
  description: 'Close cash register and track daily reconciliation',
}

async function fetchTodaySales() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const today = format(new Date(), 'yyyy-MM-dd')

  try {
    const res = await fetch(`${baseUrl}/api/sales/daily?start_date=${today}&end_date=${today}`, {
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    return data && data.length > 0 ? data[0] : null
  } catch (error) {
    console.error('Error fetching today sales:', error)
    return null
  }
}

async function fetchTodayRegisterClose() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const today = format(new Date(), 'yyyy-MM-dd')

  try {
    const res = await fetch(`${baseUrl}/api/sales/register-close/${today}`, {
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      if (res.status === 404) {
        return null // No close for today yet
      }
      return null
    }

    return await res.json()
  } catch (error) {
    console.error('Error fetching register close:', error)
    return null
  }
}

async function fetchRegisterCloseHistory() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const res = await fetch(`${baseUrl}/api/sales/register-close?limit=30`, {
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
    console.error('Error fetching register close history:', error)
    return []
  }
}

export default async function CashRegisterClosePage() {
  const t = await getTranslations('sales')
  const userData = await getCurrentUser()

  if (!userData) {
    redirect('/login')
  }

  // Only allow admin and manager to access cash register close
  const allowedRoles = ['admin', 'manager']
  if (!allowedRoles.includes(userData.profile.role)) {
    redirect('/dashboard')
  }

  const [todaySales, todayClose, closeHistory] = await Promise.all([
    fetchTodaySales(),
    fetchTodayRegisterClose(),
    fetchRegisterCloseHistory(),
  ])

  const expectedAmount = todaySales?.total_revenue || 0
  const today = format(new Date(), 'EEEE, MMMM d, yyyy')

  // Calculate statistics from history
  const recentCloses = closeHistory.slice(0, 7) // Last 7 closes
  const totalVariance = recentCloses.reduce((sum: number, close: any) => sum + close.variance, 0)
  const avgVariance = recentCloses.length > 0 ? totalVariance / recentCloses.length : 0
  const accurateCloses = recentCloses.filter((close: any) => Math.abs(close.variance) <= 5).length
  const accuracyRate = recentCloses.length > 0 ? (accurateCloses / recentCloses.length) * 100 : 0

  return (
    <div className="bg-muted -m-4 md:-m-6 p-4 md:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-6 w-6 text-violet-500" />
              <h1 className="text-3xl font-bold">{t('close.title')}</h1>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {today}
            </p>
          </div>
          {todayClose && (
            <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
              ✓ Already Closed Today
            </Badge>
          )}
        </div>

        {/* Alert if no sales data */}
        {!todaySales && !todayClose && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-400">
                  No sales data for today
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-500 mt-1">
                  Please add today&apos;s sales data before closing the cash register
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{t('close.cashExpected')}</CardDescription>
              <CardTitle className="text-2xl">€{expectedAmount.toFixed(2)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Based on today&apos;s sales revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Average Variance (7 days)</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                {avgVariance >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-blue-500" />
                )}
                €{Math.abs(avgVariance).toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {avgVariance > 0 ? 'Average surplus' : 'Average shortage'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Accuracy Rate (7 days)</CardDescription>
              <CardTitle className="text-2xl">
                {accuracyRate.toFixed(0)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {accurateCloses} of {recentCloses.length} within ±€5
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Close Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {todayClose ? t('close.title') : t('close.startClose')}
            </CardTitle>
            <CardDescription>
              {t('close.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayClose ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('close.cashExpected')}</p>
                    <p className="text-2xl font-bold">€{todayClose.expected_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('close.cashCounted')}</p>
                    <p className="text-2xl font-bold">€{todayClose.actual_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('close.difference')}</p>
                    <p className={`text-2xl font-bold ${
                      todayClose.variance === 0
                        ? 'text-green-600'
                        : Math.abs(todayClose.variance) > 10
                        ? 'text-red-600'
                        : 'text-orange-600'
                    }`}>
                      {todayClose.variance > 0 ? '+' : ''}€{todayClose.variance.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('close.closedBy')}</p>
                    <p className="text-lg font-semibold">
                      {todayClose.closed_by_employee?.profile?.full_name || 'Unknown'}
                    </p>
                  </div>
                </div>

                {todayClose.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">{t('close.notes')}</p>
                    <p className="text-sm">{todayClose.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Closed at {format(new Date(todayClose.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            ) : userData.employee ? (
              <RegisterCloseForm
                expectedAmount={expectedAmount}
                date={format(new Date(), 'yyyy-MM-dd')}
                employeeId={userData.employee.id}
                disabled={!todaySales}
              />
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your account is not linked to an employee record. Please contact an administrator.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <RegisterCloseHistory history={closeHistory} />
      </div>
    </div>
  )
}
