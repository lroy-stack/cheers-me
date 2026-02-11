'use client'

import { ComplianceRecordWithDetails } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { COMPLIANCE_STATUS_COLORS, COMPLIANCE_CATEGORY_COLORS } from '@/lib/utils/task-colors'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { FileText, Eye, Download } from 'lucide-react'

interface ComplianceRecordListProps {
  records: ComplianceRecordWithDetails[]
  loading: boolean
  onView: (record: ComplianceRecordWithDetails) => void
  onExportPDF: (record: ComplianceRecordWithDetails) => void
  locale?: string
}

export function ComplianceRecordList({
  records,
  loading,
  onView,
  onExportPDF,
  locale = 'en',
}: ComplianceRecordListProps) {
  const t = useTranslations('staff.compliance')

  const getTypeName = (record: ComplianceRecordWithDetails) => {
    if (!record.ficha_type) return record.ficha_type_code
    const key = `name_${locale}` as keyof typeof record.ficha_type
    return (record.ficha_type[key] as string) || record.ficha_type.name_en
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">
          {t('noRecords')}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('noRecordsDesc')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {records.map((record) => {
        const statusColors = COMPLIANCE_STATUS_COLORS[record.status]
        const catColors = COMPLIANCE_CATEGORY_COLORS[record.ficha_type?.category || 'other']

        return (
          <Card
            key={record.id}
            className="cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => onView(record)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">
                      {record.ficha_type_code}
                    </span>
                    <span className="font-medium text-sm truncate">
                      {getTypeName(record)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn('text-xs', catColors?.bg, catColors?.text, 'border-0')}>
                      {t(`categories.${record.ficha_type?.category || 'other'}`)}
                    </Badge>
                    <Badge className={cn('text-xs', statusColors?.bg, statusColors?.text, 'border-0')}>
                      {t(`status.${record.status}`)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(record.recorded_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {t('fields.recordedBy')}: {record.recorded_by_employee?.profile?.full_name || '—'}
                    {record.notes && (
                      <span className="ml-2 italic">— {record.notes.substring(0, 60)}{record.notes.length > 60 ? '...' : ''}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => { e.stopPropagation(); onView(record) }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => { e.stopPropagation(); onExportPDF(record) }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
