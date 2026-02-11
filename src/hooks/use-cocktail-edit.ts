'use client'

import useSWR from 'swr'
import { useCallback, useState } from 'react'
import type { CocktailMenuItem } from '@/components/menu/cocktail-card'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface IngredientInput {
  name: string
  quantity: number
  unit: string
  cost_per_unit?: number
  product_id?: string
  is_garnish?: boolean
  is_optional?: boolean
  sort_order?: number
}

interface StepInput {
  step_number: number
  instruction_en: string
  instruction_nl?: string
  instruction_es?: string
  instruction_de?: string
  duration_seconds?: number
  tip?: string
}

export function useCocktailEdit(cocktailId: string) {
  const { data, error, isLoading, mutate } = useSWR<CocktailMenuItem>(
    cocktailId ? `/api/menu/cocktails/${cocktailId}` : null,
    fetcher
  )
  const [saving, setSaving] = useState(false)

  const updateMetadata = useCallback(async (updates: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/menu/cocktails/${cocktailId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update metadata')
      const updated = await res.json()
      mutate(updated, false)
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    } finally {
      setSaving(false)
    }
  }, [cocktailId, mutate])

  const updateIngredients = useCallback(async (ingredients: IngredientInput[]) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/menu/cocktails/${cocktailId}/ingredients`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients }),
      })
      if (!res.ok) throw new Error('Failed to update ingredients')
      mutate()
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    } finally {
      setSaving(false)
    }
  }, [cocktailId, mutate])

  const updateSteps = useCallback(async (steps: StepInput[]) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/menu/cocktails/${cocktailId}/steps`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps }),
      })
      if (!res.ok) throw new Error('Failed to update steps')
      mutate()
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    } finally {
      setSaving(false)
    }
  }, [cocktailId, mutate])

  return {
    cocktail: data,
    error,
    isLoading,
    saving,
    mutate,
    updateMetadata,
    updateIngredients,
    updateSteps,
  }
}
