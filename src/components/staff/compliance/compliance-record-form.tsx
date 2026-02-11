'use client'

import { useState } from 'react'
import { ComplianceFichaType, ComplianceFieldDefinition, ComplianceRecordStatus } from '@/types'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Loader2, AlertTriangle } from 'lucide-react'
import { COMPLIANCE_CATEGORY_COLORS } from '@/lib/utils/task-colors'

interface ComplianceRecordFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fichaType: ComplianceFichaType | null
  onSuccess: () => void
  locale?: string
}

export function ComplianceRecordForm({
  open,
  onOpenChange,
  fichaType,
  onSuccess,
  locale = 'en',
}: ComplianceRecordFormProps) {
  const t = useTranslations('staff.compliance')
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<ComplianceRecordStatus>('completed')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const getLabel = (field: ComplianceFieldDefinition) => {
    const key = `label_${locale}` as keyof ComplianceFieldDefinition
    return (field[key] as string) || field.label_en
  }

  const getPlaceholder = (field: ComplianceFieldDefinition) => {
    const key = `placeholder_${locale}` as keyof ComplianceFieldDefinition
    return (field[key] as string) || field.placeholder_en || ''
  }

  const getOptionLabel = (opt: { label_en: string; label_es: string; label_nl?: string; label_de?: string }) => {
    const key = `label_${locale}` as keyof typeof opt
    return (opt[key] as string) || opt.label_en
  }

  const updateValue = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const validate = (): boolean => {
    if (!fichaType) return false
    const newErrors: Record<string, string> = {}

    for (const field of fichaType.fields_schema) {
      if (field.required) {
        const val = values[field.key]
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[field.key] = t('form.requiredField')
        }
      }
      // Range validation for number/temperature
      if ((field.type === 'number' || field.type === 'temperature') && values[field.key] !== undefined) {
        const numVal = Number(values[field.key])
        if (field.min != null && numVal < field.min) {
          newErrors[field.key] = t('form.outOfRange')
        }
        if (field.max != null && numVal > field.max) {
          newErrors[field.key] = t('form.outOfRange')
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!fichaType || !validate()) return

    setSaving(true)
    try {
      const res = await fetch('/api/staff/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ficha_type_code: fichaType.code,
          values,
          notes: notes || null,
          status,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create record')
      }

      toast({
        title: t('recordCreated'),
        description: `${fichaType.code} — ${fichaType.name_en}`,
      })

      // Reset form
      setValues({})
      setNotes('')
      setStatus('completed')
      setErrors({})
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const renderField = (field: ComplianceFieldDefinition) => {
    const label = getLabel(field)
    const error = errors[field.key]

    switch (field.type) {
      case 'text':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className={cn(error && 'text-destructive')}>
              {label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              value={(values[field.key] as string) || ''}
              onChange={(e) => updateValue(field.key, e.target.value)}
              placeholder={getPlaceholder(field)}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )

      case 'textarea':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className={cn(error && 'text-destructive')}>
              {label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              value={(values[field.key] as string) || ''}
              onChange={(e) => updateValue(field.key, e.target.value)}
              placeholder={getPlaceholder(field)}
              rows={3}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )

      case 'number':
      case 'temperature':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className={cn(error && 'text-destructive')}>
              {label}
              {field.unit && <span className="text-muted-foreground ml-1">({field.unit})</span>}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step={field.type === 'temperature' ? '0.1' : '1'}
                min={field.min ?? undefined}
                max={field.max ?? undefined}
                value={(values[field.key] as number) ?? ''}
                onChange={(e) => updateValue(field.key, e.target.value ? Number(e.target.value) : null)}
                placeholder={getPlaceholder(field)}
              />
              {field.unit && (
                <span className="text-sm text-muted-foreground font-medium">{field.unit}</span>
              )}
            </div>
            {field.min != null && field.max != null && (
              <p className="text-xs text-muted-foreground">
                Range: {field.min} — {field.max} {field.unit || ''}
              </p>
            )}
            {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{error}</p>}
          </div>
        )

      case 'boolean':
        return (
          <div key={field.key} className="flex items-center justify-between py-2">
            <Label className="cursor-pointer">
              {label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Switch
              checked={!!values[field.key]}
              onCheckedChange={(checked) => updateValue(field.key, checked)}
            />
          </div>
        )

      case 'select':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className={cn(error && 'text-destructive')}>
              {label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={(values[field.key] as string) || ''}
              onValueChange={(v) => updateValue(field.key, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={getPlaceholder(field) || `Select ${label}...`} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {getOptionLabel(opt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )

      case 'multi_select':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className={cn(error && 'text-destructive')}>
              {label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(field.options || []).map((opt) => {
                const selected = ((values[field.key] as string[]) || []).includes(opt.value)
                return (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) => {
                        const current = (values[field.key] as string[]) || []
                        updateValue(
                          field.key,
                          checked
                            ? [...current, opt.value]
                            : current.filter((v) => v !== opt.value)
                        )
                      }}
                    />
                    {getOptionLabel(opt)}
                  </label>
                )
              })}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )

      case 'date':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className={cn(error && 'text-destructive')}>
              {label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              type="date"
              value={(values[field.key] as string) || ''}
              onChange={(e) => updateValue(field.key, e.target.value)}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )

      case 'time':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className={cn(error && 'text-destructive')}>
              {label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              type="time"
              value={(values[field.key] as string) || ''}
              onChange={(e) => updateValue(field.key, e.target.value)}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )

      default:
        return (
          <div key={field.key} className="space-y-1.5">
            <Label>{label}</Label>
            <Input
              value={(values[field.key] as string) || ''}
              onChange={(e) => updateValue(field.key, e.target.value)}
            />
          </div>
        )
    }
  }

  if (!fichaType) return null

  const catColors = COMPLIANCE_CATEGORY_COLORS[fichaType.category]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs', catColors?.bg, catColors?.text, 'border-0')}>
              {fichaType.code}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {t(`categories.${fichaType.category}`)}
            </Badge>
          </div>
          <SheetTitle>{t('form.title')}</SheetTitle>
          <SheetDescription>
            {getLabel(fichaType as unknown as ComplianceFieldDefinition) || fichaType.name_en}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Legal basis */}
          {fichaType.legal_basis && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-3 text-xs text-blue-700 dark:text-blue-300">
              <span className="font-medium">{t('fields.legalBasis')}:</span> {fichaType.legal_basis}
            </div>
          )}

          {/* Dynamic fields */}
          {fichaType.fields_schema.map(renderField)}

          {/* Status */}
          <div className="space-y-1.5">
            <Label>{t('form.status')}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ComplianceRecordStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">{t('status.completed')}</SelectItem>
                <SelectItem value="flagged">{t('status.flagged')}</SelectItem>
                <SelectItem value="requires_review">{t('status.requires_review')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{t('fields.notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('form.notesPlaceholder')}
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={saving}
            >
              {t('form.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('form.submitRecord')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
