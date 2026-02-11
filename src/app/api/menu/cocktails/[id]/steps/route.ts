import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

interface StepInput {
  step_number: number
  instruction_en: string
  instruction_nl?: string
  instruction_es?: string
  instruction_de?: string
  duration_seconds?: number
  tip?: string
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner', 'bar'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const body = await request.json()
  const { steps } = body as { steps: StepInput[] }

  if (!Array.isArray(steps)) {
    return NextResponse.json({ error: 'steps must be an array' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify recipe exists
  const { data: recipe, error: recipeError } = await supabase
    .from('cocktail_recipes')
    .select('id')
    .eq('id', id)
    .single()

  if (recipeError || !recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }

  // Delete existing steps
  const { error: deleteError } = await supabase
    .from('cocktail_preparation_steps')
    .delete()
    .eq('recipe_id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  if (steps.length === 0) {
    return NextResponse.json({ success: true, steps: [] })
  }

  const rows = steps.map((step, idx) => ({
    recipe_id: id,
    step_number: step.step_number ?? idx + 1,
    instruction_en: step.instruction_en,
    instruction_nl: step.instruction_nl || null,
    instruction_es: step.instruction_es || null,
    instruction_de: step.instruction_de || null,
    duration_seconds: step.duration_seconds || null,
    tip: step.tip || null,
  }))

  const { data, error: insertError } = await supabase
    .from('cocktail_preparation_steps')
    .insert(rows)
    .select()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, steps: data })
}
