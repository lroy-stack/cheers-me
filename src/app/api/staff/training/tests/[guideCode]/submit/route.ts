import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const submitSchema = z.object({
  answers: z.record(z.number()),
  language: z.string().length(2).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guideCode: string }> }
) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { guideCode } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = submitSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
  }

  const supabase = await createClient()
  const lang = validation.data.language || 'en'

  // Get employee
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', authResult.data.user.id)
    .single()

  if (!employee) {
    return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
  }

  // Get questions with correct answers
  const { data: questions, error: qError } = await supabase
    .from('training_test_questions')
    .select('id, options, explanation, sort_order')
    .eq('guide_code', guideCode)
    .eq('language', lang)
    .order('sort_order', { ascending: true })

  if (qError || !questions || questions.length === 0) {
    return NextResponse.json({ error: 'No questions found for this guide' }, { status: 404 })
  }

  // Get passing score
  const { data: material } = await supabase
    .from('training_materials')
    .select('passing_score')
    .eq('guide_code', guideCode)
    .single()

  const passingScore = material?.passing_score ?? 70

  // Calculate score
  let correct = 0
  const results = questions.map((q) => {
    const opts = q.options as Array<{ text: string; correct: boolean }>
    const selectedIndex = validation.data.answers[q.id]
    const isCorrect = selectedIndex !== undefined && opts[selectedIndex]?.correct === true
    if (isCorrect) correct++

    const correctIndex = opts.findIndex((o) => o.correct)

    return {
      questionId: q.id,
      selectedIndex,
      isCorrect,
      correctIndex,
      explanation: q.explanation,
    }
  })

  const score = Math.round((correct / questions.length) * 100)
  const passed = score >= passingScore

  // Record test_started, then test result
  await supabase.from('training_records').insert({
    employee_id: employee.id,
    guide_code: guideCode,
    action: 'test_completed',
    language: lang,
    score,
    answers: validation.data.answers,
  })

  await supabase.from('training_records').insert({
    employee_id: employee.id,
    guide_code: guideCode,
    action: passed ? 'test_passed' : 'test_failed',
    language: lang,
    score,
    answers: validation.data.answers,
  })

  // If passed, update any pending assignment
  if (passed) {
    await supabase
      .from('training_assignments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        score,
      })
      .eq('guide_code', guideCode)
      .eq('assigned_to', employee.id)
      .eq('status', 'pending')
  }

  return NextResponse.json({
    score,
    passed,
    passingScore,
    totalQuestions: questions.length,
    correctAnswers: correct,
    results,
  })
}
