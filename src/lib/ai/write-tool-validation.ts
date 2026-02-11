/**
 * Write Tool Validation
 * Zod schemas for pre-validating write tool parameters before creating pending actions.
 */

import { z } from 'zod'

export const writeToolSchemas: Record<string, z.ZodSchema> = {
  create_shift: z.object({
    employee_id: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    start_time: z.string(),
    end_time: z.string(),
    role: z.string().optional(),
  }),

  update_shift: z.object({
    shift_id: z.string().uuid(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    role: z.string().optional(),
  }),

  delete_shift: z.object({
    shift_id: z.string().uuid(),
  }),

  approve_leave_request: z.object({
    leave_id: z.string().uuid(),
  }),

  update_employee: z.object({
    employee_id: z.string().uuid(),
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    role: z.string().optional(),
    hourly_rate: z.number().positive().optional(),
  }),

  create_reservation: z.object({
    guest_name: z.string().min(1),
    party_size: z.number().int().min(1).max(50),
    reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    reservation_time: z.string(),
    guest_phone: z.string().optional(),
    guest_email: z.string().email().optional(),
    special_requests: z.string().optional(),
    table_id: z.string().uuid().optional(),
  }),

  update_reservation_status: z.object({
    reservation_id: z.string().uuid(),
    status: z.enum(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show']),
  }),

  assign_table: z.object({
    reservation_id: z.string().uuid(),
    table_id: z.string().uuid(),
  }),

  create_event: z.object({
    title: z.string().min(1),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    start_time: z.string(),
    end_time: z.string().optional(),
    event_type: z.enum(['dj_night', 'sports', 'themed', 'private']).optional(),
    description: z.string().optional(),
    dj_id: z.string().uuid().optional(),
  }),

  update_event: z.object({
    event_id: z.string().uuid(),
    title: z.string().optional(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    event_type: z.enum(['dj_night', 'sports', 'themed', 'private']).optional(),
    description: z.string().optional(),
    status: z.string().optional(),
  }),

  record_stock_movement: z.object({
    product_id: z.string().uuid(),
    quantity: z.number(),
    movement_type: z.enum(['in', 'out']),
    notes: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  }),

  create_purchase_order: z.object({
    supplier_id: z.string().uuid().optional(),
    supplier_name: z.string().optional(),
    items: z.array(z.object({
      product_id: z.string().uuid(),
      quantity: z.number().positive(),
      unit_price: z.number().positive().optional(),
    })).min(1),
    notes: z.string().optional(),
    expected_delivery: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  }),

  record_daily_sales: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    food_revenue: z.number().min(0).optional(),
    drink_revenue: z.number().min(0).optional(),
    cocktail_revenue: z.number().min(0).optional(),
    beer_revenue: z.number().min(0).optional(),
    dessert_revenue: z.number().min(0).optional(),
    total_covers: z.number().int().min(0).optional(),
  }),

  record_expense: z.object({
    category: z.string().min(1),
    amount: z.number().positive(),
    description: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    vendor: z.string().optional(),
    receipt_ref: z.string().optional(),
  }),

  close_register: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    cash_counted: z.number().min(0),
    card_total: z.number().min(0).optional(),
    expected_cash: z.number().min(0).optional(),
    notes: z.string().optional(),
  }),

  create_task: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    assignee_id: z.string().uuid(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    checklist: z.array(z.string()).optional(),
  }),

  update_task_status: z.object({
    task_id: z.string().uuid(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    assignee_id: z.string().uuid().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  }),

  create_leave_request: z.object({
    employee_id: z.string().uuid(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    leave_type: z.enum(['vacation', 'sick', 'personal', 'other']).optional(),
    notes: z.string().optional(),
  }),

  batch_create_events: z.object({
    events: z.array(z.object({
      title: z.string().min(1),
      event_date: z.string(),
      start_time: z.string(),
      end_time: z.string().optional(),
      event_type: z.string().optional(),
      sport_name: z.string().optional(),
      home_team: z.string().optional(),
      away_team: z.string().optional(),
      broadcast_channel: z.string().optional(),
      match_info: z.string().optional(),
    })).min(1),
    descriptions: z.array(z.string()).optional(),
  }),

  // ═══ SCHEDULE & TASK PLANNER WRITE TOOLS ═══

  batch_sync_schedule: z.object({
    week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    shifts: z.array(z.object({
      employee_id: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
      shift_type: z.enum(['morning', 'afternoon', 'night', 'split', 'day_off']),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
      second_start_time: z.string().optional(),
      second_end_time: z.string().optional(),
      break_minutes: z.number().int().min(0).optional(),
      is_day_off: z.boolean().optional(),
      notes: z.string().optional(),
    })).min(1),
  }),

  batch_sync_task_plan: z.object({
    week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    tasks: z.array(z.object({
      title: z.string().min(1),
      day_of_week: z.number().int().min(0).max(6),
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
      assigned_to: z.string().uuid().optional(),
      assigned_role: z.string().optional(),
      shift_type: z.enum(['morning', 'afternoon', 'night']).optional(),
      estimated_minutes: z.number().int().min(1).optional(),
      section_id: z.string().uuid().optional(),
      template_id: z.string().uuid().optional(),
    })).min(1),
  }),

  publish_schedule: z.object({
    plan_id: z.string().uuid(),
  }),

  publish_task_plan: z.object({
    plan_id: z.string().uuid(),
  }),

  export_schedule_excel: z.object({
    week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  }),

  export_task_plan_excel: z.object({
    week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  }),
}

export function validateWriteToolInput(
  toolName: string,
  input: unknown
): { valid: boolean; error?: string } {
  const schema = writeToolSchemas[toolName]
  if (!schema) {
    return { valid: false, error: `Unknown write tool: ${toolName}` }
  }

  const result = schema.safeParse(input)
  if (!result.success) {
    return { valid: false, error: result.error.message }
  }

  return { valid: true }
}
