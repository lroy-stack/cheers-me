/**
 * Tool Access Control
 * Maps user roles to allowed AI tools.
 */

import type { UserRole } from './types'
import { AI_TOOLS } from './tool-definitions'
import { Anthropic } from './claude'

// ============================================
// Tool groupings by domain
// ============================================

const SALES_TOOLS = ['query_sales', 'record_daily_sales', 'close_register']
const STOCK_TOOLS = ['get_stock_levels', 'record_stock_movement', 'create_purchase_order']
const STAFF_TOOLS = [
  'get_staff_schedule', 'suggest_schedule', 'create_shift', 'update_shift',
  'delete_shift', 'approve_leave_request', 'update_employee', 'employee_performance',
  'get_employees', 'get_employee_details', 'get_leave_requests',
  'get_employee_availability', 'get_schedule_plans',
  'create_task', 'update_task_status', 'create_leave_request',
]
const RESERVATION_TOOLS = ['get_reservations', 'create_reservation', 'update_reservation_status', 'assign_table']
const EVENT_TOOLS = ['get_events', 'create_event', 'update_event']
const SOCIAL_TOOLS = ['generate_social_post', 'draft_newsletter', 'get_reviews', 'draft_review_reply']
const FINANCE_TOOLS = ['query_financials', 'record_expense', 'profit_analysis']
const ANALYTICAL_TOOLS = ['analyze_trends', 'compare_periods', 'predict_demand']
const TAX_TOOLS = ['query_tax_data', 'generate_tax_form_url', 'save_tax_declaration']
const COCKTAIL_TOOLS = [
  'get_cocktail_recipe', 'get_cocktail_cost', 'search_cocktails_by_ingredient',
  'get_cocktail_preparation_guide', 'suggest_cocktail',
]
const DELEGATE_TOOLS = [
  'delegate_document_generator', 'delegate_web_researcher', 'delegate_schedule_optimizer',
  'delegate_sports_events', 'delegate_advertising_manager', 'delegate_cocktail_specialist',
  'delegate_compliance_auditor', 'delegate_financial_reporter', 'delegate_marketing_campaign',
]
const AD_TOOLS = ['get_ads', 'create_ad', 'update_ad', 'delegate_advertising_manager']
const COUPON_TOOLS = ['get_coupons', 'validate_coupon']
const TRAINING_TOOLS = ['get_training_guide', 'get_training_compliance']
const TASK_RESOURCE_TOOLS = ['get_task_templates', 'get_overdue_tasks', 'get_business_resource']
const ZONE_TOOLS = ['get_zone_assignments', 'get_floor_sections', 'assign_zone']
const TASK_PLAN_TOOLS = [
  'get_weekly_task_plan', 'create_planned_task', 'update_planned_task', 'export_task_plan',
]
const IMAGE_TOOLS = ['generate_image']
const EXPORT_TOOLS = ['export_to_excel']

// ============================================
// Role → allowed tool names
// ============================================

const ROLE_TOOL_MAP: Record<UserRole, Set<string>> = {
  admin: new Set([
    ...SALES_TOOLS, ...STOCK_TOOLS, ...STAFF_TOOLS, ...RESERVATION_TOOLS,
    ...EVENT_TOOLS, ...SOCIAL_TOOLS, ...FINANCE_TOOLS, ...ANALYTICAL_TOOLS,
    ...TAX_TOOLS, ...COCKTAIL_TOOLS, ...DELEGATE_TOOLS,
    ...TRAINING_TOOLS, ...TASK_RESOURCE_TOOLS, ...IMAGE_TOOLS, ...EXPORT_TOOLS,
    ...AD_TOOLS, ...COUPON_TOOLS, ...ZONE_TOOLS, ...TASK_PLAN_TOOLS,
    'create_task_from_template',
  ]),

  owner: new Set([
    ...SALES_TOOLS, ...STOCK_TOOLS, ...STAFF_TOOLS, ...RESERVATION_TOOLS,
    ...EVENT_TOOLS, ...SOCIAL_TOOLS, ...FINANCE_TOOLS, ...ANALYTICAL_TOOLS,
    ...TAX_TOOLS, ...COCKTAIL_TOOLS, ...DELEGATE_TOOLS,
    ...TRAINING_TOOLS, ...TASK_RESOURCE_TOOLS, ...IMAGE_TOOLS, ...EXPORT_TOOLS,
    ...AD_TOOLS, ...COUPON_TOOLS, ...ZONE_TOOLS, ...TASK_PLAN_TOOLS,
    'create_task_from_template',
  ]),

  manager: new Set([
    ...SALES_TOOLS, ...STOCK_TOOLS, ...STAFF_TOOLS, ...RESERVATION_TOOLS,
    ...EVENT_TOOLS, ...SOCIAL_TOOLS, ...FINANCE_TOOLS, ...ANALYTICAL_TOOLS,
    ...COCKTAIL_TOOLS, ...DELEGATE_TOOLS,
    ...TRAINING_TOOLS, ...TASK_RESOURCE_TOOLS, ...IMAGE_TOOLS, ...EXPORT_TOOLS,
    ...AD_TOOLS, ...COUPON_TOOLS, ...ZONE_TOOLS, ...TASK_PLAN_TOOLS,
    'create_task_from_template',
    // Read-only tax (no save_tax_declaration)
    'query_tax_data', 'generate_tax_form_url',
  ]),

  kitchen: new Set([
    'get_stock_levels', 'record_stock_movement',
    'get_staff_schedule',
    'get_cocktail_recipe', 'get_cocktail_preparation_guide',
    'suggest_cocktail', 'search_cocktails_by_ingredient',
    'predict_demand',
    'get_training_guide', 'get_overdue_tasks',
  ]),

  bar: new Set([
    'get_stock_levels', 'record_stock_movement',
    'get_events',
    'get_staff_schedule',
    ...COCKTAIL_TOOLS,
    'predict_demand',
    'get_training_guide', 'get_overdue_tasks',
    'validate_coupon',
    'delegate_cocktail_specialist',
    'generate_image',
  ]),

  waiter: new Set([
    'get_reservations', 'create_reservation', 'update_reservation_status',
    'get_events',
    'get_staff_schedule',
    'get_reviews',
    'get_cocktail_recipe', 'suggest_cocktail', 'get_cocktail_preparation_guide',
    'predict_demand',
    'get_training_guide', 'get_overdue_tasks',
    'validate_coupon',
    'get_zone_assignments', 'get_floor_sections', 'get_weekly_task_plan',
  ]),

  dj: new Set([
    'get_events', 'create_event', 'update_event',
    'get_staff_schedule',
    'get_cocktail_recipe', 'get_cocktail_preparation_guide', 'suggest_cocktail',
    'predict_demand',
    'get_training_guide',
  ]),
}

/**
 * Get the set of allowed tool names for a role
 */
export function getAllowedToolNames(role: UserRole): Set<string> {
  return ROLE_TOOL_MAP[role] || ROLE_TOOL_MAP.waiter
}

/**
 * Filter AI_TOOLS array to only include tools allowed for the given role
 */
export function getToolsForRole(role: UserRole): Anthropic.Tool[] {
  const allowed = getAllowedToolNames(role)
  return AI_TOOLS.filter(tool => allowed.has(tool.name))
}

/**
 * Check if a specific tool is allowed for a role
 */
export function isToolAllowed(role: UserRole, toolName: string): boolean {
  const allowed = getAllowedToolNames(role)
  return allowed.has(toolName)
}
