'use client'

import { useEffect, useState, useCallback } from 'react'

interface TestQuestion {
  id: string
  guide_code: string
  language: string
  question: string
  options: Array<{ text: string }>
  sort_order: number
}

interface TestResult {
  score: number
  passed: boolean
  passingScore: number
  totalQuestions: number
  correctAnswers: number
  results: Array<{
    questionId: string
    selectedIndex: number
    isCorrect: boolean
    correctIndex: number
    explanation: string | null
  }>
}

export function useTrainingTest(guideCode: string | null, lang: string = 'en') {
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const fetchQuestions = useCallback(async () => {
    if (!guideCode) return
    try {
      setLoading(true)
      setError(null)
      setResult(null)
      const res = await fetch(`/api/staff/training/tests/${guideCode}?lang=${lang}`)
      if (!res.ok) throw new Error('Failed to fetch test questions')
      const data = await res.json()
      setQuestions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [guideCode, lang])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const submitTest = useCallback(async (answers: Record<string, number>) => {
    if (!guideCode) return null
    try {
      setSubmitting(true)
      const res = await fetch(`/api/staff/training/tests/${guideCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, language: lang }),
      })
      if (!res.ok) throw new Error('Failed to submit test')
      const data: TestResult = await res.json()
      setResult(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setSubmitting(false)
    }
  }, [guideCode, lang])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { questions, loading, error, submitting, result, submitTest, reset, refetch: fetchQuestions }
}
