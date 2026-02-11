'use client'

import { useCallback, useEffect, useState } from 'react'
import { MonthlyRegistry } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SHIFT_TYPE_CONFIG, ROLE_DEPARTMENT_MAP } from '@/lib/constants/schedule'
import { cn } from '@/lib/utils'
import { ScheduleCellType } from '@/types'
import { useTranslations } from 'next-intl'

export function MonthlyRegistryView() {
  const t = useTranslations('staff')
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [registry, setRegistry] = useState<MonthlyRegistry | null>(null)
  const [loading, setLoading] = useState(true)

  const monthNames = [
    t('schedule.monthJanuary'), t('schedule.monthFebruary'), t('schedule.monthMarch'),
    t('schedule.monthApril'), t('schedule.monthMay'), t('schedule.monthJune'),
    t('schedule.monthJuly'), t('schedule.monthAugust'), t('schedule.monthSeptember'),
    t('schedule.monthOctober'), t('schedule.monthNovember'), t('schedule.monthDecember'),
  ]

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/staff/monthly-registry?year=${year}&month=${month}`)
      if (res.ok) {
        const data = await res.json()
        setRegistry(data)
      }
    } catch (err) {
      console.error('Failed to load monthly registry:', err)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const daysInMonth = new Date(year, month, 0).getDate()
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1)
      setMonth(12)
    } else {
      setMonth(month - 1)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1)
      setMonth(1)
    } else {
      setMonth(month + 1)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold">
            {monthNames[month - 1]} {year}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {registry && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{t('schedule.totalLabel')}: <b>{registry.grand_total.hours.toFixed(1)}h</b></span>
            <span>{t('schedule.costLabel')}: <b>{registry.grand_total.cost.toFixed(0)}</b></span>
            <span>{t('schedule.overtimeLabel')}: <b>{registry.grand_total.overtime.toFixed(1)}h</b></span>
          </div>
        )}
      </div>

      {/* Monthly Grid */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="sticky left-0 z-20 bg-muted/30 min-w-[150px] border-r text-xs">
                  {t('schedule.employeeColumn')}
                </TableHead>
                {dayNumbers.map((day) => (
                  <TableHead key={day} className="text-center px-1 min-w-[32px] text-xs">
                    {day}
                  </TableHead>
                ))}
                <TableHead className="text-right border-l min-w-[60px] text-xs">{t('schedule.hoursColumn')}</TableHead>
                <TableHead className="text-right min-w-[60px] text-xs">{t('schedule.costColumn')}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!registry || registry.employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={dayNumbers.length + 3} className="text-center py-8 text-muted-foreground">
                    {t('schedule.noDataForMonth')}
                  </TableCell>
                </TableRow>
              ) : (
                registry.employees.map((emp) => (
                  <TableRow key={emp.employee_id}>
                    <TableCell className="sticky left-0 z-10 bg-background border-r text-xs">
                      <div className="truncate max-w-[140px]">{emp.name}</div>
                    </TableCell>
                    {dayNumbers.map((day) => {
                      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      const dayData = emp.days[dateStr]
                      const cellType = dayData?.shift_type as ScheduleCellType | undefined
                      const config = cellType ? SHIFT_TYPE_CONFIG[cellType] : null

                      return (
                        <TableCell
                          key={day}
                          className={cn(
                            'p-0 text-center text-[10px] font-bold',
                            config ? cn(config.bg, config.text) : '',
                            dayData?.is_leave && 'bg-purple-100 dark:bg-purple-900/30'
                          )}
                        >
                          {cellType || (dayData?.is_leave ? 'V' : '')}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right border-l text-xs font-medium">
                      {emp.total_hours.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {emp.total_cost.toFixed(0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

            {registry && registry.employees.length > 0 && (
              <TableFooter>
                <TableRow className="font-bold">
                  <TableCell className="sticky left-0 z-10 bg-muted border-r text-xs">
                    {t('schedule.totalsRow')}
                  </TableCell>
                  <TableCell colSpan={dayNumbers.length} />
                  <TableCell className="text-right border-l text-xs">
                    {registry.grand_total.hours.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {registry.grand_total.cost.toFixed(0)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>

      {/* Role Totals */}
      {registry && Object.keys(registry.role_totals).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('schedule.departmentTotals')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(registry.role_totals)
                .sort(([a], [b]) => {
                  const aOrder = ROLE_DEPARTMENT_MAP[a as keyof typeof ROLE_DEPARTMENT_MAP]?.order || 99
                  const bOrder = ROLE_DEPARTMENT_MAP[b as keyof typeof ROLE_DEPARTMENT_MAP]?.order || 99
                  return aOrder - bOrder
                })
                .map(([role, totals]) => {
                  const dept = ROLE_DEPARTMENT_MAP[role as keyof typeof ROLE_DEPARTMENT_MAP]
                  return (
                    <div key={role} className="flex justify-between p-2 rounded bg-muted/50">
                      <span className="text-sm font-medium">{dept?.label || role}</span>
                      <span className="text-sm text-muted-foreground">
                        {totals.count} {t('schedule.staffLabel')} · {totals.total_hours.toFixed(1)}h · {totals.total_cost.toFixed(0)}
                      </span>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
