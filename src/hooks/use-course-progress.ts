'use client'

import { useCallback, useMemo } from 'react'
import { useTrainingRecords } from './use-training-records'
import type { CourseProgress, GuideContent } from '@/types'

export function useCourseProgress(guideCode: string | null, content: GuideContent | null) {
  const { records } = useTrainingRecords(guideCode || undefined)

  const progress: CourseProgress | null = useMemo(() => {
    if (!guideCode || !content) return null

    const totalSections = content.sections.length
    const sectionViewedRecords = records.filter(
      (r) => r.action === 'section_viewed' && r.guide_code === guideCode
    )

    // Extract viewed section indices from metadata
    const viewedSet = new Set<number>()
    for (const r of sectionViewedRecords) {
      const idx = (r.metadata as Record<string, unknown>)?.sectionIndex
      if (typeof idx === 'number') viewedSet.add(idx)
    }

    const testPassedRecord = records.find(
      (r) => r.action === 'test_passed' && r.guide_code === guideCode
    )

    // Find last viewed section
    const sortedViewed = [...viewedSet].sort((a, b) => b - a)
    const lastViewedSection = sortedViewed[0] ?? -1

    return {
      guideCode,
      totalSections,
      viewedSections: viewedSet.size,
      testPassed: !!testPassedRecord,
      testScore: testPassedRecord?.score ?? null,
      lastViewedSection,
    }
  }, [guideCode, content, records])

  const recordSectionView = useCallback(async (sectionIndex: number, language: string) => {
    if (!guideCode) return
    try {
      await fetch('/api/staff/training/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guide_code: guideCode,
          action: 'section_viewed',
          language,
          metadata: { sectionIndex },
        }),
      })
    } catch {
      // Silent fail
    }
  }, [guideCode])

  return { progress, recordSectionView }
}
