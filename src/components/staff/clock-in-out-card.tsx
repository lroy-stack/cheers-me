'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, LogIn, LogOut, Loader2, Coffee, AlertTriangle } from 'lucide-react'
import { ClockInOut } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

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
  const [showBreakReminder, setShowBreakReminder] = useState(false)
  const { toast } = useToast()
  const t = useTranslations('staff')

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Feature S2.B3: Check mandatory break after 6h (ET Art. 34.4)
  useEffect(() => {
    if (!currentClock) { setShowBreakReminder(false); return }
    const elapsed = currentTime.getTime() - new Date(currentClock.clock_in_time).getTime()
    setShowBreakReminder(elapsed >= SIX_HOURS_MS && !isOnBreak)
  }, [currentTime, currentClock, isOnBreak])

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
      // Feature S2.B1: Capture geolocation on clock-in
      let geoPayload: { latitude?: number; longitude?: number } = {}
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true })
          })
          geoPayload = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
        } catch { /* Geolocation denied — continue without */ }
      }

      const res = await fetch('/api/staff/clock?action=in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geoPayload),
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
        description: newClock.geolocation_warning
          ? `Clocked in at ${format(new Date(), 'HH:mm')} ⚠️ ${newClock.geolocation_warning}`
          : `Successfully clocked in at ${format(new Date(), 'HH:mm')}`,
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

  // Feature S2.B4: Start break
  async function handleStartBreak() {
    if (!currentClock) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/staff/clock/break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clock_record_id: currentClock.id, action: 'start' }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to start break') }
      setIsOnBreak(true)
      toast({ title: 'Break Started', description: `Break started at ${format(new Date(), 'HH:mm')}` })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to start break' })
    } finally { setActionLoading(false) }
  }

  // Feature S2.B4: End break
  async function handleEndBreak() {
    if (!currentClock) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/staff/clock/break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clock_record_id: currentClock.id, action: 'end' }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to end break') }
      setIsOnBreak(false)
      toast({ title: 'Break Ended', description: `Break ended at ${format(new Date(), 'HH:mm')}` })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to end break' })
    } finally { setActionLoading(false) }
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
              <Badge variant="default" className="bg-success/15">
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

        {/* Feature S2.B3: Mandatory break reminder (ET Art. 34.4) */}
        {showBreakReminder && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have worked 6+ hours without a break. Spanish law (ET Art. 34.4) requires a minimum 15-minute break.
            </AlertDescription>
          </Alert>
        )}

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
                <span className="font-mono font-bold text-lg text-success">
                  {calculateDuration(currentClock.clock_in_time)}
                </span>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {t('clock.started')} {formatDistanceToNow(new Date(currentClock.clock_in_time), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Feature S2.B4: Start Break / End Break buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleStartBreak} disabled={actionLoading || isOnBreak} variant="outline" size="sm">
                <Coffee className="mr-2 h-4 w-4" />
                Start Break
              </Button>
              <Button onClick={handleEndBreak} disabled={actionLoading || !isOnBreak} variant="outline" size="sm" className="text-orange-600 border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950">
                <Coffee className="mr-2 h-4 w-4" />
                End Break
              </Button>
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
