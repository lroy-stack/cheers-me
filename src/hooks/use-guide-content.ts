'use client'

import { useEffect, useState, useCallback } from 'react'
import type { GuideContent } from '@/types'

export function useGuideContent(guideCode: string | null, lang: string = 'en') {
  const [content, setContent] = useState<GuideContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchContent = useCallback(async () => {
    if (!guideCode) {
      setContent(null)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/staff/training/guide-content/${guideCode}?lang=${lang}`)
      if (!res.ok) throw new Error('Failed to fetch guide content')
      const data = await res.json()
      setContent(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [guideCode, lang])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  return { content, loading, error, refetch: fetchContent }
}
