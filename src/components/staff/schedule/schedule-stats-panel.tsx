'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Clock, Users, DollarSign, AlertTriangle } from 'lucide-react'
import { ScheduleValidationResult } from '@/types'
import { useTranslations } from 'next-intl'

interface ScheduleStatsPanelProps {
  grandTotal: { hours: number; cost: number; employees: number }
  validation: ScheduleValidationResult
  shiftsCount: number
}

export function ScheduleStatsPanel({ grandTotal, validation, shiftsCount: _shiftsCount }: ScheduleStatsPanelProps) {
  const t = useTranslations('staff')

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{t('schedule.totalHours')}</p>
          </div>
          <div className="text-2xl font-bold mt-1">{grandTotal.hours.toFixed(1)}h</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{t('schedule.employeesScheduled')}</p>
          </div>
          <div className="text-2xl font-bold mt-1">{grandTotal.employees}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{t('schedule.estimatedCost')}</p>
          </div>
          <div className="text-2xl font-bold mt-1">{grandTotal.cost.toFixed(0)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${validation.errors.length > 0 ? 'text-red-500' : validation.warnings.length > 0 ? 'text-primary' : 'text-green-500'}`} />
            <p className="text-xs text-muted-foreground">{t('schedule.violations')}</p>
          </div>
          <div className="text-2xl font-bold mt-1">
            {validation.errors.length + validation.warnings.length === 0 ? (
              <span className="text-green-600">0</span>
            ) : (
              <span className={validation.errors.length > 0 ? 'text-red-600' : 'text-primary'}>
                {validation.errors.length + validation.warnings.length}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
