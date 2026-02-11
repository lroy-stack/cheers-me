'use client'

import { useTranslations } from 'next-intl'
import type { GuideMetadata } from '@/lib/data/resource-guides'
import type { TrainingAssignment } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  Download,
} from 'lucide-react'
import type { TrainingStatusMap } from './resource-guide-list'

interface CourseCardProps {
  guide: GuideMetadata
  assignment?: TrainingAssignment
  trainingStatus?: TrainingStatusMap[string]
  onSelect: (guide: GuideMetadata) => void
}

export function CourseCard({ guide, assignment, trainingStatus, onSelect }: CourseCardProps) {
  const t = useTranslations('resources')
  // Determine status
  const status = trainingStatus || 'not_started'
  const isCompleted = status === 'completed'
  const isOverdue = status === 'overdue' || assignment?.status === 'overdue'
  const isPending = status === 'pending'

  // Status badge
  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t('course.testPassed')}
        </Badge>
      )
    }
    if (isOverdue) {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-0">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {t('training.statusOverdue')}
        </Badge>
      )
    }
    if (isPending) {
      return (
        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-0">
          <Clock className="h-3 w-3 mr-1" />
          {t('course.inProgress')}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs">
        <BookOpen className="h-3 w-3 mr-1" />
        {t('course.notStarted')}
      </Badge>
    )
  }

  // CTA button
  const getCTA = () => {
    if (isCompleted) {
      return (
        <Button size="sm" variant="outline" onClick={() => onSelect(guide)}>
          <Download className="h-4 w-4 mr-1" />
          {t('course.downloadCertificate')}
        </Button>
      )
    }
    if (isPending) {
      return (
        <Button size="sm" onClick={() => onSelect(guide)}>
          <ArrowRight className="h-4 w-4 mr-1" />
          {t('course.continueCourse')}
        </Button>
      )
    }
    return (
      <Button size="sm" onClick={() => onSelect(guide)}>
        <Play className="h-4 w-4 mr-1" />
        {t('course.startCourse')}
      </Button>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(guide)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono text-xs shrink-0">
                {guide.code}
              </Badge>
              {getStatusBadge()}
            </div>
            <h3 className="font-medium text-sm line-clamp-2">
              {t(guide.titleKey)}
            </h3>
          </div>
        </div>

        {/* Due date if exists */}
        {assignment?.due_date && !isCompleted && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {t('course.dueDate')}: {new Date(assignment.due_date).toLocaleDateString()}
          </div>
        )}

        {/* CTA */}
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          {getCTA()}
        </div>
      </CardContent>
    </Card>
  )
}
