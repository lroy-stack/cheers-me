/**
 * Compliance Auditor Sub-Agent
 * Analyzes employee training compliance across categories.
 * Generates a traffic-light HTML report with compliance scores, gaps, and recommendations.
 * Uses Sonnet for analytical reasoning.
 */

import { anthropic, Anthropic } from '../claude'
import type { SubAgentResult, ProgressCallback, SubAgentContext } from './types'

const SYSTEM_PROMPT = `You are a compliance auditor specialist for GrandCafe Cheers, a beachfront restaurant in El Arenal, Mallorca.

## Your Task
Analyze employee training compliance and generate a detailed audit report.

## Training Categories
- food_safety: Food hygiene, HACCP, allergen management
- occupational_health: Workplace safety, first aid, fire prevention
- labor_regulations: Employment law, working hours, contracts
- role_specific: Position-specific certifications (bartender, kitchen, DJ)
- required_docs: Mandatory documentation (health card, work permit)
- environmental: Waste management, sustainability practices

## Compliance Traffic-Light System
- 🟢 GREEN: All mandatory trainings completed with score ≥ passing_score, and certifications are current (not expired based on recurrence_months)
- 🟡 YELLOW: Some mandatory trainings completed but gaps exist, or certifications expiring within 30 days
- 🔴 RED: No mandatory trainings completed, or critical certifications expired

## Report Structure
1. **Executive Summary**: Overall compliance percentage, critical gaps count, trend
2. **Traffic-Light Matrix**: HTML table with employees as rows, categories as columns, colored cells
3. **Detailed Gaps**: List of specific missing/expired trainings per employee
4. **Recommendations**: Prioritized action items to improve compliance

## Output Format
Generate the report as an HTML artifact with inline styles:
\`\`\`artifact:html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 20px;">
  <!-- Executive Summary -->
  <!-- Traffic-Light Matrix Table -->
  <!-- Detailed Gaps -->
  <!-- Recommendations -->
</div>
\`\`\`

Use these colors for the traffic light cells:
- Green: background-color: #22c55e; color: white
- Yellow: background-color: #eab308; color: white
- Red: background-color: #ef4444; color: white

Make the table clean, professional, and printable. Include score percentages in each cell where applicable.`

export async function executeComplianceAuditor(
  params: Record<string, unknown>,
  context: SubAgentContext,
  progress: ProgressCallback
): Promise<SubAgentResult> {
  const startTime = Date.now()
  const category = (params.category as string) || 'all'
  const employeeId = params.employee_id as string | undefined

  progress('Fetching training data...')

  let dataContext = ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any

    // Fetch active employees
    let employeesQuery = db
      .from('employees')
      .select('id, full_name, role')
      .eq('status', 'active')
      .order('full_name')

    if (employeeId) {
      employeesQuery = employeesQuery.eq('id', employeeId)
    }

    const { data: employees } = await employeesQuery

    // Fetch mandatory training materials
    let materialsQuery = db
      .from('training_materials')
      .select('guide_code, title, category, mandatory, passing_score, recurrence_months')
      .eq('mandatory', true)

    if (category !== 'all') {
      materialsQuery = materialsQuery.eq('category', category)
    }

    const { data: materials } = await materialsQuery

    // Fetch training records (completed tests)
    let recordsQuery = db
      .from('training_records')
      .select('employee_id, guide_code, action, score, created_at')
      .in('action', ['test_passed', 'test_completed'])
      .order('created_at', { ascending: false })

    if (employeeId) {
      recordsQuery = recordsQuery.eq('employee_id', employeeId)
    }

    const { data: records } = await recordsQuery

    // Fetch training assignments
    let assignmentsQuery = db
      .from('training_assignments')
      .select('guide_code, assigned_to, status, due_date')
      .order('due_date')

    if (employeeId) {
      assignmentsQuery = assignmentsQuery.eq('assigned_to', employeeId)
    }

    const { data: assignments } = await assignmentsQuery

    if (employees && employees.length > 0) {
      dataContext += '\n\n## Active Employees\n' + JSON.stringify(employees, null, 2)
    }
    if (materials && materials.length > 0) {
      dataContext += '\n\n## Mandatory Training Materials\n' + JSON.stringify(materials, null, 2)
    }
    if (records && records.length > 0) {
      dataContext += '\n\n## Training Records (Completed Tests)\n' + JSON.stringify(records, null, 2)
    }
    if (assignments && assignments.length > 0) {
      dataContext += '\n\n## Training Assignments\n' + JSON.stringify(assignments, null, 2)
    }
  } catch {
    // DB fetch failure is non-critical, proceed with limited context
  }

  progress('Analyzing compliance gaps...')

  try {
    const categoryLabel = category === 'all' ? 'all categories' : category.replace(/_/g, ' ')
    const scopeLabel = employeeId ? `employee ${employeeId}` : 'all active employees'

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a compliance audit report for ${scopeLabel} covering ${categoryLabel}.

Today's date: ${new Date().toISOString().split('T')[0]}

${dataContext ? `Training Data:\n${dataContext}` : 'No training data found in the database. Generate a report noting the absence of data and recommend establishing a training program.'}

Produce the full HTML report as an artifact. If data is limited, note gaps and provide recommendations based on typical restaurant compliance requirements in Spain.`,
        },
      ],
    })

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    )
    const content = textBlocks.map(b => b.text).join('\n')

    progress('Compliance audit complete')

    // Extract HTML artifact
    const htmlMatch = content.match(/```artifact:html\r?\n([\s\S]*?)```/)
    const artifacts = htmlMatch
      ? [{
          id: crypto.randomUUID(),
          type: 'html' as const,
          title: `Compliance Audit — ${categoryLabel}`,
          content: htmlMatch[1].trim(),
        }]
      : undefined

    return {
      success: true,
      content,
      artifacts,
      tokenUsage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Compliance audit failed',
      durationMs: Date.now() - startTime,
    }
  }
}
