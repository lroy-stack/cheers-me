'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'

interface FinanceAlert {
  type: string
  message: string
  severity: 'info' | 'warning' | 'danger'
  actual?: number
  target?: number
}

interface AlertsPanelProps {
  alerts: FinanceAlert[]
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const t = useTranslations('finance')

  if (alerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-lg">✓</span>
            </div>
            <div>
              <CardTitle className="text-base text-green-900 dark:text-green-100">
                {t('alerts.allNormal')}
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                {t('alerts.allNormalDesc')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  const getAlertIcon = (severity: 'info' | 'warning' | 'danger') => {
    switch (severity) {
      case 'danger':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getAlertStyles = (severity: 'info' | 'warning' | 'danger') => {
    switch (severity) {
      case 'danger':
        return 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800'
      case 'warning':
        return 'border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800'
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800'
    }
  }

  const getSeverityBadge = (severity: 'info' | 'warning' | 'danger') => {
    switch (severity) {
      case 'danger':
        return (
          <Badge variant="destructive" className="ml-auto">
            {t('alerts.critical')}
          </Badge>
        )
      case 'warning':
        return (
          <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
            {t('alerts.warning')}
          </Badge>
        )
      case 'info':
        return (
          <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
            {t('alerts.info')}
          </Badge>
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('alerts.title')}</CardTitle>
        <CardDescription>
          {t('alerts.alertCount', { count: alerts.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, index) => (
          <Alert key={index} className={getAlertStyles(alert.severity)}>
            <div className="flex items-start gap-3">
              {getAlertIcon(alert.severity)}
              <div className="flex-1">
                <AlertDescription className="text-sm">
                  {alert.message}
                </AlertDescription>
                {alert.actual !== undefined && alert.target !== undefined && (
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {t('alerts.actual')} <span className="font-semibold">{alert.actual.toFixed(1)}%</span>
                    </span>
                    <span>
                      {t('alerts.target')} <span className="font-semibold">{alert.target.toFixed(1)}%</span>
                    </span>
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                      &Delta; {(alert.actual - alert.target).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              {getSeverityBadge(alert.severity)}
            </div>
          </Alert>
        ))}
      </CardContent>
    </Card>
  )
}
