'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useGuideContent } from '@/hooks/use-guide-content'
import { useCourseProgress } from '@/hooks/use-course-progress'
import type { GuideMetadata } from '@/lib/data/resource-guides'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ClipboardCheck,
  Loader2,
} from 'lucide-react'

interface CourseStudyViewProps {
  guide: GuideMetadata | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTakeTest: () => void
}

export function CourseStudyView({
  guide,
  open,
  onOpenChange,
  onTakeTest,
}: CourseStudyViewProps) {
  const t = useTranslations('resources')
  const locale = useLocale()
  const { content, loading } = useGuideContent(open ? guide?.code ?? null : null, locale)
  const { progress, recordSectionView } = useCourseProgress(
    open ? guide?.code ?? null : null,
    content
  )

  const [currentSection, setCurrentSection] = useState(0)
  const [viewedSections, setViewedSections] = useState<Set<number>>(new Set())

  const totalSections = content?.sections?.length || 0
  const progressPercent = totalSections > 0
    ? Math.round(((progress?.viewedSections || 0) + viewedSections.size) / totalSections * 100)
    : 0
  const allRead = totalSections > 0 && (progress?.viewedSections || 0) + viewedSections.size >= totalSections

  const currentSectionData = content?.sections?.[currentSection]

  const handleMarkRead = async () => {
    if (!guide) return
    setViewedSections((prev) => new Set(prev).add(currentSection))
    await recordSectionView(currentSection, locale)
  }

  const handleNext = () => {
    if (currentSection < totalSections - 1) {
      setCurrentSection(currentSection + 1)
    }
  }

  const handlePrev = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
    }
  }

  const isSectionViewed = (idx: number) => {
    return viewedSections.has(idx) || (progress?.viewedSections || 0) > idx
  }

  if (!guide) return null

  return (
    <Sheet open={open} onOpenChange={(o) => {
      if (!o) {
        setCurrentSection(0)
        setViewedSections(new Set())
      }
      onOpenChange(o)
    }}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <SheetHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {guide.code}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {t('course.studyMaterial')}
                </Badge>
              </div>
              <SheetTitle className="text-lg">{t(guide.titleKey)}</SheetTitle>
              <SheetDescription className="sr-only">
                {t('course.courseOverview')}
              </SheetDescription>
            </SheetHeader>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('course.progress')}</span>
                <span>{Math.min(progressPercent, 100)}%</span>
              </div>
              <Progress value={Math.min(progressPercent, 100)} className="h-2" />
            </div>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && content && totalSections > 0 && (
              <>
                {/* Section navigation sidebar */}
                <div className="flex gap-1 flex-wrap">
                  {content.sections.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSection(idx)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        idx === currentSection
                          ? 'bg-primary text-primary-foreground'
                          : isSectionViewed(idx)
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {isSectionViewed(idx) && <CheckCircle2 className="h-3 w-3" />}
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <Separator />

                {/* Section counter */}
                <div className="text-sm text-muted-foreground">
                  {t('course.sectionOf', { current: currentSection + 1, total: totalSections })}
                </div>

                {/* Current section content */}
                {currentSectionData && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">{currentSectionData.heading}</h2>
                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {currentSectionData.content}
                    </div>

                    {/* Subsections */}
                    {currentSectionData.subsections?.map((sub, subIdx) => (
                      <div key={subIdx} className="space-y-2 pl-4 border-l-2 border-muted">
                        <h3 className="text-sm font-medium">{sub.heading}</h3>
                        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {sub.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={currentSection === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('course.sections')}
                  </Button>

                  {!isSectionViewed(currentSection) ? (
                    <Button size="sm" onClick={handleMarkRead}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      {t('course.sectionCompleted')}
                    </Button>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('course.sectionCompleted')}
                    </Badge>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentSection >= totalSections - 1}
                  >
                    {t('course.sections')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                {/* All sections read → Take test CTA */}
                {allRead && (
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 text-center space-y-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
                    <p className="font-medium text-green-800 dark:text-green-300">
                      {t('course.allSectionsRead')}
                    </p>
                    <Button onClick={onTakeTest}>
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      {t('training.takeTest')}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* No sections fallback — show summary from resources.json */}
            {!loading && content && totalSections === 0 && content.summary && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  {t('summary')}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {content.summary}
                </p>
                {content.keyPoints.length > 0 && (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {content.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 mt-1 shrink-0 text-green-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
