'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Loader2, ArrowLeft, CalendarCheck } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface ReservationSettings {
  id: string
  max_party_size: number
  buffer_minutes: number
  auto_confirm: boolean
}

export default function ReservationSettingsPage() {
  const t = useTranslations('settings.reservations')
  const { toast } = useToast()
  const [settings, setSettings] = useState<ReservationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/reservations/settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch('/api/reservations/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_party_size: settings.max_party_size,
          buffer_minutes: settings.buffer_minutes,
          auto_confirm: settings.auto_confirm,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: t('saved') })
    } catch {
      toast({ title: t('error'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('backToSettings')}
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <CalendarCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max Party Size */}
          <div className="space-y-2">
            <Label htmlFor="maxPartySize">{t('maxPartySize')}</Label>
            <Input
              id="maxPartySize"
              type="number"
              min={1}
              max={100}
              value={settings?.max_party_size ?? 20}
              onChange={(e) =>
                setSettings((prev) =>
                  prev ? { ...prev, max_party_size: parseInt(e.target.value) || 1 } : prev
                )
              }
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">{t('maxPartySizeHint')}</p>
          </div>

          {/* Buffer Minutes */}
          <div className="space-y-2">
            <Label htmlFor="bufferMinutes">{t('bufferMinutes')}</Label>
            <Input
              id="bufferMinutes"
              type="number"
              min={0}
              max={120}
              value={settings?.buffer_minutes ?? 15}
              onChange={(e) =>
                setSettings((prev) =>
                  prev ? { ...prev, buffer_minutes: parseInt(e.target.value) || 0 } : prev
                )
              }
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">{t('bufferMinutesHint')}</p>
          </div>

          {/* Auto Confirm */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">{t('autoConfirm')}</Label>
              <p className="text-xs text-muted-foreground">{t('autoConfirmHint')}</p>
            </div>
            <Switch
              checked={settings?.auto_confirm ?? false}
              onCheckedChange={(val) =>
                setSettings((prev) => (prev ? { ...prev, auto_confirm: val } : prev))
              }
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('saveSettings')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Toaster />
    </div>
  )
}
