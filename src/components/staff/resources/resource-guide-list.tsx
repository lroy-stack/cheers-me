'use client'

import { useTranslations } from 'next-intl'
import type { GuideMetadata } from '@/lib/data/resource-guides'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

export type TrainingStatusMap = Record<string, 'completed' | 'pending' | 'overdue' | null>

interface ResourceGuideListProps {
  guides: GuideMetadata[]
  onSelect: (guide: GuideMetadata) => void
  trainingStatuses?: TrainingStatusMap
}

const roleColors: Record<string, string> = {
  kitchen: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  bar: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  waiter: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  admin: 'bg-muted text-foreground dark:bg-card/30 dark:text-muted-foreground',
  manager: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  owner: 'bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary',
  dj: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
}

export function ResourceGuideList({ guides, onSelect, trainingStatuses }: ResourceGuideListProps) {
  const t = useTranslations('resources')
  const tCommon = useTranslations('common')

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {guides.map((guide) => {
        const status = trainingStatuses?.[guide.code]

        return (
          <Card
            key={guide.code}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30 group"
            onClick={() => onSelect(guide)}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Code badge + status */}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {guide.code}
                    </Badge>
                    {status === 'completed' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {status === 'pending' && (
                      <Clock className="h-4 w-4 text-orange-500" />
                    )}
                    {status === 'overdue' && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-medium text-sm leading-tight line-clamp-2">
                    {t(guide.titleKey)}
                  </h3>

                  {/* Description snippet from summary */}
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {t(`${guide.titleKey.replace('.title', '.summary')}`).split('.')[0] + '.'}
                  </p>

                  {/* Applicable roles */}
                  {guide.applicableRoles.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {guide.applicableRoles.map((role) => (
                        <span
                          key={role}
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[role] || 'bg-muted text-foreground'}`}
                        >
                          {tCommon(`roles.${role}`)}
                        </span>
                      ))}
                    </div>
                  )}

                  {guide.applicableRoles.length === 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {t('allRoles')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Chevron */}
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
