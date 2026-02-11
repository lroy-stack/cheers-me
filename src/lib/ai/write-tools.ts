/**
 * Write Tool Execution
 * Server-side execution of write tools via internal API routes.
 * Each tool calls an internal API route with forwarded auth cookies.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function callAPI(
  method: string,
  path: string,
  body: Record<string, unknown>,
  cookie: string
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cookie': cookie,
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (method !== 'DELETE' && Object.keys(body).length > 0) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(`${BASE_URL}${path}`, options)

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error')
    let errorData: Record<string, unknown>
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { error: errorText || `HTTP ${res.status}` }
    }
    return { error: errorData.error || `Request failed with status ${res.status}`, status: res.status }
  }

  return res.json()
}

export async function executeWriteTool(
  toolName: string,
  params: Record<string, unknown>,
  cookie: string
): Promise<unknown> {
  switch (toolName) {
    case 'create_shift':
      return callAPI('POST', '/api/staff/shifts', params, cookie)

    case 'update_shift':
      return callAPI(
        'PATCH',
        `/api/staff/shifts/${params.shift_id}`,
        params,
        cookie
      )

    case 'delete_shift':
      return callAPI(
        'DELETE',
        `/api/staff/shifts/${params.shift_id}`,
        {},
        cookie
      )

    case 'approve_leave_request':
      return callAPI(
        'PATCH',
        `/api/staff/leave/${params.leave_id}`,
        { status: 'approved' },
        cookie
      )

    case 'update_employee':
      return callAPI(
        'PATCH',
        `/api/staff/employees/${params.employee_id}`,
        params,
        cookie
      )

    case 'create_reservation':
      return callAPI('POST', '/api/reservations', params, cookie)

    case 'update_reservation_status':
      return callAPI(
        'PATCH',
        `/api/reservations/${params.reservation_id}`,
        { status: params.status },
        cookie
      )

    case 'assign_table':
      return callAPI(
        'PATCH',
        `/api/reservations/${params.reservation_id}`,
        { table_id: params.table_id },
        cookie
      )

    case 'create_event':
      return callAPI('POST', '/api/events', params, cookie)

    case 'update_event':
      return callAPI(
        'PATCH',
        `/api/events/${params.event_id}`,
        params,
        cookie
      )

    case 'record_stock_movement':
      return callAPI('POST', '/api/stock/movements', params, cookie)

    case 'create_purchase_order':
      return callAPI('POST', '/api/stock/purchase-orders', params, cookie)

    case 'record_daily_sales':
      return callAPI('POST', '/api/sales/daily', params, cookie)

    case 'record_expense':
      return callAPI('POST', '/api/finance/overhead', params, cookie)

    case 'close_register':
      return callAPI('POST', '/api/sales/register-close', params, cookie)

    case 'save_tax_declaration': {
      const modelo = params.modelo as string
      const year = params.year as number
      const quarter = params.quarter as number | undefined
      const status = (params.status as string) || 'draft'
      const notes = params.notes as string | undefined

      // First fetch the calculated data
      const queryParams = modelo === '347'
        ? `year=${year}`
        : `year=${year}&quarter=${quarter || 1}`
      const taxData = await callAPI('GET', `/api/finance/tax/modelo${modelo}?${queryParams}`, {}, cookie) as Record<string, unknown>

      if (taxData && 'error' in taxData) {
        return taxData
      }

      // Build POST body based on modelo
      const periodLabel = modelo === '347'
        ? String(year)
        : `${quarter}T ${year}`
      const periodStart = modelo === '347'
        ? `${year}-01-01`
        : (taxData.period_start as string) || `${year}-01-01`
      const periodEnd = modelo === '347'
        ? `${year}-12-31`
        : (taxData.period_end as string) || `${year}-12-31`

      const body: Record<string, unknown> = {
        period_label: periodLabel,
        period_start: periodStart,
        period_end: periodEnd,
        status,
        notes,
      }

      if (modelo === '303') {
        body.iva_repercutido = taxData.iva_repercutido || 0
        body.iva_soportado = taxData.iva_soportado || 0
        body.iva_resultado = taxData.resultado || 0
      } else if (modelo === '111') {
        body.total_irpf = taxData.total_irpf || 0
        body.employee_count = (taxData.employees as unknown[])?.length || 0
      } else if (modelo === '347') {
        body.total_amount = taxData.total_amount || 0
        body.supplier_count = taxData.total_suppliers || 0
      }

      return callAPI('POST', `/api/finance/tax/modelo${modelo}`, body, cookie)
    }

    case 'create_task':
      return callAPI('POST', '/api/staff/tasks', params, cookie)

    case 'update_task_status':
      return callAPI(
        'PATCH',
        `/api/staff/tasks/${params.task_id}`,
        params,
        cookie
      )

    case 'create_leave_request':
      return callAPI('POST', '/api/staff/leave', params, cookie)

    case 'batch_create_events': {
      const events = params.events as Record<string, unknown>[]
      if (!events || !Array.isArray(events)) {
        return { error: 'No events provided' }
      }
      const results: { title: string; success: boolean; error?: string }[] = []
      for (const event of events) {
        try {
          const res = await callAPI('POST', '/api/events', event, cookie) as Record<string, unknown>
          const hasError = res && 'error' in res
          results.push({
            title: (event.title as string) || 'Unknown',
            success: !hasError,
            error: hasError ? String(res.error) : undefined,
          })
        } catch (err) {
          results.push({
            title: (event.title as string) || 'Unknown',
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        }
      }
      const created = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      return { created, failed, total: events.length, results }
    }

    case 'create_ad':
      return callAPI('POST', '/api/ads', params, cookie)

    case 'update_ad':
      return callAPI(
        'PATCH',
        `/api/ads/${params.ad_id}`,
        params,
        cookie
      )

    case 'validate_coupon': {
      const code = params.code as string
      if (!code) {
        return { error: 'Coupon code is required' }
      }
      // First look up the coupon by code to get its ID
      const lookupRes = await callAPI('GET', `/api/coupons?code=${encodeURIComponent(code)}`, {}, cookie) as Record<string, unknown>
      if (lookupRes && 'error' in lookupRes) {
        return lookupRes
      }
      const coupons = (lookupRes as { coupons?: { id: string }[] }).coupons
      if (!coupons || coupons.length === 0) {
        return { error: `Coupon with code "${code}" not found` }
      }
      const couponId = coupons[0].id
      const validateBody: Record<string, unknown> = {}
      if (params.amount) {
        validateBody.amount = params.amount
      }
      return callAPI('POST', `/api/coupons/${couponId}/validate`, validateBody, cookie)
    }

    // ═══ TASK PLANNING WRITE TOOLS ═══

    case 'create_planned_task': {
      const { week_start_date, ...taskData } = params
      // First ensure plan exists, then add task via sync
      const planRes = await callAPI('GET', `/api/staff/task-plans?week=${week_start_date}`, {}, cookie) as Record<string, unknown> | null
      let planId: string

      if (planRes && (planRes as Record<string, string>).id) {
        planId = (planRes as Record<string, string>).id
      } else {
        const newPlan = await callAPI('POST', '/api/staff/task-plans', { week_start_date }, cookie) as Record<string, string>
        if ((newPlan as Record<string, unknown>).error) {
          // Plan might already exist (409), try to get existing
          if ((newPlan as Record<string, string>).existing_id) {
            planId = (newPlan as Record<string, string>).existing_id
          } else {
            return newPlan
          }
        } else {
          planId = newPlan.id
        }
      }

      return callAPI('POST', `/api/staff/task-plans/${planId}/sync`, {
        tasks_to_create: [taskData],
        tasks_to_update: [],
        tasks_to_delete: [],
      }, cookie)
    }

    case 'update_planned_task': {
      const { task_id, ...updates } = params
      // We need to find which plan this task belongs to
      return callAPI('PATCH', `/api/staff/task-plans/task/${task_id}`, updates, cookie)
    }

    case 'assign_zone':
      return callAPI('POST', '/api/staff/zones/assignments', {
        section_id: params.section_id,
        employee_id: params.employee_id,
        assignment_date: params.date,
        shift_type: params.shift_type,
        notes: params.notes,
      }, cookie)

    case 'export_task_plan': {
      const { week_start_date: exportWeek } = params
      const planLookup = await callAPI('GET', `/api/staff/task-plans?week=${exportWeek}`, {}, cookie) as Record<string, unknown> | null
      if (!planLookup || !(planLookup as Record<string, string>).id) {
        return { error: `No task plan found for week ${exportWeek}` }
      }
      const exportPlanId = (planLookup as Record<string, string>).id
      return callAPI('GET', `/api/staff/task-plans/${exportPlanId}/export?format=excel`, {}, cookie)
    }

    // ═══ SCHEDULE & TASK PLANNER WRITE TOOLS ═══

    case 'batch_sync_schedule': {
      const { week_start_date, shifts } = params as { week_start_date: string; shifts: Record<string, unknown>[] }
      // Get or create schedule plan
      const existingPlan = await callAPI('GET', `/api/staff/schedule-plans?week_start_date=${week_start_date}`, {}, cookie) as Record<string, unknown> | null
      let planId: string

      if (existingPlan && (existingPlan as Record<string, string>).id) {
        planId = (existingPlan as Record<string, string>).id
      } else {
        const newPlan = await callAPI('POST', '/api/staff/schedule-plans', { week_start_date }, cookie) as Record<string, unknown>
        if (newPlan.error) {
          if ((newPlan as Record<string, string>).existing_id) {
            planId = (newPlan as Record<string, string>).existing_id
          } else {
            return newPlan
          }
        } else {
          planId = (newPlan as Record<string, string>).id
        }
      }

      // Sync shifts to the plan
      const syncResult = await callAPI('POST', `/api/staff/schedule-plans/${planId}/sync`, {
        shifts_to_create: shifts,
        shifts_to_update: [],
        shifts_to_delete: [],
      }, cookie)

      return { plan_id: planId, sync: syncResult, week_start_date }
    }

    case 'batch_sync_task_plan': {
      const { week_start_date: taskWeek, tasks } = params as { week_start_date: string; tasks: Record<string, unknown>[] }
      // Get or create task plan
      const existingTaskPlan = await callAPI('GET', `/api/staff/task-plans?week=${taskWeek}`, {}, cookie) as Record<string, unknown> | null
      let taskPlanId: string

      if (existingTaskPlan && (existingTaskPlan as Record<string, string>).id) {
        taskPlanId = (existingTaskPlan as Record<string, string>).id
      } else {
        const newTaskPlan = await callAPI('POST', '/api/staff/task-plans', { week_start_date: taskWeek }, cookie) as Record<string, unknown>
        if (newTaskPlan.error) {
          if ((newTaskPlan as Record<string, string>).existing_id) {
            taskPlanId = (newTaskPlan as Record<string, string>).existing_id
          } else {
            return newTaskPlan
          }
        } else {
          taskPlanId = (newTaskPlan as Record<string, string>).id
        }
      }

      // Sync tasks to the plan
      const taskSyncResult = await callAPI('POST', `/api/staff/task-plans/${taskPlanId}/sync`, {
        tasks_to_create: tasks,
        tasks_to_update: [],
        tasks_to_delete: [],
      }, cookie)

      return { plan_id: taskPlanId, sync: taskSyncResult, week_start_date: taskWeek }
    }

    case 'publish_schedule': {
      const { plan_id } = params as { plan_id: string }
      return callAPI('POST', `/api/staff/schedule-plans/${plan_id}/publish`, {}, cookie)
    }

    case 'publish_task_plan': {
      const { plan_id } = params as { plan_id: string }
      return callAPI('POST', `/api/staff/task-plans/${plan_id}/publish`, {}, cookie)
    }

    case 'export_schedule_excel': {
      const { week_start_date: scheduleWeek } = params as { week_start_date: string }
      const weekEnd = new Date(new Date(scheduleWeek).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      return callAPI('GET', `/api/exports/excel?type=schedule&date_from=${scheduleWeek}&date_to=${weekEnd}`, {}, cookie)
    }

    case 'export_task_plan_excel': {
      const { week_start_date: tpExportWeek } = params as { week_start_date: string }
      const tpLookup = await callAPI('GET', `/api/staff/task-plans?week=${tpExportWeek}`, {}, cookie) as Record<string, unknown> | null
      if (!tpLookup || !(tpLookup as Record<string, string>).id) {
        return { error: `No task plan found for week ${tpExportWeek}` }
      }
      const tpId = (tpLookup as Record<string, string>).id
      return callAPI('GET', `/api/staff/task-plans/${tpId}/export?format=excel`, {}, cookie)
    }

    default:
      return { error: `Unknown write tool: ${toolName}` }
  }
}
