'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft } from 'lucide-react'
import type { KioskEmployeeStatus, ClockOutSummary } from '@/types'
import { KioskClockInButton } from './kiosk-clock-in-button'
import { KioskBreakButton } from './kiosk-break-button'
import { KioskClockOutButton } from './kiosk-clock-out-button'
import { motion } from 'framer-motion'

interface KioskDashboardProps {
  employeeStatus: KioskEmployeeStatus
  onBack: () => void
  onClockOut: (summary: ClockOutSummary) => void
  onStatusUpdate: (status: KioskEmployeeStatus) => void
}

const AUTO_LOCK_SECONDS = 10

export function KioskDashboard({
  employeeStatus,
  onBack,
  onClockOut,
  onStatusUpdate,
}: KioskDashboardProps) {
  const t = useTranslations('kiosk')
  const [lockCountdown, setLockCountdown] = useState(AUTO_LOCK_SECONDS)
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [weekHours, setWeekHours] = useState<number | null>(null)
  const [monthHours, setMonthHours] = useState<number | null>(null)

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch accumulated hours
  useEffect(() => {
    const fetchHours = async () => {
      try {
        const response = await fetch(
          `/api/public/kiosk/accumulated-hours?employee_id=${employeeStatus.employee_id}`
        )
        if (response.ok) {
          const data = await response.json()
          setWeekHours(data.weekHours)
          setMonthHours(data.monthHours)
        }
      } catch (error) {
        console.error('Failed to fetch accumulated hours:', error)
      }
    }
    fetchHours()
  }, [employeeStatus.employee_id])

  // Auto-lock timer
  const resetLockTimer = useCallback(() => {
    setLockCountdown(AUTO_LOCK_SECONDS)
  }, [])

  useEffect(() => {
    lockTimerRef.current = setInterval(() => {
      setLockCountdown(prev => {
        if (prev <= 1) {
          onBack()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (lockTimerRef.current) clearInterval(lockTimerRef.current)
    }
  }, [onBack])

  // Calculate working duration
  function formatDuration(startISO: string): string {
    const start = new Date(startISO).getTime()
    const now = currentTime.getTime()
    const totalSec = Math.floor((now - start) / 1000)
    const hours = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const statusColor = {
    not_clocked_in: 'secondary',
    working: 'default',
    on_break: 'outline',
  } as const

  const statusLabel = {
    not_clocked_in: t('notClockedIn'),
    working: t('working'),
    on_break: t('onBreak'),
  }

  const initials = employeeStatus.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <motion.div
      className="w-full max-w-lg mx-auto px-6 py-8 flex flex-col items-center"
      onPointerDown={resetLockTimer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Auto-lock bar */}
      <motion.div
        className="w-full mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
          <span>{t('autoLockIn', { seconds: lockCountdown })}</span>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('back')}
          </Button>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-1000 ease-linear"
            style={{ width: `${(lockCountdown / AUTO_LOCK_SECONDS) * 100}%` }}
          />
        </div>
      </motion.div>

      {/* Employee info */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Avatar className="h-20 w-20 mb-4">
          <AvatarImage src={employeeStatus.avatar_url ?? undefined} />
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>
      </motion.div>

      <motion.h2
        className="text-2xl font-bold mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {t('welcome', { name: employeeStatus.full_name.split(' ')[0] })}
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <Badge variant={statusColor[employeeStatus.status]} className="mb-6 text-base px-4 py-1">
          {statusLabel[employeeStatus.status]}
        </Badge>
      </motion.div>

      {/* Accumulated hours */}
      {(weekHours !== null || monthHours !== null) && (
        <motion.div
          className="flex gap-4 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          {weekHours !== null && (
            <div className="flex-1 bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase">{t('hoursThisWeek')}</p>
              <p className="text-2xl font-bold font-mono text-primary">{weekHours}h</p>
            </div>
          )}
          {monthHours !== null && (
            <div className="flex-1 bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase">{t('hoursThisMonth')}</p>
              <p className="text-2xl font-bold font-mono text-primary">{monthHours}h</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Working timer */}
      {employeeStatus.clock_in_time && (
        <motion.div
          className="text-center mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <p className="text-sm text-muted-foreground">
            {t('workedTime', { duration: formatDuration(employeeStatus.clock_in_time) })}
          </p>
          {employeeStatus.status === 'on_break' && employeeStatus.break_start_time && (
            <p className="text-sm text-destructive mt-1">
              {t('breakTime', { duration: formatDuration(employeeStatus.break_start_time) })}
            </p>
          )}
        </motion.div>
      )}

      {/* Scheduled shift info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        {employeeStatus.today_shift ? (
          <p className="text-sm text-muted-foreground mb-6">
            {t('scheduledShift', {
              start: employeeStatus.today_shift.start_time,
              end: employeeStatus.today_shift.end_time,
            })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mb-6">
            {t('noShiftScheduled')}
          </p>
        )}
      </motion.div>

      {/* Action buttons */}
      <motion.div
        className="w-full space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
      >
        {employeeStatus.status === 'not_clocked_in' && (
          <KioskClockInButton
            employeeId={employeeStatus.employee_id}
            onClockIn={(clockRecord, shift) => {
              onStatusUpdate({
                ...employeeStatus,
                status: 'working',
                clock_record_id: clockRecord.id,
                clock_in_time: clockRecord.clock_in_time,
                today_shift: shift ?? employeeStatus.today_shift,
              })
            }}
          />
        )}

        {employeeStatus.status === 'working' && employeeStatus.clock_record_id && (
          <>
            <KioskBreakButton
              employeeId={employeeStatus.employee_id}
              clockRecordId={employeeStatus.clock_record_id}
              isOnBreak={false}
              onBreakStart={(breakRecord) => {
                onStatusUpdate({
                  ...employeeStatus,
                  status: 'on_break',
                  active_break_id: breakRecord.id,
                  break_start_time: breakRecord.start_time,
                })
              }}
              onBreakEnd={() => {}}
            />
            <KioskClockOutButton
              employeeId={employeeStatus.employee_id}
              clockRecordId={employeeStatus.clock_record_id}
              onClockOut={onClockOut}
            />
          </>
        )}

        {employeeStatus.status === 'on_break' && employeeStatus.clock_record_id && (
          <>
            <KioskBreakButton
              employeeId={employeeStatus.employee_id}
              clockRecordId={employeeStatus.clock_record_id}
              isOnBreak={true}
              breakStartTime={employeeStatus.break_start_time}
              onBreakStart={() => {}}
              onBreakEnd={() => {
                onStatusUpdate({
                  ...employeeStatus,
                  status: 'working',
                  active_break_id: undefined,
                  break_start_time: undefined,
                })
              }}
            />
            <KioskClockOutButton
              employeeId={employeeStatus.employee_id}
              clockRecordId={employeeStatus.clock_record_id}
              onClockOut={onClockOut}
            />
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
