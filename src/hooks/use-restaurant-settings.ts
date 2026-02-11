'use client'

import { useCallback, useEffect, useState } from 'react'

export interface RestaurantSettings {
  shift_templates: Record<string, {
    label: string
    start: string
    end: string
    break: number
    secondStart?: string
    secondEnd?: string
  }>
  labor_constraints: {
    maxWeeklyHours: number
    minRestBetweenShifts: number
    minDaysOffPerWeek: number
    overtimeMultiplier: number
    overtimeWarningThreshold: number
  }
  print_groups: Record<string, string[]>
  restaurant_hours: {
    opening: string
    closing: string
    daysOpen: number[]
  }
  company_fiscal?: {
    razon_social: string
    cif: string
    direccion: string
    codigo_postal: string
    ciudad: string
    provincia: string
    pais: string
    telefono: string
    email: string
  }
}

const DEFAULT_SETTINGS: RestaurantSettings = {
  shift_templates: {
    M: { label: 'Morning', start: '10:00', end: '17:00', break: 30 },
    T: { label: 'Afternoon', start: '17:00', end: '00:00', break: 30 },
    N: { label: 'Night', start: '20:00', end: '03:00', break: 15 },
    P: { label: 'Split', start: '10:00', end: '14:00', break: 0, secondStart: '18:00', secondEnd: '22:00' },
    D: { label: 'Day Off', start: '', end: '', break: 0 },
  },
  labor_constraints: {
    maxWeeklyHours: 40,
    minRestBetweenShifts: 12,
    minDaysOffPerWeek: 2,
    overtimeMultiplier: 1.5,
    overtimeWarningThreshold: 35,
  },
  print_groups: {
    sala: ['waiter', 'bar', 'dj', 'manager', 'admin', 'owner'],
    cocina: ['kitchen'],
  },
  restaurant_hours: {
    opening: '10:00',
    closing: '03:00',
    daysOpen: [1, 2, 3, 4, 5, 6, 0],
  },
}

export function useRestaurantSettings() {
  const [settings, setSettings] = useState<RestaurantSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings/schedule')
      if (res.ok) {
        const data = await res.json()
        setSettings({ ...DEFAULT_SETTINGS, ...data })
      }
    } catch {
      // Use defaults on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSetting = useCallback(async (key: string, value: unknown) => {
    try {
      setSaving(true)
      const res = await fetch('/api/settings/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) {
        await fetchSettings()
      }
      return res.ok
    } catch {
      return false
    } finally {
      setSaving(false)
    }
  }, [fetchSettings])

  return { settings, loading, saving, updateSetting, refetch: fetchSettings }
}
