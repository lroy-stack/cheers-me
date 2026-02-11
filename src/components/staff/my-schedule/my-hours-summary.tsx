'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInMinutes,
  parseISO,
  isWithinInterval,
} from 'date-fns'
import { Clock, Timer } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface MyHoursSummaryProps {
  employeeId: string
}

interface ClockRecord {
  id: string
  employee_id: string
  clock_in: string
  clock_out: string | null
  created_at: string
}

export function MyHoursSummary({ employeeId }: MyHoursSummaryProps) {
  const t = useTranslations('staff.mySchedule')
  const [records, setRecords] = useState<ClockRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/staff/clock?employee_id=${employeeId}`)
        if (res.ok) {
          const data = await res.json()
          setRecords(Array.isArray(data) ? data : data.records || [])
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchRecords()
  }, [employeeId])

  const { weekMinutes, monthMinutes } = useMemo(() => {
    const now = new Date()
    const weekInterval = {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    }
    const monthInterval = {
      start: startOfMonth(now),
      end: endOfMonth(now),
    }

    let weekMin = 0
    let monthMin = 0

    for (const record of records) {
      if (!record.clock_out) continue
      const clockIn = parseISO(record.clock_in)
      const clockOut = parseISO(record.clock_out)
      const mins = differenceInMinutes(clockOut, clockIn)

      if (isWithinInterval(clockIn, weekInterval)) {
        weekMin += mins
      }
      if (isWithinInterval(clockIn, monthInterval)) {
        monthMin += mins
      }
    }

    return { weekMinutes: weekMin, monthMinutes: monthMin }
  }, [records])

  const formatTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return t('hoursFormat', { hours, minutes })
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900/40 p-3">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('thisWeek')}</p>
              <p className="text-2xl font-bold">{formatTime(weekMinutes)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-100 dark:bg-purple-900/40 p-3">
              <Timer className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('thisMonth')}</p>
              <p className="text-2xl font-bold">{formatTime(monthMinutes)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {records.length === 0 && (
        <p className="text-center text-muted-foreground py-4">{t('noClockRecords')}</p>
      )}

      <div className="flex justify-end">
        <Button variant="link" asChild>
          <Link href="/staff/clock">{t('viewClockHistory')} →</Link>
        </Button>
      </div>
    </div>
  )
}
