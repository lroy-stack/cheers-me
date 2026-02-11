'use client'

import { useState } from 'react'
import { ComplianceRecordWithDetails, ComplianceFieldDefinition } from '@/types'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { COMPLIANCE_STATUS_COLORS, COMPLIANCE_CATEGORY_COLORS } from '@/lib/utils/task-colors'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { useToast } from '@/hooks/use-toast'
import { Download, CheckCircle2, AlertTriangle, Loader2, Trash2 } from 'lucide-react'

interface ComplianceRecordDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: ComplianceRecordWithDetails | null
  canManage: boolean
  onSuccess: () => void
  onExportPDF: (record: ComplianceRecordWithDetails) => void
  locale?: string
}

export function ComplianceRecordDetail({
  open,
  onOpenChange,
  record,
  canManage,
  onSuccess,
  onExportPDF,
  locale = 'en',
}: ComplianceRecordDetailProps) {
  const t = useTranslations('staff.compliance')
  const { toast } = useToast()
  const [reviewStatus, setReviewStatus] = useState<'completed' | 'flagged'>('completed')
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!record) return null

  const getLabel = (field: ComplianceFieldDefinition) => {
    const key = `label_${locale}` as keyof ComplianceFieldDefinition
    return (field[key] as string) || field.label_en
  }

  const getOptionLabel = (field: ComplianceFieldDefinition, value: string) => {
    const opt = field.options?.find(o => o.value === value)
    if (!opt) return value
    const key = `label_${locale}` as keyof typeof opt
    return (opt[key] as string) || opt.label_en
  }

  const formatValue = (field: ComplianceFieldDefinition, value: unknown): string => {
    if (value === null || value === undefined) return '—'

    switch (field.type) {
      case 'boolean':
        return value ? 'Yes' : 'No'
      case 'select':
        return getOptionLabel(field, value as string)
      case 'multi_select':
        return (value as string[]).map(v => getOptionLabel(field, v)).join(', ')
      case 'temperature':
        return `${value} ${field.unit || '°C'}`
      case 'number':
        return `${value}${field.unit ? ` ${field.unit}` : ''}`
      default:
        return String(value)
    }
  }

  const statusColors = COMPLIANCE_STATUS_COLORS[record.status]
  const catColors = COMPLIANCE_CATEGORY_COLORS[record.ficha_type?.category || 'other']

  const handleReview = async () => {
    setReviewing(true)
    try {
      const res = await fetch(`/api/staff/compliance/${record.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewStatus,
          review_notes: reviewNotes || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to review')

      toast({ title: t('review.reviewed') })
      setReviewNotes('')
      onSuccess()
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    } finally {
      setReviewing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/staff/compliance/${record.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast({ title: t('recordDeleted') })
      onOpenChange(false)
      onSuccess()
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn('text-xs', catColors?.bg, catColors?.text, 'border-0')}>
              {record.ficha_type_code}
            </Badge>
            <Badge className={cn('text-xs', statusColors?.bg, statusColors?.text, 'border-0')}>
              {t(`status.${record.status}`)}
            </Badge>
          </div>
          <SheetTitle>
            {record.ficha_type
              ? (record.ficha_type[`name_${locale}` as keyof typeof record.ficha_type] as string) || record.ficha_type.name_en
              : record.ficha_type_code}
          </SheetTitle>
          <SheetDescription>
            {format(new Date(record.recorded_at), 'dd/MM/yyyy HH:mm')} — {record.recorded_by_employee?.profile?.full_name || '—'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Legal basis */}
          {record.ficha_type?.legal_basis && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-3 text-xs text-blue-700 dark:text-blue-300">
              <span className="font-medium">{t('fields.legalBasis')}:</span> {record.ficha_type.legal_basis}
            </div>
          )}

          {/* Field values */}
          <div className="space-y-3">
            {record.ficha_type?.fields_schema.map((field) => {
              const value = record.values[field.key]
              const formatted = formatValue(field, value)
              const isBoolTrue = field.type === 'boolean' && value === true
              const isBoolFalse = field.type === 'boolean' && value === false

              return (
                <div key={field.key} className="flex justify-between items-start gap-2 py-1">
                  <span className="text-sm text-muted-foreground shrink-0">
                    {getLabel(field)}
                  </span>
                  <span className={cn(
                    'text-sm text-right font-medium',
                    isBoolTrue && 'text-green-600',
                    isBoolFalse && 'text-red-600',
                  )}>
                    {isBoolTrue && <CheckCircle2 className="inline h-4 w-4 mr-1" />}
                    {isBoolFalse && <AlertTriangle className="inline h-4 w-4 mr-1" />}
                    {formatted}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Notes */}
          {record.notes && (
            <>
              <Separator />
              <div>
                <Label className="text-muted-foreground text-xs">{t('fields.notes')}</Label>
                <p className="text-sm mt-1">{record.notes}</p>
              </div>
            </>
          )}

          {/* Review info */}
          {record.reviewed_by && (
            <>
              <Separator />
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">{t('review.title')}</Label>
                <p className="text-sm">
                  {record.reviewer?.full_name || '—'} — {record.reviewed_at ? format(new Date(record.reviewed_at), 'dd/MM/yyyy HH:mm') : ''}
                </p>
                {record.review_notes && <p className="text-sm italic">{record.review_notes}</p>}
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onExportPDF(record)}>
              <Download className="mr-2 h-4 w-4" />
              {t('exportPdf')}
            </Button>
            {canManage && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Review form (for managers, if not yet reviewed) */}
          {canManage && !record.reviewed_by && (
            <>
              <Separator />
              <div className="space-y-3 rounded-md border p-3">
                <Label className="font-medium">{t('review.title')}</Label>
                <Select value={reviewStatus} onValueChange={(v) => setReviewStatus(v as 'completed' | 'flagged')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">{t('review.approve')}</SelectItem>
                    <SelectItem value="flagged">{t('review.flag')}</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={t('review.addNotes')}
                  rows={2}
                />
                <Button onClick={handleReview} disabled={reviewing} className="w-full">
                  {reviewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('review.submit')}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
