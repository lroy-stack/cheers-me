'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, LogIn, LogOut, Loader2, Coffee } from 'lucide-react'
import { ClockInOut } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

interface ClockInOutCardProps {
  employeeId: string
  onClockChange?: () => void
}

export function ClockInOutCard({ employeeId, onClockChange }: ClockInOutCardProps) {
  const [currentClock, setCurrentClock] = useState<ClockInOut | null>(null)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const { toast } = useToast()
  const t = useTranslations('staff')

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch current clock status
  useEffect(() => {
    fetchCurrentClock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  async function fetchCurrentClock() {
    try {
      const res = await fetch(`/api/staff/clock?employee_id=${employeeId}`)
      if (!res.ok) throw new Error('Failed to fetch clock status')

      const data = await res.json()
      // Find the record without clock_out_time
      const activeClock = data.find((record: ClockInOut & { breaks?: { end_time: string | null }[] }) => !record.clock_out_time)
      setCurrentClock(activeClock || null)
      // Check if there's an active break from the kiosk
      if (activeClock?.breaks) {
        const activeBreak = (activeClock.breaks as { end_time: string | null }[]).some((b: { end_time: string | null }) => !b.end_time)
        setIsOnBreak(activeBreak)
      } else {
        setIsOnBreak(false)
      }
    } catch (error) {
      console.error('Error fetching clock status:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleClockIn() {
    setActionLoading(true)
    try {
      const res = await fetch('/api/staff/clock?action=in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to clock in')
      }

      const newClock = await res.json()
      setCurrentClock(newClock)
      onClockChange?.()

      toast({
        title: 'Clocked In',
        description: `Successfully clocked in at ${format(new Date(), 'HH:mm')}`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clock in',
      })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleClockOut() {
    if (!currentClock) return

    setActionLoading(true)
    try {
      const res = await fetch('/api/staff/clock?action=out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clock_record_id: currentClock.id }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to clock out')
      }

      setCurrentClock(null)
      onClockChange?.()

      toast({
        title: 'Clocked Out',
        description: `Successfully clocked out at ${format(new Date(), 'HH:mm')}`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clock out',
      })
    } finally {
      setActionLoading(false)
    }
  }

  function calculateDuration(clockInTime: string): string {
    const start = new Date(clockInTime)
    const duration = currentTime.getTime() - start.getTime()
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((duration % (1000 * 60)) / 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('clock.title')}
            </CardTitle>
            <CardDescription>
              {currentClock ? t('clock.currentlyWorking') : t('clock.subtitle')}
            </CardDescription>
          </div>
          {currentClock && (
            <div className="flex gap-2">
              {isOnBreak && (
                <Badge variant="outline" className="text-orange-500 border-orange-500">
                  <Coffee className="h-3 w-3 mr-1" />
                  {t('clock.breakTime')}
                </Badge>
              )}
              <Badge variant="default" className="bg-green-500">
                {t('clock.active')}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Time */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">{t('clock.currentTime')}</p>
          <p className="text-3xl font-bold font-mono">
            {format(currentTime, 'HH:mm:ss')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Clock Status */}
        {currentClock ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('clock.clockedInAt')}</span>
                <span className="font-medium">
                  {format(new Date(currentClock.clock_in_time), 'HH:mm')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('clock.duration')}</span>
                <span className="font-mono font-bold text-lg text-green-600">
                  {calculateDuration(currentClock.clock_in_time)}
                </span>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {t('clock.started')} {formatDistanceToNow(new Date(currentClock.clock_in_time), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Clock Out Button */}
            <Button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="w-full"
              size="lg"
              variant="destructive"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('clock.clockingOut')}
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('clock.clockOut')}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-muted-foreground/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('clock.notClockedIn')}
              </p>
            </div>

            {/* Clock In Button */}
            <Button
              onClick={handleClockIn}
              disabled={actionLoading}
              className="w-full"
              size="lg"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('clock.clockingIn')}
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  {t('clock.clockIn')}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
