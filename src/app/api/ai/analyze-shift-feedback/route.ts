import { createAdminClient } from '@/lib/supabase/server'
import { chat } from '@/lib/ai/claude'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  survey_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().optional(),
  anomaly_type: z.string().optional(),
  anomaly_reason: z.string().optional(),
  anomaly_comment: z.string().optional(),
  worked_minutes: z.number().optional(),
  variance_minutes: z.number().optional(),
  break_variance_minutes: z.number().optional(),
})

const systemPrompt = `You are an HR analyst for GrandCafe Cheers, a restaurant in Mallorca, Spain.
Your role is to analyze employee shift feedback to identify sentiment, themes, potential alerts for management, and actionable suggestions.

IMPORTANT: Employee names are NEVER provided to you for privacy reasons. Focus only on the content of their feedback.

Output your analysis as valid JSON with this structure:
{
  "sentiment": "positive" | "neutral" | "negative" | "critical",
  "themes": ["theme1", "theme2"],
  "manager_alert": true | false,
  "suggestions": ["suggestion1", "suggestion2"],
  "summary": "Brief summary in 1-2 sentences"
}

Themes might include: staffing_issues, equipment_problems, customer_demand, work_environment, schedule_conflict, personal_wellbeing, etc.

A manager_alert should be true if there are safety concerns, harassment, serious equipment issues, or critical staffing problems.

Keep suggestions concise and actionable.`

export async function POST(request: NextRequest) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const {
    survey_id,
    rating,
    feedback,
    anomaly_type,
    anomaly_reason,
    anomaly_comment,
    worked_minutes,
    variance_minutes,
    break_variance_minutes,
  } = validation.data

  // Build context for AI
  const contextParts = [
    `Rating: ${rating}/5`,
    feedback ? `Feedback: "${feedback}"` : null,
    anomaly_type ? `Anomaly: ${anomaly_type}` : null,
    anomaly_reason ? `Reason: ${anomaly_reason}` : null,
    anomaly_comment ? `Comment: "${anomaly_comment}"` : null,
    worked_minutes ? `Worked: ${worked_minutes} min` : null,
    variance_minutes ? `Variance: ${variance_minutes} min` : null,
    break_variance_minutes ? `Break: ${break_variance_minutes} min` : null,
  ].filter(Boolean)

  const contextText = contextParts.join('\n')

  try {
    // Call Claude Haiku for analysis
    const response = await chat(
      [
        {
          role: 'user',
          content: `Analyze this shift feedback:\n\n${contextText}`,
        },
      ],
      systemPrompt,
      []
    )

    // Extract JSON from response
    let analysis
    try {
      const textContent = response.content.find((c) => c.type === 'text')
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response')
      }
      analysis = JSON.parse(textContent.text)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // Fallback analysis
      analysis = {
        sentiment: rating <= 2 ? 'negative' : rating >= 4 ? 'positive' : 'neutral',
        themes: anomaly_type ? [anomaly_type] : [],
        manager_alert: rating <= 2,
        suggestions: ['Review with employee directly'],
        summary: 'Analysis failed, manual review required.',
      }
    }

    // Store analysis in survey record
    const supabase = createAdminClient()
    await supabase
      .from('shift_survey_responses')
      .update({ ai_analysis: analysis })
      .eq('id', survey_id)

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('AI analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze feedback' },
      { status: 500 }
    )
  }
}
