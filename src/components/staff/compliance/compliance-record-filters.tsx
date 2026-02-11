'use client'

import { ComplianceFichaCategory, ComplianceFichaType, ComplianceRecordStatus } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'

interface ComplianceFiltersState {
  type_code?: string
  category?: ComplianceFichaCategory
  status?: ComplianceRecordStatus
  date_from?: string
  date_to?: string
}

interface ComplianceRecordFiltersProps {
  filters: ComplianceFiltersState
  onFiltersChange: (filters: ComplianceFiltersState) => void
  types: ComplianceFichaType[]
}

const CATEGORIES: ComplianceFichaCategory[] = [
  'ld', 'appcc', 'prl', 'receiving', 'pest_control', 'maintenance', 'incident', 'training',
]

export function ComplianceRecordFilters({
  filters,
  onFiltersChange,
  types,
}: ComplianceRecordFiltersProps) {
  const t = useTranslations('staff.compliance')

  const filteredTypes = filters.category
    ? types.filter(ty => ty.category === filters.category)
    : types

  const hasFilters = Object.values(filters).some(v => v)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Category */}
      <Select
        value={filters.category || '__all__'}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            category: v === '__all__' ? undefined : v as ComplianceFichaCategory,
            type_code: undefined, // reset type when category changes
          })
        }
      >
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue placeholder={t('filters.allCategories')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('filters.allCategories')}</SelectItem>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {t(`categories.${cat}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type */}
      <Select
        value={filters.type_code || '__all__'}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, type_code: v === '__all__' ? undefined : v })
        }
      >
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue placeholder={t('filters.allTypes')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('filters.allTypes')}</SelectItem>
          {filteredTypes.map((ty) => (
            <SelectItem key={ty.code} value={ty.code}>
              {ty.code} — {ty.name_en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={filters.status || '__all__'}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, status: v === '__all__' ? undefined : v as ComplianceRecordStatus })
        }
      >
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue placeholder={t('filters.allStatuses')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('filters.allStatuses')}</SelectItem>
          <SelectItem value="completed">{t('status.completed')}</SelectItem>
          <SelectItem value="flagged">{t('status.flagged')}</SelectItem>
          <SelectItem value="requires_review">{t('status.requires_review')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Date range */}
      <Input
        type="date"
        value={filters.date_from || ''}
        onChange={(e) => onFiltersChange({ ...filters, date_from: e.target.value || undefined })}
        className="h-9 w-[150px]"
        placeholder={t('filters.dateFrom')}
      />
      <Input
        type="date"
        value={filters.date_to || ''}
        onChange={(e) => onFiltersChange({ ...filters, date_to: e.target.value || undefined })}
        className="h-9 w-[150px]"
        placeholder={t('filters.dateTo')}
      />

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange({})}
          className="h-9"
        >
          <X className="mr-1 h-4 w-4" />
          {t('filters.clear')}
        </Button>
      )}
    </div>
  )
}
