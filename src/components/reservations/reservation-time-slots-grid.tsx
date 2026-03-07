'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Plus, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface TimeSlot {
  id?: string
  day_of_week: number
  time_slot: string
  capacity: number
  is_active: boolean
}

type DayGrid = Record<number, TimeSlot[]>

const DEFAULT_TIMES = ['12:00', '13:00', '14:00', '19:00', '20:00', '21:00', '22:00']

export function ReservationTimeSlotsGrid() {
  const t = useTranslations('settings.reservations')
  const { toast } = useToast()
  const [slots, setSlots] = useState<DayGrid>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newTimes, setNewTimes] = useState<Record<number, string>>({})

  const dayLabels: Record<number, string> = {
    0: t('day0'),
    1: t('day1'),
    2: t('day2'),
    3: t('day3'),
    4: t('day4'),
    5: t('day5'),
    6: t('day6'),
  }

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reservations/time-slots')
      if (res.ok) {
        const data: TimeSlot[] = await res.json()
        const grouped: DayGrid = {}
        for (let i = 0; i <= 6; i++) {
          grouped[i] = data.filter((s) => s.day_of_week === i)
        }
        setSlots(grouped)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  function updateSlot(day: number, idx: number, field: keyof TimeSlot, value: number | boolean) {
    setSlots((prev) => {
      const daySlots = [...(prev[day] ?? [])]
      daySlots[idx] = { ...daySlots[idx], [field]: value }
      return { ...prev, [day]: daySlots }
    })
  }

  function removeSlot(day: number, idx: number) {
    setSlots((prev) => {
      const daySlots = [...(prev[day] ?? [])]
      daySlots.splice(idx, 1)
      return { ...prev, [day]: daySlots }
    })
  }

  function addSlot(day: number) {
    const time = newTimes[day] || DEFAULT_TIMES[0]
    if (!time) return
    // Check for duplicate
    const existing = slots[day]?.find((s) => s.time_slot === time)
    if (existing) return
    setSlots((prev) => ({
      ...prev,
      [day]: [...(prev[day] ?? []), { day_of_week: day, time_slot: time, capacity: 4, is_active: true }],
    }))
    setNewTimes((prev) => ({ ...prev, [day]: '' }))
  }

  async function saveAll() {
    setSaving(true)
    try {
      const allSlots: Omit<TimeSlot, 'id'>[] = Object.values(slots)
        .flat()
        .map(({ id: _id, ...rest }) => rest)

      const res = await fetch('/api/reservations/time-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allSlots),
      })

      if (res.ok) {
        toast({ title: t('saved') })
        fetchSlots()
      } else {
        toast({ title: t('saveError'), variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t('timeSlotsTitle')}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t('timeSlotsSubtitle')}</p>
        </div>
        <Button onClick={saveAll} disabled={saving} size="sm">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('saveAll')
          )}
        </Button>
      </div>

      {/* 7-day grid — responsive: 1 col on mobile, 2 on md, 3-4 on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const daySlots = slots[day] ?? []
          return (
            <Card key={day} className="flex flex-col">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">{dayLabels[day]}</CardTitle>
                <CardDescription className="text-xs">{daySlots.length} {daySlots.length === 1 ? 'slot' : 'slots'}</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 flex-1 space-y-2">
                {daySlots.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">{t('noSlots')}</p>
                )}
                {daySlots.map((slot, idx) => (
                  <div key={`${slot.time_slot}-${idx}`} className="flex items-center gap-2 py-1">
                    <span className="text-sm font-mono w-12 shrink-0">{slot.time_slot}</span>
                    <Input
                      type="number"
                      min={0}
                      max={999}
                      value={slot.capacity}
                      onChange={(e) => updateSlot(day, idx, 'capacity', parseInt(e.target.value) || 0)}
                      className="h-7 w-16 text-sm px-2"
                      aria-label={t('capacity')}
                    />
                    <div className="flex items-center gap-1 ml-auto">
                      <Switch
                        checked={slot.is_active}
                        onCheckedChange={(v) => updateSlot(day, idx, 'is_active', v)}
                        className="scale-75"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeSlot(day, idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Add slot */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Input
                    type="time"
                    value={newTimes[day] ?? ''}
                    onChange={(e) => setNewTimes((prev) => ({ ...prev, [day]: e.target.value }))}
                    className="h-7 text-sm px-2 flex-1"
                    step="1800"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => addSlot(day)}
                    disabled={!newTimes[day]}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-primary/20 border border-primary/40" />
          <span>{t('capacity')}: max guests per slot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch className="scale-50 opacity-60" checked={true} />
          <Label className="text-xs">{t('active')}</Label>
        </div>
      </div>
    </div>
  )
}
