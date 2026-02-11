'use client'

import { useState, useMemo } from 'react'
import { useTrainingTest } from '@/hooks/use-training-tests'
import { useTranslations } from 'next-intl'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle2, XCircle, RotateCcw, Download, ChevronLeft, ChevronRight, Trophy } from 'lucide-react'

interface TrainingTestProps {
  guideCode: string | null
  guideName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  lang: string
  onCompleted?: () => void
}

export function TrainingTest({
  guideCode,
  guideName,
  open,
  onOpenChange,
  lang,
  onCompleted,
}: TrainingTestProps) {
  const t = useTranslations('resources')
  const { questions, loading, error, submitting, result, submitTest, reset, refetch } =
    useTrainingTest(open ? guideCode : null, lang)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)

  const handleSelect = (questionId: string, optionIndex: number) => {
    if (result) return
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
  }

  const handleSubmit = async () => {
    const testResult = await submitTest(answers)
    if (testResult) {
      onCompleted?.()
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setCurrentQuestion(0)
    reset()
    refetch()
  }

  const handleClose = (o: boolean) => {
    if (!o) {
      setAnswers({})
      setCurrentQuestion(0)
      reset()
    }
    onOpenChange(o)
  }

  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length
  const progressPercent = questions.length > 0
    ? Math.round((Object.keys(answers).length / questions.length) * 100)
    : 0

  const currentQ = questions[currentQuestion]

  // Failed sections (for review suggestion)
  const failedSectionHint = useMemo(() => {
    if (!result || result.passed) return ''
    const failedIndices = result.results
      .filter((r) => !r.isCorrect)
      .map((r) => {
        const qIdx = questions.findIndex((q) => q.id === r.questionId)
        return qIdx + 1
      })
    return failedIndices.join(', ')
  }, [result, questions])

  const handleDownloadCertificate = () => {
    if (!guideCode) return
    const a = document.createElement('a')
    a.href = `/api/staff/training/certificate/${guideCode}?lang=${lang}`
    a.download = `certificate-${guideCode}-${lang}.pdf`
    a.click()
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <SheetHeader>
              <SheetTitle>{t('training.takeTest')}</SheetTitle>
              <SheetDescription>{guideName}</SheetDescription>
            </SheetHeader>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="text-center py-12 text-red-500">
                <p>{error}</p>
              </div>
            )}

            {!loading && questions.length === 0 && !error && (
              <div className="text-center py-12 text-muted-foreground">
                <p>{t('training.noTestsAvailable')}</p>
              </div>
            )}

            {/* Progress bar */}
            {questions.length > 0 && !result && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('course.questionsOf', { current: currentQuestion + 1, total: questions.length })}</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Result Banner — Passed */}
            {result && result.passed && (
              <div className="rounded-lg p-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center space-y-4">
                <Trophy className="h-12 w-12 text-green-600 mx-auto" />
                <div>
                  <p className="font-semibold text-xl text-green-800 dark:text-green-300">
                    {t('course.congratulations')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('training.testScore')}: {result.score}% ({result.correctAnswers}/{result.totalQuestions})
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('course.certificateReady')}
                </p>
                <Button onClick={handleDownloadCertificate} className="gap-2">
                  <Download className="h-4 w-4" />
                  {t('course.downloadCertificate')}
                </Button>
              </div>
            )}

            {/* Result Banner — Failed */}
            {result && !result.passed && (
              <div className="rounded-lg p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="font-semibold text-lg">
                      {t('training.testFailed')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('training.testScore')}: {result.score}% ({result.correctAnswers}/{result.totalQuestions})
                    </p>
                    {failedSectionHint && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('course.reviewSections', { sections: failedSectionHint })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            {!result && questions.length > 0 && currentQuestion === 0 && Object.keys(answers).length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('training.testInstructions')}
              </p>
            )}

            {/* Paginated Question View */}
            {currentQ && !result && (
              <div className="space-y-4">
                <Separator />
                <p className="font-medium text-sm">
                  {t('training.question')} {currentQuestion + 1}: {currentQ.question}
                </p>
                <div className="space-y-2">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = answers[currentQ.id] === optIdx

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelect(currentQ.id, optIdx)}
                        className={`w-full text-left border rounded-lg p-3 cursor-pointer transition-colors text-sm ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary' : 'border-muted-foreground/30'}`}>
                            {isSelected && (
                              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                            )}
                          </div>
                          <span>{opt.text}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Review mode after result (show all questions) */}
            {result && !result.passed && questions.map((q, qIdx) => {
              const questionResult = result.results.find((r) => r.questionId === q.id)

              return (
                <div key={q.id} className="space-y-3">
                  <Separator />
                  <p className="font-medium text-sm">
                    {t('training.question')} {qIdx + 1}: {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = answers[q.id] === optIdx
                      const isCorrectAnswer = questionResult?.correctIndex === optIdx
                      const isWrongSelection = questionResult && isSelected && !questionResult.isCorrect

                      let optionClass = 'border rounded-lg p-3 text-sm'
                      if (isCorrectAnswer) {
                        optionClass += ' border-green-500 bg-green-50 dark:bg-green-950/20'
                      } else if (isWrongSelection) {
                        optionClass += ' border-red-500 bg-red-50 dark:bg-red-950/20'
                      } else {
                        optionClass += ' border-muted opacity-50'
                      }

                      return (
                        <div key={optIdx} className={optionClass}>
                          <div className="flex items-center gap-3">
                            <span>{opt.text}</span>
                            {isCorrectAnswer && <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto shrink-0" />}
                            {isWrongSelection && <XCircle className="h-4 w-4 text-red-600 ml-auto shrink-0" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {questionResult?.explanation && (
                    <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                      <strong>{t('training.explanation')}:</strong> {questionResult.explanation}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Navigation + Submit */}
            {questions.length > 0 && !result && (
              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestion === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex-1">
                  {currentQuestion === questions.length - 1 ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={!allAnswered || submitting}
                      className="w-full"
                    >
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('training.submitTest')}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestion((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="w-full"
                      disabled={answers[currentQ?.id] === undefined}
                    >
                      <ChevronRight className="h-4 w-4 mr-1" />
                      {t('course.questionsOf', { current: currentQuestion + 2, total: questions.length })}
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentQuestion((prev) => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentQuestion >= questions.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Retry button after failure */}
            {result && !result.passed && (
              <div className="flex gap-3 pt-4">
                <Button onClick={handleRetry} variant="outline" className="flex-1">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t('training.retakeTest')}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
