import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guideCode: string }> }
) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { guideCode } = await params
  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang') || 'en'

  const supabase = await createClient()

  const { data: questions, error } = await supabase
    .from('training_test_questions')
    .select('id, guide_code, language, question, options, explanation, sort_order')
    .eq('guide_code', guideCode)
    .eq('language', lang)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Strip the 'correct' field from options so client can't cheat
  const safeQuestions = (questions || []).map((q) => ({
    ...q,
    options: (q.options as Array<{ text: string; correct: boolean }>).map(
      ({ text }) => ({ text })
    ),
  }))

  return NextResponse.json(safeQuestions)
}
