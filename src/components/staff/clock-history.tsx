'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClockInOutWithDetails, ClockBreak } from '@/types'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { History, Clock, Coffee } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslations } from 'next-intl'

interface ClockHistoryProps {
  employeeId?: string
  limit?: number
  showEmployeeColumn?: boolean
}

export function ClockHistory({
  employeeId,
  limit = 10,
  showEmployeeColumn = false
}: ClockHistoryProps) {
  const t = useTranslations('staff')
  const [records, setRecords] = useState<ClockInOutWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClockHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  async function fetchClockHistory() {
    try {
      const params = new URLSearchParams()
      if (employeeId) params.append('employee_id', employeeId)

      const res = await fetch(`/api/staff/clock?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch clock history')

      const data = await res.json()
      setRecords(data.slice(0, limit))
    } catch (error) {
      console.error('Error fetching clock history:', error)
    } finally {
      setLoading(false)
    }
  }

  function calculateDuration(clockIn: string, clockOut: string | null): string {
    if (!clockOut) return t('clock.inProgress')

    const start = parseISO(clockIn)
    const end = parseISO(clockOut)
    const minutes = differenceInMinutes(end, start)

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    return `${hours}h ${mins}m`
  }

  function calculateTotalHours(records: ClockInOutWithDetails[]): number {
    return records.reduce((total, record) => {
      if (!record.clock_out_time) return total
      const minutes = differenceInMinutes(
        parseISO(record.clock_out_time),
        parseISO(record.clock_in_time)
      )
      return total + minutes / 60
    }, 0)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('clock.history')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalHours = calculateTotalHours(records)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('clock.history')}
            </CardTitle>
            <CardDescription>
              {t('clock.lastRecords', { count: records.length })}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('clock.totalWorked')}</p>
            <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t('clock.noEntries')}</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {showEmployeeColumn && <TableHead>{t('schedule.employee')}</TableHead>}
                  <TableHead>{t('schedule.date')}</TableHead>
                  <TableHead>{t('clock.clockIn')}</TableHead>
                  <TableHead>{t('clock.clockOut')}</TableHead>
                  <TableHead className="text-right">{t('clock.breakTime')}</TableHead>
                  <TableHead className="text-right">{t('clock.duration')}</TableHead>
                  <TableHead>{t('employees.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const clockInDate = parseISO(record.clock_in_time)
                  const isActive = !record.clock_out_time

                  return (
                    <TableRow key={record.id}>
                      {showEmployeeColumn && (
                        <TableCell className="font-medium">
                          {record.employee.profile.full_name || 'Unnamed'}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {format(clockInDate, 'MMM d, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(clockInDate, 'EEEE')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono">
                            {format(clockInDate, 'HH:mm')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.clock_out_time ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono">
                              {format(parseISO(record.clock_out_time), 'HH:mm')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <BreakMinutesCell breaks={record.breaks} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {calculateDuration(record.clock_in_time, record.clock_out_time)}
                      </TableCell>
                      <TableCell>
                        {isActive ? (
                          <Badge variant="default" className="bg-green-500">
                            {t('clock.active')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {t('clock.completed')}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BreakMinutesCell({ breaks }: { breaks?: ClockBreak[] }) {
  if (!breaks || breaks.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  let totalMinutes = 0
  for (const b of breaks) {
    if (b.end_time) {
      totalMinutes += differenceInMinutes(parseISO(b.end_time), parseISO(b.start_time))
    }
  }

  if (totalMinutes === 0 && breaks.some(b => !b.end_time)) {
    return (
      <Badge variant="outline" className="text-orange-500 border-orange-500">
        <Coffee className="h-3 w-3 mr-1" />
        Active
      </Badge>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="font-mono text-sm cursor-help">
            {totalMinutes}m
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {breaks.map((b, i) => (
            <div key={b.id} className="text-xs">
              Break {i + 1}: {format(parseISO(b.start_time), 'HH:mm')}
              {b.end_time ? ` - ${format(parseISO(b.end_time), 'HH:mm')}` : ' (active)'}
            </div>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
