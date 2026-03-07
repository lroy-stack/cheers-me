'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Loader2, ArrowLeft, CalendarX, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'

interface HolidayClosure {
  id: string
  date: string
  name: string
  is_all_day: boolean
  start_time: string | null
  end_time: string | null
}

export default function HolidaysPage() {
  const t = useTranslations('settings.holidays')
  const { toast } = useToast()
  const [closures, setClosures] = useState<HolidayClosure[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [adding, setAdding] = useState(false)
  const [newClosure, setNewClosure] = useState({
    date: '',
    name: '',
    is_all_day: true,
    start_time: '',
    end_time: '',
  })

  const fetchClosures = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/settings/holiday-closures?year=${year}`)
      const data = await res.json()
      setClosures(Array.isArray(data) ? data : [])
    } catch {
      setClosures([])
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchClosures()
  }, [fetchClosures])

  const handleAdd = async () => {
    if (!newClosure.date || !newClosure.name) return
    setAdding(true)
    try {
      const res = await fetch('/api/settings/holiday-closures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newClosure.date,
          name: newClosure.name,
          is_all_day: newClosure.is_all_day,
          start_time: newClosure.is_all_day ? null : newClosure.start_time || null,
          end_time: newClosure.is_all_day ? null : newClosure.end_time || null,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: t('added') })
      setNewClosure({ date: '', name: '', is_all_day: true, start_time: '', end_time: '' })
      fetchClosures()
    } catch {
      toast({ title: t('error'), variant: 'destructive' })
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/holiday-closures?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: t('deleted') })
      setClosures((prev) => prev.filter((c) => c.id !== id))
    } catch {
      toast({ title: t('deleteError'), variant: 'destructive' })
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('backToSettings')}
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <CalendarX className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <Label>{t('year')}</Label>
        <Input
          type="number"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
          className="w-28"
        />
      </div>

      {/* Add new closure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('addClosure')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('date')}</Label>
              <Input
                type="date"
                value={newClosure.date}
                onChange={(e) => setNewClosure((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('name')}</Label>
              <Input
                placeholder={t('namePlaceholder')}
                value={newClosure.name}
                onChange={(e) => setNewClosure((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="allDay"
              checked={newClosure.is_all_day}
              onCheckedChange={(val) => setNewClosure((p) => ({ ...p, is_all_day: val }))}
            />
            <Label htmlFor="allDay">{t('allDay')}</Label>
          </div>

          {!newClosure.is_all_day && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('startTime')}</Label>
                <Input
                  type="time"
                  value={newClosure.start_time}
                  onChange={(e) => setNewClosure((p) => ({ ...p, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('endTime')}</Label>
                <Input
                  type="time"
                  value={newClosure.end_time}
                  onChange={(e) => setNewClosure((p) => ({ ...p, end_time: e.target.value }))}
                />
              </div>
            </div>
          )}

          <Button onClick={handleAdd} disabled={adding || !newClosure.date || !newClosure.name}>
            {adding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('adding')}
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                {t('add')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Closures list */}
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{year}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : closures.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">{t('noClosures')}</p>
          ) : (
            <div className="space-y-2">
              {closures.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(c.date + 'T00:00:00'), 'EEEE, d MMMM yyyy')}
                      {!c.is_all_day && c.start_time && c.end_time && (
                        <span className="ml-2">
                          {c.start_time} – {c.end_time}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Toaster />
    </div>
  )
}
