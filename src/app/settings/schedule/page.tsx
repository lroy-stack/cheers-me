'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useRestaurantSettings } from '@/hooks/use-restaurant-settings'
import { Loader2, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

type ShiftTemplate = {
  label: string
  start: string
  end: string
  break: number
  secondStart?: string
  secondEnd?: string
}

export default function ScheduleSettingsPage() {
  const t = useTranslations('settings.scheduleSettings')
  const { settings, loading, saving, updateSetting } = useRestaurantSettings()
  const { toast } = useToast()

  // Local state
  const [templates, setTemplates] = useState<Record<string, ShiftTemplate>>({})
  const [constraints, setConstraints] = useState(settings.labor_constraints)
  const [hours, setHours] = useState(settings.restaurant_hours)
  const [printGroups, setPrintGroups] = useState(settings.print_groups)
  const [initialized, setInitialized] = useState(false)

  // Sync local state when settings load
  useEffect(() => {
    if (!loading && !initialized) {
      setTemplates(settings.shift_templates)
      setConstraints(settings.labor_constraints)
      setHours(settings.restaurant_hours)
      setPrintGroups(settings.print_groups)
      setInitialized(true)
    }
  }, [loading, initialized, settings])

  const handleSave = async (key: string, value: unknown, label: string) => {
    const ok = await updateSetting(key, value)
    toast({
      title: ok ? t('saved') : t('saveFailed'),
      description: ok ? `${label} updated` : `Failed to save ${label}`,
      variant: ok ? 'default' : 'destructive',
    })
  }

  const updateTemplate = (key: string, field: keyof ShiftTemplate, value: string | number) => {
    setTemplates(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }

  const removeTemplate = (key: string) => {
    setTemplates(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const addTemplate = () => {
    // Find next available letter
    const existing = Object.keys(templates)
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    const next = letters.find(l => !existing.includes(l)) || `X${existing.length}`
    setTemplates(prev => ({
      ...prev,
      [next]: { label: 'New Shift', start: '09:00', end: '17:00', break: 30 },
    }))
  }

  const toggleDay = (day: number) => {
    setHours(prev => ({
      ...prev,
      daysOpen: prev.daysOpen.includes(day)
        ? prev.daysOpen.filter(d => d !== day)
        : [...prev.daysOpen, day].sort((a, b) => a - b),
    }))
  }

  const ALL_ROLES = ['admin', 'manager', 'kitchen', 'bar', 'waiter', 'dj', 'owner']

  const toggleRoleInGroup = (group: string, role: string) => {
    setPrintGroups(prev => {
      const current = prev[group] || []
      return {
        ...prev,
        [group]: current.includes(role)
          ? current.filter(r => r !== role)
          : [...current, role],
      }
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {/* Shift Templates (editable) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('shiftTemplates')}</CardTitle>
          <CardDescription>{t('shiftTemplatesDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Header */}
          <div className="hidden md:grid md:grid-cols-[60px_1fr_90px_90px_80px_90px_90px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Key</span>
            <span>{t('label')}</span>
            <span>{t('start')}</span>
            <span>{t('end')}</span>
            <span>{t('breakMin')}</span>
            <span>{t('secondStart')}</span>
            <span>{t('secondEnd')}</span>
            <span></span>
          </div>

          {Object.entries(templates).map(([key, tmpl]) => (
            <div key={key} className="grid grid-cols-2 md:grid-cols-[60px_1fr_90px_90px_80px_90px_90px_40px] gap-2 items-center p-2 rounded-md border">
              <div className="font-bold text-lg text-center">{key}</div>
              <Input
                value={tmpl.label}
                onChange={(e) => updateTemplate(key, 'label', e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                type="time"
                value={tmpl.start}
                onChange={(e) => updateTemplate(key, 'start', e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                type="time"
                value={tmpl.end}
                onChange={(e) => updateTemplate(key, 'end', e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                type="number"
                value={tmpl.break}
                onChange={(e) => updateTemplate(key, 'break', Number(e.target.value))}
                className="h-8 text-sm"
                min={0}
              />
              <Input
                type="time"
                value={tmpl.secondStart || ''}
                onChange={(e) => updateTemplate(key, 'secondStart', e.target.value)}
                className="h-8 text-sm"
                placeholder="—"
              />
              <Input
                type="time"
                value={tmpl.secondEnd || ''}
                onChange={(e) => updateTemplate(key, 'secondEnd', e.target.value)}
                className="h-8 text-sm"
                placeholder="—"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeTemplate(key)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addTemplate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addTemplate')}
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave('shift_templates', templates, 'Shift templates')}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t('saveTemplates')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Labor Constraints */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('laborConstraints')}</CardTitle>
          <CardDescription>{t('laborConstraintsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('maxWeeklyHours')}</Label>
              <Input
                type="number"
                value={constraints.maxWeeklyHours}
                onChange={(e) => setConstraints({ ...constraints, maxWeeklyHours: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('minRestBetweenShifts')}</Label>
              <Input
                type="number"
                value={constraints.minRestBetweenShifts}
                onChange={(e) => setConstraints({ ...constraints, minRestBetweenShifts: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('minDaysOffPerWeek')}</Label>
              <Input
                type="number"
                value={constraints.minDaysOffPerWeek}
                onChange={(e) => setConstraints({ ...constraints, minDaysOffPerWeek: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('overtimeWarningThreshold')}</Label>
              <Input
                type="number"
                value={constraints.overtimeWarningThreshold}
                onChange={(e) => setConstraints({ ...constraints, overtimeWarningThreshold: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('overtimeMultiplier')}</Label>
              <Input
                type="number"
                step="0.1"
                value={constraints.overtimeMultiplier}
                onChange={(e) => setConstraints({ ...constraints, overtimeMultiplier: Number(e.target.value) })}
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleSave('labor_constraints', constraints, 'Labor constraints')}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t('saveConstraints')}
          </Button>
        </CardContent>
      </Card>

      {/* Restaurant Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('restaurantHours')}</CardTitle>
          <CardDescription>{t('restaurantHoursDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('openingTime')}</Label>
              <Input
                type="time"
                value={hours.opening}
                onChange={(e) => setHours({ ...hours, opening: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('closingTime')}</Label>
              <Input
                type="time"
                value={hours.closing}
                onChange={(e) => setHours({ ...hours, closing: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('daysOpen')}</Label>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <label key={day} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={hours.daysOpen.includes(day)}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  <span className="text-sm">{t(`dayNames.${day}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => handleSave('restaurant_hours', hours, 'Restaurant hours')}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t('saveHours')}
          </Button>
        </CardContent>
      </Card>

      {/* Print Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('printGroups')}</CardTitle>
          <CardDescription>{t('printGroupsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(printGroups).map(([group, roles]) => (
            <div key={group} className="space-y-2 p-3 rounded-md border">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-sm font-bold capitalize">{group}</Badge>
              </div>
              <div className="flex flex-wrap gap-3">
                {ALL_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={roles.includes(role)}
                      onCheckedChange={() => toggleRoleInGroup(group, role)}
                    />
                    <span className="text-sm capitalize">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <Button
            size="sm"
            onClick={() => handleSave('print_groups', printGroups, 'Print groups')}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t('savePrintGroups')}
          </Button>
        </CardContent>
      </Card>

      <Toaster />
    </div>
  )
}
