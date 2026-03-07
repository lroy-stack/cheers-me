'use client'

import { ScheduleValidationResult } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface ScheduleViolationsPanelProps {
  validation: ScheduleValidationResult
}

export function ScheduleViolationsPanel({ validation }: ScheduleViolationsPanelProps) {
  const { errors, warnings } = validation
  const total = errors.length + warnings.length
  const t = useTranslations('staff')

  if (total === 0) {
    return (
      <Card className="border-success/30 bg-success/15 dark:bg-success/15">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-success dark:text-success">
            <CheckCircle className="h-5 w-5" />
            <p className="font-medium">{t('schedule.noViolations')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      errors.length > 0
        ? 'border-destructive/30 bg-destructive/15 dark:bg-destructive/15'
        : 'border-primary/20 bg-primary/5/50 dark:bg-primary/5'
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className={cn(
            'h-4 w-4',
            errors.length > 0 ? 'text-destructive' : 'text-primary'
          )} />
          {t('schedule.errorsCount', { count: errors.length })}, {t('schedule.warningsCount', { count: warnings.length })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {errors.map((v, i) => (
            <div key={`e-${i}`} className="flex items-start gap-2 text-sm">
              <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <span className="text-destructive dark:text-destructive">{v.message}</span>
            </div>
          ))}
          {warnings.map((v, i) => (
            <div key={`w-${i}`} className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span className="text-primary dark:text-primary">{v.message}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
