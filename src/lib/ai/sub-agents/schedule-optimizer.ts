/**
 * Schedule & Task Planner Sub-Agent
 * Full-featured agentic planner: queries dynamic data (employees, availability, leaves,
 * settings, events, templates), generates schedules and task plans, saves to DB as drafts,
 * and exports to Excel. All shift definitions and labor constraints come from DB settings.
 *
 * Pattern: executeSubAgent() tool loop with PendingWrite[] (same as sports-events.ts).
 */

import type { SubAgentResult, ProgressCallback, SubAgentContext, PendingWrite } from './types'
import { executeSubAgent } from './engine'

// ═══════════════════════════════════════════════════
// System prompt — NO hardcoded shifts or constraints
// ═══════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are a schedule & task planning specialist for GrandCafe Cheers, a beachfront restaurant & sports bar in El Arenal, Mallorca, Spain.

## CRITICAL: Dynamic Configuration
ALWAYS start by calling \`get_restaurant_settings\` to load the restaurant's shift templates, labor constraints, and operating hours. NEVER assume fixed shift times, coverage requirements, or labor limits — they are all configured in the database and may change.

## Workflow
1. **Fetch settings** → \`get_restaurant_settings\` (shift templates, labor constraints, hours)
2. **Fetch staff data** → \`get_employees\` (active employees with roles and contract hours)
3. **Fetch availability** → \`get_availability\` + \`get_leave_requests\` (who is available/unavailable)
4. **Fetch context** → \`get_events\` (demand spikes) + \`get_existing_schedule\` or \`get_existing_task_plan\` (avoid overwriting)
5. **For task plans** → \`get_task_templates\` (standard recurring tasks)
6. **Optionally** → \`get_clock_history\` (actual hours worked recently for fairness)
7. **Analyze & generate** the optimal plan respecting all constraints
8. **Present** a clear summary to the user with the proposed schedule/task plan
9. **If user confirms** → use \`save_schedule\` or \`save_task_plan\` to persist as draft
10. **If user wants to publish** → use \`publish_schedule\` or \`publish_task_plan\`
11. **If user wants to download** → use \`export_schedule_excel\` or \`export_task_plan_excel\`
12. **If user wants to view in panel** → provide direct link: /staff/schedule?week=YYYY-MM-DD or /staff/task-plans?week=YYYY-MM-DD

## Spanish Labor Law (General Reference)
These are general guidelines — the ACTUAL enforced values come from \`get_restaurant_settings\` → labor_constraints:
- Maximum weekly hours (typically 40h)
- Maximum shift duration (typically 10h)
- Minimum rest between shifts (typically 11h)
- Minimum weekly rest (typically 36 consecutive hours)
- Night work limits
- Overtime limits

Always validate the generated schedule against the constraints from settings.

## Output Format
Present the schedule/task plan as a clear text summary with:
- A table-like breakdown by day and employee
- Total hours per employee vs their contract target
- Any constraint violations flagged
- Recommendations for adjustments

Do NOT generate HTML artifacts. The user can export to Excel or view in the admin panel.`

// ═══════════════════════════════════════════════════
// Tool definitions (9 read + 6 write)
// ═══════════════════════════════════════════════════

const TOOLS = [
  // ─── Read tools ───
  {
    name: 'get_restaurant_settings',
    description: 'Fetch restaurant settings including shift_templates, labor_constraints, and restaurant_hours. ALWAYS call this first.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'get_employees',
    description: 'Fetch active employees with their role, contract_hours, weekly_hours_target, and hourly_rate.',
    input_schema: {
      type: 'object' as const,
      properties: {
        role: { type: 'string', description: 'Filter by role (kitchen, bar, waiter, dj, manager). Omit for all.' },
      },
      required: [] as string[],
    },
  },
  {
    name: 'get_availability',
    description: 'Fetch employee availability for a date range. Shows preferred shifts and unavailable dates.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        employee_id: { type: 'string', description: 'Filter by specific employee UUID (optional)' },
      },
      required: ['date_from', 'date_to'],
    },
  },
  {
    name: 'get_leave_requests',
    description: 'Fetch approved leave requests overlapping with a date range.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      },
      required: ['date_from', 'date_to'],
    },
  },
  {
    name: 'get_existing_schedule',
    description: 'Fetch the existing schedule plan and shifts for a given week.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week_start_date: { type: 'string', description: 'Monday of the week (YYYY-MM-DD)' },
      },
      required: ['week_start_date'],
    },
  },
  {
    name: 'get_existing_task_plan',
    description: 'Fetch the existing weekly task plan and its planned tasks.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week_start_date: { type: 'string', description: 'Monday of the week (YYYY-MM-DD)' },
      },
      required: ['week_start_date'],
    },
  },
  {
    name: 'get_task_templates',
    description: 'Fetch staff task templates with their items and frequency (daily, weekly, etc.).',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'get_events',
    description: 'Fetch events (sports, DJ nights, themed, private) for a date range. Used for demand planning.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      },
      required: ['date_from', 'date_to'],
    },
  },
  {
    name: 'get_clock_history',
    description: 'Fetch clock-in/out records for recent weeks. Useful for analyzing actual hours worked for fair distribution.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        employee_id: { type: 'string', description: 'Filter by specific employee UUID (optional)' },
      },
      required: ['date_from', 'date_to'],
    },
  },

  // ─── Write tools (collected as PendingWrite[]) ───
  {
    name: 'save_schedule',
    description: 'Save the generated schedule as a draft. Creates/updates a schedule_plan with all shifts. Requires user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week_start_date: { type: 'string', description: 'Monday of the week (YYYY-MM-DD)' },
        shifts: {
          type: 'array',
          description: 'Array of shift assignments',
          items: {
            type: 'object',
            properties: {
              employee_id: { type: 'string', description: 'Employee UUID' },
              date: { type: 'string', description: 'Shift date (YYYY-MM-DD)' },
              shift_type: { type: 'string', enum: ['morning', 'afternoon', 'night', 'split', 'day_off'], description: 'Type of shift' },
              start_time: { type: 'string', description: 'Start time (HH:MM)' },
              end_time: { type: 'string', description: 'End time (HH:MM)' },
              second_start_time: { type: 'string', description: 'Second block start for split shifts (HH:MM)' },
              second_end_time: { type: 'string', description: 'Second block end for split shifts (HH:MM)' },
              break_minutes: { type: 'number', description: 'Break duration in minutes' },
              is_day_off: { type: 'boolean', description: 'Mark as day off' },
              notes: { type: 'string', description: 'Optional notes' },
            },
            required: ['employee_id', 'date', 'shift_type'],
          },
        },
      },
      required: ['week_start_date', 'shifts'],
    },
  },
  {
    name: 'save_task_plan',
    description: 'Save the generated task plan as a draft. Creates/updates a weekly_task_plan with all tasks. Requires user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week_start_date: { type: 'string', description: 'Monday of the week (YYYY-MM-DD)' },
        tasks: {
          type: 'array',
          description: 'Array of planned tasks',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Task title' },
              day_of_week: { type: 'number', description: 'Day 0=Mon, 6=Sun' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Task priority' },
              assigned_to: { type: 'string', description: 'Employee UUID (optional)' },
              assigned_role: { type: 'string', description: 'Role for assignment (optional)' },
              shift_type: { type: 'string', enum: ['morning', 'afternoon', 'night'], description: 'Which shift this task belongs to' },
              estimated_minutes: { type: 'number', description: 'Estimated duration in minutes' },
              section_id: { type: 'string', description: 'Floor section UUID (optional)' },
              template_id: { type: 'string', description: 'Source template UUID (optional)' },
            },
            required: ['title', 'day_of_week', 'priority'],
          },
        },
      },
      required: ['week_start_date', 'tasks'],
    },
  },
  {
    name: 'publish_schedule',
    description: 'Publish a draft schedule plan, making it visible to staff. Requires user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        plan_id: { type: 'string', description: 'Schedule plan UUID to publish' },
      },
      required: ['plan_id'],
    },
  },
  {
    name: 'publish_task_plan',
    description: 'Publish a draft task plan, making it visible to staff. Requires user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        plan_id: { type: 'string', description: 'Task plan UUID to publish' },
      },
      required: ['plan_id'],
    },
  },
  {
    name: 'export_schedule_excel',
    description: 'Export a weekly schedule to Excel file for download. Requires user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week_start_date: { type: 'string', description: 'Monday of the week (YYYY-MM-DD)' },
      },
      required: ['week_start_date'],
    },
  },
  {
    name: 'export_task_plan_excel',
    description: 'Export a weekly task plan to Excel file for download. Requires user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week_start_date: { type: 'string', description: 'Monday of the week (YYYY-MM-DD)' },
      },
      required: ['week_start_date'],
    },
  },
]

// ═══════════════════════════════════════════════════
// Write tool names that get collected as PendingWrite[]
// ═══════════════════════════════════════════════════

const WRITE_TOOL_NAMES = new Set([
  'save_schedule',
  'save_task_plan',
  'publish_schedule',
  'publish_task_plan',
  'export_schedule_excel',
  'export_task_plan_excel',
])

// Maps sub-agent tool names → write-tools.ts tool_name
const WRITE_TOOL_MAP: Record<string, string> = {
  save_schedule: 'batch_sync_schedule',
  save_task_plan: 'batch_sync_task_plan',
  publish_schedule: 'publish_schedule',
  publish_task_plan: 'publish_task_plan',
  export_schedule_excel: 'export_schedule_excel',
  export_task_plan_excel: 'export_task_plan_excel',
}

// ═══════════════════════════════════════════════════
// Tool handler
// ═══════════════════════════════════════════════════

function createToolHandler(collectedWrites: PendingWrite[]) {
  return async function toolHandler(
    toolName: string,
    toolInput: Record<string, unknown>,
    context: SubAgentContext
  ): Promise<unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any

    // ─── Write tools → collect as PendingWrite ───
    if (WRITE_TOOL_NAMES.has(toolName)) {
      const mappedName = WRITE_TOOL_MAP[toolName]
      const description = buildWriteDescription(toolName, toolInput)

      collectedWrites.push({
        tool_name: mappedName,
        parameters: toolInput,
        description,
      })

      return { queued: true, message: `${toolName} queued for user confirmation`, ...toolInput }
    }

    // ─── Read tools → direct DB queries ───
    switch (toolName) {
      case 'get_restaurant_settings': {
        const { data, error } = await db
          .from('restaurant_settings')
          .select('*')
          .limit(1)
          .single()

        if (error) return { error: error.message }
        return {
          shift_templates: data?.shift_templates || data?.settings?.shift_templates || null,
          labor_constraints: data?.labor_constraints || data?.settings?.labor_constraints || null,
          restaurant_hours: data?.restaurant_hours || data?.settings?.restaurant_hours || null,
          raw_settings: data,
        }
      }

      case 'get_employees': {
        let query = db
          .from('employees')
          .select('id, full_name, role, contract_hours, weekly_hours_target, hourly_rate, status, phone, email')
          .eq('status', 'active')
          .order('role')

        if (toolInput.role) {
          query = query.eq('role', toolInput.role)
        }

        const { data, error } = await query
        if (error) return { error: error.message }
        return { employees: data || [], count: (data || []).length }
      }

      case 'get_availability': {
        const { date_from, date_to, employee_id } = toolInput as {
          date_from: string; date_to: string; employee_id?: string
        }

        let query = db
          .from('availability')
          .select('employee_id, date, is_available, preferred_shift, notes')
          .gte('date', date_from)
          .lte('date', date_to)
          .order('date')

        if (employee_id) {
          query = query.eq('employee_id', employee_id)
        }

        const { data, error } = await query
        if (error) return { error: error.message }
        return { availability: data || [], count: (data || []).length }
      }

      case 'get_leave_requests': {
        const { date_from, date_to } = toolInput as { date_from: string; date_to: string }

        const { data, error } = await db
          .from('leave_requests')
          .select('employee_id, start_date, end_date, leave_type, notes')
          .eq('status', 'approved')
          .lte('start_date', date_to)
          .gte('end_date', date_from)
          .order('start_date')

        if (error) return { error: error.message }
        return { leaves: data || [], count: (data || []).length }
      }

      case 'get_existing_schedule': {
        const { week_start_date } = toolInput as { week_start_date: string }

        const { data: plan, error: planError } = await db
          .from('schedule_plans')
          .select('id, week_start_date, status, created_at, updated_at')
          .eq('week_start_date', week_start_date)
          .limit(1)
          .single()

        if (planError || !plan) {
          return { exists: false, plan: null, shifts: [] }
        }

        const { data: shifts, error: shiftsError } = await db
          .from('shifts')
          .select('id, employee_id, date, shift_type, start_time, end_time, break_minutes, is_day_off, notes')
          .eq('schedule_plan_id', plan.id)
          .order('date')

        if (shiftsError) return { exists: true, plan, shifts: [], error: shiftsError.message }
        return { exists: true, plan, shifts: shifts || [] }
      }

      case 'get_existing_task_plan': {
        const { week_start_date } = toolInput as { week_start_date: string }

        const { data: plan, error: planError } = await db
          .from('weekly_task_plans')
          .select('id, week_start_date, status, created_at, updated_at')
          .eq('week_start_date', week_start_date)
          .limit(1)
          .single()

        if (planError || !plan) {
          return { exists: false, plan: null, tasks: [] }
        }

        const { data: tasks, error: tasksError } = await db
          .from('planned_tasks')
          .select('id, title, day_of_week, priority, assigned_to, assigned_role, shift_type, estimated_minutes, section_id, template_id, status')
          .eq('plan_id', plan.id)
          .order('day_of_week')

        if (tasksError) return { exists: true, plan, tasks: [], error: tasksError.message }
        return { exists: true, plan, tasks: tasks || [] }
      }

      case 'get_task_templates': {
        const { data, error } = await db
          .from('staff_task_templates')
          .select('id, name, frequency, role, shift_type, items:staff_task_template_items(id, title, estimated_minutes, priority, section_id)')
          .eq('is_active', true)
          .order('name')

        if (error) return { error: error.message }
        return { templates: data || [], count: (data || []).length }
      }

      case 'get_events': {
        const { date_from, date_to } = toolInput as { date_from: string; date_to: string }

        const { data, error } = await db
          .from('events')
          .select('id, title, event_date, start_time, end_time, event_type, description')
          .gte('event_date', date_from)
          .lte('event_date', date_to)
          .order('event_date')

        if (error) return { error: error.message }
        return { events: data || [], count: (data || []).length }
      }

      case 'get_clock_history': {
        const { date_from, date_to, employee_id } = toolInput as {
          date_from: string; date_to: string; employee_id?: string
        }

        let query = db
          .from('clock_in_out')
          .select('employee_id, clock_in, clock_out, total_hours, date')
          .gte('date', date_from)
          .lte('date', date_to)
          .order('date', { ascending: false })

        if (employee_id) {
          query = query.eq('employee_id', employee_id)
        }

        const { data, error } = await query
        if (error) return { error: error.message }
        return { records: data || [], count: (data || []).length }
      }

      default:
        return { error: `Unknown tool: ${toolName}` }
    }
  }
}

function buildWriteDescription(toolName: string, params: Record<string, unknown>): string {
  const week = (params.week_start_date || '') as string

  switch (toolName) {
    case 'save_schedule': {
      const shifts = params.shifts as unknown[]
      return `Save schedule for week ${week}: ${shifts?.length || 0} shift(s) as draft`
    }
    case 'save_task_plan': {
      const tasks = params.tasks as unknown[]
      return `Save task plan for week ${week}: ${tasks?.length || 0} task(s) as draft`
    }
    case 'publish_schedule':
      return `Publish schedule plan ${params.plan_id}`
    case 'publish_task_plan':
      return `Publish task plan ${params.plan_id}`
    case 'export_schedule_excel':
      return `Export schedule for week ${week} to Excel`
    case 'export_task_plan_excel':
      return `Export task plan for week ${week} to Excel`
    default:
      return `${toolName}`
  }
}

// ═══════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════

export async function executeScheduleOptimizer(
  params: Record<string, unknown>,
  context: SubAgentContext,
  progress: ProgressCallback
): Promise<SubAgentResult> {
  const action = (params.action || 'schedule') as string
  const weekStart = (params.week_start || params.date || '') as string
  const query = (params.query || '') as string

  let userPrompt: string

  switch (action) {
    case 'optimize':
    case 'schedule':
      userPrompt = `Generate an optimized weekly staff schedule${weekStart ? ` for the week starting ${weekStart}` : ' for next week'}.

Steps:
1. Call get_restaurant_settings to load shift templates, labor constraints, and hours
2. Call get_employees to see all active staff
3. Call get_availability and get_leave_requests for the target week
4. Call get_events to check for demand spikes
5. Optionally call get_existing_schedule to see if there's a draft already
6. Generate the optimal schedule respecting all constraints
7. Present the schedule clearly and ask if I should save it as a draft

${query ? `Additional context: ${query}` : ''}`
      break

    case 'task_plan':
      userPrompt = `Generate a weekly task plan${weekStart ? ` for the week starting ${weekStart}` : ' for next week'}.

Steps:
1. Call get_restaurant_settings to load shift templates and hours
2. Call get_task_templates to see the standard recurring tasks
3. Call get_employees to see who can be assigned
4. Call get_events to adjust task priorities for event days
5. Optionally call get_existing_task_plan to see if there's a draft already
6. Generate the task plan distributing tasks fairly across shifts and staff
7. Present the plan clearly and ask if I should save it as a draft

${query ? `Additional context: ${query}` : ''}`
      break

    case 'both':
      userPrompt = `Generate both a weekly staff schedule AND a task plan${weekStart ? ` for the week starting ${weekStart}` : ' for next week'}.

Steps:
1. Call get_restaurant_settings first
2. Fetch all relevant data (employees, availability, leaves, events, templates)
3. Generate the schedule first, then the task plan (tasks depend on who's working when)
4. Present both clearly and ask if I should save them as drafts

${query ? `Additional context: ${query}` : ''}`
      break

    case 'query':
    default:
      userPrompt = query || 'Help me with schedule and task planning. Start by checking the restaurant settings and current staff situation.'
      break
  }

  progress('Starting schedule & task planner...')

  const collectedWrites: PendingWrite[] = []
  const toolHandler = createToolHandler(collectedWrites)

  const result = await executeSubAgent(
    {
      name: 'schedule_optimizer',
      model: 'claude-sonnet-4-5-20250929',
      systemPrompt: SYSTEM_PROMPT,
      maxIterations: 10,
      maxTokens: 8192,
      tools: TOOLS,
      toolHandler,
    },
    userPrompt,
    progress,
    context
  )

  if (collectedWrites.length > 0) {
    result.pendingWrites = collectedWrites
  }

  return result
}
