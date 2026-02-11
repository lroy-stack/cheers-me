'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { GUIDES } from '@/lib/data/resource-guides'
import type { TrainingRecord } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Award } from 'lucide-react'

interface EmployeeCertificationsProps {
  employeeId: string
  employeeName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmployeeCertifications({
  employeeId,
  employeeName,
  open,
  onOpenChange,
}: EmployeeCertificationsProps) {
  const t = useTranslations('resources')
  const locale = useLocale()
  const [records, setRecords] = useState<TrainingRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !employeeId) return

    const fetchRecords = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/staff/training/records/${employeeId}`)
        if (res.ok) {
          const data = await res.json()
          setRecords(data)
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [open, employeeId])

  // Deduplicate: keep most recent test_passed per guide_code
  const uniqueRecords = records.reduce<TrainingRecord[]>((acc, r) => {
    if (!acc.find((a) => a.guide_code === r.guide_code)) {
      acc.push(r)
    }
    return acc
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {t('training.employeeCertifications')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{employeeName}</p>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Loading...
          </div>
        ) : uniqueRecords.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Award className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{t('training.noCertificatesForEmployee')}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {uniqueRecords.map((record) => {
              const guide = GUIDES.find((g) => g.code === record.guide_code)
              if (!guide) return null

              const completedDate = new Date(record.created_at).toLocaleDateString(
                locale === 'es' ? 'es-ES' : locale === 'nl' ? 'nl-NL' : locale === 'de' ? 'de-DE' : 'en-US',
                { year: 'numeric', month: 'short', day: 'numeric' }
              )

              return (
                <div
                  key={record.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div className="rounded-md bg-green-100 dark:bg-green-900/30 p-1.5 shrink-0">
                    <Award className="h-4 w-4 text-green-700 dark:text-green-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {t(guide.titleKey)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {guide.code}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {completedDate}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {record.score ?? 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
