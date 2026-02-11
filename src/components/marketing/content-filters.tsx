'use client'

import { ContentFilters as Filters } from '@/types/marketing'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Filter } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ContentFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  showDateRange?: boolean
}

export function ContentFilters({
  filters,
  onFiltersChange,
  showDateRange: _showDateRange = false,
}: ContentFiltersProps) {
  const t = useTranslations('marketing')
  const hasActiveFilters =
    filters.status || filters.platform || filters.language || filters.from || filters.to

  const handleClearFilters = () => {
    onFiltersChange({})
  }

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === 'all' ? undefined : (value as Filters['status']),
    })
  }

  const handlePlatformChange = (value: string) => {
    onFiltersChange({
      ...filters,
      platform: value === 'all' ? undefined : (value as Filters['platform']),
    })
  }

  const handleLanguageChange = (value: string) => {
    onFiltersChange({
      ...filters,
      language: value === 'all' ? undefined : (value as Filters['language']),
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground flex-shrink-0">
            <Filter className="h-4 w-4" />
            <span>{t('filters.label')}</span>
          </div>

          <div className="flex flex-col md:flex-row gap-3 flex-1">
            {/* Status Filter */}
            <div className="flex-1 min-w-[150px]">
              <Select
                value={filters.status || 'all'}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
                  <SelectItem value="draft">{t('contentCalendar.draft')}</SelectItem>
                  <SelectItem value="scheduled">{t('contentCalendar.scheduled')}</SelectItem>
                  <SelectItem value="published">{t('contentCalendar.published')}</SelectItem>
                  <SelectItem value="failed">{t('contentCalendar.failed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Platform Filter */}
            <div className="flex-1 min-w-[150px]">
              <Select
                value={filters.platform || 'all'}
                onValueChange={handlePlatformChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.allPlatforms')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allPlatforms')}</SelectItem>
                  <SelectItem value="instagram">{t('contentCalendar.instagram')}</SelectItem>
                  <SelectItem value="facebook">{t('contentCalendar.facebook')}</SelectItem>
                  <SelectItem value="multi">{t('contentCalendar.multiPlatform')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language Filter */}
            <div className="flex-1 min-w-[150px]">
              <Select
                value={filters.language || 'all'}
                onValueChange={handleLanguageChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.allLanguages')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allLanguages')}</SelectItem>
                  <SelectItem value="nl">🇳🇱 {t('filters.dutchLang')}</SelectItem>
                  <SelectItem value="en">🇬🇧 {t('filters.englishLang')}</SelectItem>
                  <SelectItem value="es">🇪🇸 {t('filters.spanishLang')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="flex-shrink-0"
              >
                <X className="mr-2 h-4 w-4" />
                {t('filters.clear')}
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            <span className="text-xs text-muted-foreground">{t('filters.activeFilters')}</span>
            {filters.status && (
              <Badge variant="secondary" className="text-xs">
                {t('contentCalendar.status')}: {filters.status}
              </Badge>
            )}
            {filters.platform && (
              <Badge variant="secondary" className="text-xs">
                {t('contentCalendar.platform')}: {filters.platform}
              </Badge>
            )}
            {filters.language && (
              <Badge variant="secondary" className="text-xs">
                {t('filters.languageLabel')}: {filters.language.toUpperCase()}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
