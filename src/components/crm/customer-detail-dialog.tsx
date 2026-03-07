'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Loader2, AlertTriangle, Tag, X, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

const ALLERGENS = [
  'gluten','crustaceans','eggs','fish','peanuts','soybeans',
  'milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs',
] as const
type Allergen = typeof ALLERGENS[number]

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  visit_count: number
  vip: boolean
  preferences: string | null
  notes: string | null
}

interface CustomerDetailDialogProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

export function CustomerDetailDialog({ customer, open, onOpenChange, onUpdated }: CustomerDetailDialogProps) {
  const t = useTranslations('customers')
  const { toast } = useToast()

  const [allergens, setAllergens] = useState<Allergen[]>([])
  const [tags, setTags] = useState<Array<{ id: string; tag: string }>>([])
  const [loadingAllergens, setLoadingAllergens] = useState(false)
  const [loadingTags, setLoadingTags] = useState(false)
  const [savingAllergens, setSavingAllergens] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)

  const fetchAllergens = useCallback(async () => {
    if (!customer) return
    setLoadingAllergens(true)
    try {
      const res = await fetch(`/api/crm/customers/${customer.id}/allergies`)
      const data = await res.json()
      setAllergens(data.allergens || [])
    } catch {
      setAllergens([])
    } finally {
      setLoadingAllergens(false)
    }
  }, [customer])

  const fetchTags = useCallback(async () => {
    if (!customer) return
    setLoadingTags(true)
    try {
      const res = await fetch(`/api/crm/customers/${customer.id}/tags`)
      const data = await res.json()
      setTags(Array.isArray(data) ? data : [])
    } catch {
      setTags([])
    } finally {
      setLoadingTags(false)
    }
  }, [customer])

  useEffect(() => {
    if (open && customer) {
      fetchAllergens()
      fetchTags()
    }
  }, [open, customer, fetchAllergens, fetchTags])

  const toggleAllergen = (code: Allergen) => {
    setAllergens((prev) =>
      prev.includes(code) ? prev.filter((a) => a !== code) : [...prev, code]
    )
  }

  const saveAllergens = async () => {
    if (!customer) return
    setSavingAllergens(true)
    try {
      const res = await fetch(`/api/crm/customers/${customer.id}/allergies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergens }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: t('allergies.saved') })
      onUpdated?.()
    } catch {
      toast({ title: t('allergies.error'), variant: 'destructive' })
    } finally {
      setSavingAllergens(false)
    }
  }

  const addTag = async () => {
    if (!customer || !newTag.trim()) return
    setAddingTag(true)
    try {
      const res = await fetch(`/api/crm/customers/${customer.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: newTag.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: t('tags.added') })
      setNewTag('')
      fetchTags()
      onUpdated?.()
    } catch {
      toast({ title: t('tags.error'), variant: 'destructive' })
    } finally {
      setAddingTag(false)
    }
  }

  const removeTag = async (tag: string) => {
    if (!customer) return
    try {
      const res = await fetch(
        `/api/crm/customers/${customer.id}/tags?tag=${encodeURIComponent(tag)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Failed')
      toast({ title: t('tags.removed') })
      fetchTags()
      onUpdated?.()
    } catch {
      toast({ title: t('tags.error'), variant: 'destructive' })
    }
  }

  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer.name}</DialogTitle>
          <DialogDescription>
            {customer.email} • {customer.visit_count} visits
            {customer.vip && <Badge className="ml-2" variant="secondary">VIP</Badge>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Allergens section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h3 className="font-semibold text-sm">{t('allergies.title')}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{t('allergies.subtitle')}</p>

            {loadingAllergens ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {ALLERGENS.map((code) => (
                  <div key={code} className="flex items-center gap-2">
                    <Checkbox
                      id={`allergen-${code}`}
                      checked={allergens.includes(code)}
                      onCheckedChange={() => toggleAllergen(code)}
                    />
                    <Label htmlFor={`allergen-${code}`} className="text-sm cursor-pointer">
                      {t(`allergies.${code}` as Parameters<typeof t>[0])}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            <Button
              size="sm"
              onClick={saveAllergens}
              disabled={savingAllergens || loadingAllergens}
            >
              {savingAllergens ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  {t('allergies.saving')}
                </>
              ) : (
                t('allergies.save')
              )}
            </Button>
          </div>

          <Separator />

          {/* Tags section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">{t('tags.title')}</h3>
            </div>

            {loadingTags ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Badge key={t.id} variant="secondary" className="gap-1">
                    {t.tag}
                    <button
                      onClick={() => removeTag(t.tag)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <p className="text-xs text-muted-foreground">No tags yet</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder={t('tags.placeholder')}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 h-8 text-sm"
              />
              <Button size="sm" onClick={addTag} disabled={addingTag || !newTag.trim()}>
                {addingTag ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
