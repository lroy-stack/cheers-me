'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { LogOut, Loader2 } from 'lucide-react'
import type { ClockOutSummary } from '@/types'

interface KioskClockOutButtonProps {
  employeeId: string
  clockRecordId: string
  onClockOut: (summary: ClockOutSummary) => void
}

export function KioskClockOutButton({
  employeeId,
  clockRecordId,
  onClockOut,
}: KioskClockOutButtonProps) {
  const t = useTranslations('kiosk')
  const [loading, setLoading] = useState(false)

  async function handleClockOut() {
    setLoading(true)
    try {
      const sessionToken = localStorage.getItem('kiosk_session_token')
      const res = await fetch('/api/public/kiosk/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          employee_id: employeeId,
          clock_record_id: clockRecordId,
        }),
      })

      if (!res.ok) throw new Error('Clock-out failed')

      const summary: ClockOutSummary = await res.json()

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])

      onClockOut(summary)
    } catch {
      // User can retry
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="destructive"
      size="lg"
      className="w-full h-14 text-lg"
      onClick={handleClockOut}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
      ) : (
        <LogOut className="h-5 w-5 mr-2" />
      )}
      {t('clockOut')}
    </Button>
  )
}
