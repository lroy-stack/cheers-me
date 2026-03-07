'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Bell } from 'lucide-react'
import Link from 'next/link'

const NOTIFICATION_TYPES = [
  'shift_reminder',
  'schedule_change',
  'leave_approved',
  'leave_rejected',
  'task_assigned',
  'training_due',
  'stock_alert',
  'reservation_new',
  'reservation_cancelled',
  'birthday_alert',
] as const

const CHANNELS = ['in_app', 'email'] as const

type NotifType = typeof NOTIFICATION_TYPES[number]
type Channel = typeof CHANNELS[number]
type Prefs = Record<NotifType, Record<Channel, boolean>>

const fetcher = (url: string) => fetch(url).then(r => r.json())

const typeToI18nKey: Record<NotifType, string> = {
  shift_reminder: 'typeShiftReminder',
  schedule_change: 'typeScheduleChange',
  leave_approved: 'typeLeaveApproved',
  leave_rejected: 'typeLeaveRejected',
  task_assigned: 'typeTaskAssigned',
  training_due: 'typeTrainingDue',
  stock_alert: 'typeStockAlert',
  reservation_new: 'typeReservationNew',
  reservation_cancelled: 'typeReservationCancelled',
  birthday_alert: 'typeBirthdayAlert',
}

export default function NotificationsSettingsPage() {
  const t = useTranslations('settings.notifications')
  const [saving, setSaving] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const { data, isLoading } = useSWR<{ preferences: Prefs }>('/api/settings/notifications', fetcher)
  const prefs = data?.preferences ?? ({} as Prefs)

  async function toggle(type: NotifType, channel: Channel, enabled: boolean) {
    const key = `${type}:${channel}`
    setSaving(key)
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, channel, enabled }),
      })
      if (res.ok) {
        await mutate('/api/settings/notifications')
        setToastMsg(t('saved'))
      } else {
        setToastMsg(t('saveError'))
      }
    } catch {
      setToastMsg(t('saveError'))
    } finally {
      setSaving(null)
      setTimeout(() => setToastMsg(null), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="min-h-[44px] min-w-[44px]">
              <Link href="/settings">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
                <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm">
          {toastMsg}
        </div>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left font-semibold text-foreground pb-3 w-full">Notification</th>
                      {CHANNELS.map(ch => (
                        <th key={ch} className="text-center font-semibold text-foreground pb-3 px-4 whitespace-nowrap">
                          {t(`channel${ch === 'in_app' ? 'InApp' : 'Email'}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {NOTIFICATION_TYPES.map(type => {
                      const labelKey = typeToI18nKey[type]
                      const descKey = `${labelKey}Desc`
                      return (
                        <tr key={type} className="py-3">
                          <td className="py-4 pr-4">
                            <div className="font-medium text-foreground">{t(labelKey as Parameters<typeof t>[0])}</div>
                            <div className="text-sm text-muted-foreground">{t(descKey as Parameters<typeof t>[0])}</div>
                          </td>
                          {CHANNELS.map(ch => {
                            const enabled = prefs[type]?.[ch] ?? true
                            const key = `${type}:${ch}`
                            return (
                              <td key={ch} className="text-center px-4 py-4">
                                <Switch
                                  checked={enabled}
                                  disabled={saving === key}
                                  onCheckedChange={(val) => toggle(type, ch, val)}
                                  aria-label={`${t(labelKey as Parameters<typeof t>[0])} ${t(`channel${ch === 'in_app' ? 'InApp' : 'Email'}`)}`}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
