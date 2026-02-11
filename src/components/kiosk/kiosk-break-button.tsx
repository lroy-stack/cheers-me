'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Coffee, Loader2 } from 'lucide-react'
import type { ClockBreak } from '@/types'

interface KioskBreakButtonProps {
  employeeId: string
  clockRecordId: string
  isOnBreak: boolean
  breakStartTime?: string
  onBreakStart: (breakRecord: ClockBreak) => void
  onBreakEnd: () => void
}

export function KioskBreakButton({
  employeeId,
  clockRecordId,
  isOnBreak,
  breakStartTime,
  onBreakStart,
  onBreakEnd,
}: KioskBreakButtonProps) {
  const t = useTranslations('kiosk')
  const [loading, setLoading] = useState(false)
  const [breakDuration, setBreakDuration] = useState('')

  // Live break duration
  useEffect(() => {
    if (!isOnBreak || !breakStartTime) {
      setBreakDuration('')
      return
    }

    const timer = setInterval(() => {
      const start = new Date(breakStartTime).getTime()
      const now = Date.now()
      const mins = Math.floor((now - start) / 60000)
      const secs = Math.floor(((now - start) % 60000) / 1000)
      setBreakDuration(`${mins}:${secs.toString().padStart(2, '0')}`)
    }, 1000)

    return () => clearInterval(timer)
  }, [isOnBreak, breakStartTime])

  async function handleBreak() {
    setLoading(true)
    try {
      const res = await fetch('/api/public/kiosk/break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          clock_record_id: clockRecordId,
          action: isOnBreak ? 'end' : 'start',
        }),
      })

      if (!res.ok) throw new Error('Break action failed')

      const data = await res.json()

      if (isOnBreak) {
        onBreakEnd()
      } else {
        onBreakStart(data.break_record)
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={isOnBreak ? 'default' : 'outline'}
      size="lg"
      className="w-full h-14 text-lg relative"
      onClick={handleBreak}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
      ) : (
        <Coffee className="h-5 w-5 mr-2" />
      )}
      {isOnBreak ? t('endBreak') : t('startBreak')}
      {isOnBreak && breakDuration && (
        <Badge variant="secondary" className="ml-2 font-mono">
          {breakDuration}
        </Badge>
      )}
    </Button>
  )
}
