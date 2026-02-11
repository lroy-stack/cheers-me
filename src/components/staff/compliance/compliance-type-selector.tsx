'use client'

import { useState } from 'react'
import { ComplianceFichaType, ComplianceFichaCategory } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { COMPLIANCE_CATEGORY_COLORS } from '@/lib/utils/task-colors'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import {
  Droplets,
  Thermometer,
  ShieldAlert,
  Package,
  Bug,
  Wrench,
  AlertTriangle,
  GraduationCap,
  FileText,
  Download,
  FileSpreadsheet,
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  ld: Droplets,
  appcc: Thermometer,
  prl: ShieldAlert,
  receiving: Package,
  pest_control: Bug,
  maintenance: Wrench,
  incident: AlertTriangle,
  training: GraduationCap,
  other: FileText,
}

const CATEGORIES: ComplianceFichaCategory[] = [
  'ld', 'appcc', 'prl', 'receiving', 'pest_control', 'maintenance', 'incident', 'training',
]

const FREQUENCY_COLORS: Record<string, string> = {
  daily: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  weekly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  monthly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  per_event: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  on_demand: 'bg-muted text-muted-foreground dark:bg-muted/30 dark:text-muted-foreground',
}

const DOWNLOAD_LANGUAGES = [
  { code: 'en', flag: '\u{1F1EC}\u{1F1E7}', label: 'EN' },
  { code: 'es', flag: '\u{1F1EA}\u{1F1F8}', label: 'ES' },
  { code: 'nl', flag: '\u{1F1F3}\u{1F1F1}', label: 'NL' },
  { code: 'de', flag: '\u{1F1E9}\u{1F1EA}', label: 'DE' },
]

interface ComplianceTypeSelectorProps {
  types: ComplianceFichaType[]
  loading: boolean
  onSelect: (type: ComplianceFichaType) => void
  onDownloadTemplate?: (type: ComplianceFichaType, format: 'pdf' | 'xlsx', lang: string) => void
  locale?: string
}

export function ComplianceTypeSelector({
  types,
  loading,
  onSelect,
  onDownloadTemplate,
  locale = 'en',
}: ComplianceTypeSelectorProps) {
  const t = useTranslations('staff.compliance')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [downloadPopover, setDownloadPopover] = useState<{
    open: boolean
    type: ComplianceFichaType | null
    format: 'pdf' | 'xlsx'
  }>({ open: false, type: null, format: 'pdf' })

  const getLocalizedName = (type: ComplianceFichaType) => {
    const key = `name_${locale}` as keyof ComplianceFichaType
    return (type[key] as string) || type.name_en
  }

  const getLocalizedDesc = (type: ComplianceFichaType) => {
    const key = `description_${locale}` as keyof ComplianceFichaType
    return (type[key] as string) || type.description_en || ''
  }

  const filtered = activeCategory === 'all'
    ? types
    : types.filter((t) => t.category === activeCategory)

  const handleLangSelect = (lang: string) => {
    if (downloadPopover.type && onDownloadTemplate) {
      onDownloadTemplate(downloadPopover.type, downloadPopover.format, lang)
    }
    setDownloadPopover({ open: false, type: null, format: 'pdf' })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">
            {t('allCategories')}
          </TabsTrigger>
          {CATEGORIES.map((cat) => {
            const count = types.filter((t) => t.category === cat).length
            if (count === 0) return null
            const Icon = CATEGORY_ICONS[cat]
            return (
              <TabsTrigger key={cat} value={cat} className="text-xs gap-1">
                <Icon className="h-3.5 w-3.5" />
                {t(`categories.${cat}`)}
                <span className="text-muted-foreground">({count})</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((type) => {
              const Icon = CATEGORY_ICONS[type.category] || FileText
              const catColors = COMPLIANCE_CATEGORY_COLORS[type.category]
              const freqClass = FREQUENCY_COLORS[type.frequency || ''] || ''

              return (
                <Card
                  key={type.id}
                  className="group cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
                  onClick={() => onSelect(type)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn('p-1.5 rounded-md', catColors?.bg)}>
                          <Icon className={cn('h-4 w-4', catColors?.text)} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            {getLocalizedName(type)}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {type.code}
                          </div>
                        </div>
                      </div>
                      {onDownloadTemplate && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Popover
                            open={downloadPopover.open && downloadPopover.type?.id === type.id && downloadPopover.format === 'pdf'}
                            onOpenChange={(open) => {
                              if (open) {
                                setDownloadPopover({ open: true, type, format: 'pdf' })
                              } else {
                                setDownloadPopover({ open: false, type: null, format: 'pdf' })
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                title={t('downloadBlankPdf')}
                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                }}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-2"
                              align="end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="text-xs text-muted-foreground mb-1.5 px-1">{t('selectLanguage')}</p>
                              <div className="flex gap-1">
                                {DOWNLOAD_LANGUAGES.map((lang) => (
                                  <button
                                    key={lang.code}
                                    type="button"
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-accent transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleLangSelect(lang.code)
                                    }}
                                  >
                                    <span className="text-base">{lang.flag}</span>
                                    <span>{lang.label}</span>
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>

                          <Popover
                            open={downloadPopover.open && downloadPopover.type?.id === type.id && downloadPopover.format === 'xlsx'}
                            onOpenChange={(open) => {
                              if (open) {
                                setDownloadPopover({ open: true, type, format: 'xlsx' })
                              } else {
                                setDownloadPopover({ open: false, type: null, format: 'pdf' })
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                title={t('downloadBlankExcel')}
                                className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-muted-foreground hover:text-green-600 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                }}
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-2"
                              align="end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="text-xs text-muted-foreground mb-1.5 px-1">{t('selectLanguage')}</p>
                              <div className="flex gap-1">
                                {DOWNLOAD_LANGUAGES.map((lang) => (
                                  <button
                                    key={lang.code}
                                    type="button"
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-accent transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleLangSelect(lang.code)
                                    }}
                                  >
                                    <span className="text-base">{lang.flag}</span>
                                    <span>{lang.label}</span>
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>

                    {getLocalizedDesc(type) && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {getLocalizedDesc(type)}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={cn('text-xs', catColors?.bg, catColors?.text, 'border-0')}>
                        {t(`categories.${type.category}`)}
                      </Badge>
                      {type.frequency && (
                        <Badge variant="secondary" className={cn('text-xs', freqClass, 'border-0')}>
                          {t(`frequency.${type.frequency}`)}
                        </Badge>
                      )}
                    </div>

                    {type.legal_basis && (
                      <p className="text-xs text-muted-foreground italic truncate" title={type.legal_basis}>
                        {type.legal_basis}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>{t('noTypes')}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
