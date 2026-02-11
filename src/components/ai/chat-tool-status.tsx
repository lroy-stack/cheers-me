'use client'

import { useState } from 'react'
import { Loader2, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// Tool display labels
const toolLabels: Record<string, string> = {
  query_sales: 'Sales',
  get_stock_levels: 'Stock',
  get_staff_schedule: 'Staff',
  get_reservations: 'Reservations',
  generate_social_post: 'Social Media',
  draft_newsletter: 'Newsletter',
  get_events: 'Events',
  query_financials: 'Finance',
  get_reviews: 'Reviews',
  draft_review_reply: 'Reply',
  suggest_schedule: 'Schedule',
  predict_demand: 'Forecast',
  create_shift: 'Create Shift',
  update_shift: 'Update Shift',
  delete_shift: 'Delete Shift',
  approve_leave_request: 'Approve Leave',
  update_employee: 'Update Employee',
  create_reservation: 'New Reservation',
  update_reservation_status: 'Update Reservation',
  assign_table: 'Assign Table',
  create_event: 'New Event',
  update_event: 'Update Event',
  record_stock_movement: 'Stock Movement',
  create_purchase_order: 'Purchase Order',
  record_daily_sales: 'Record Sales',
  record_expense: 'Record Expense',
  close_register: 'Close Register',
  analyze_trends: 'Trends',
  compare_periods: 'Compare',
  employee_performance: 'Performance',
  profit_analysis: 'P&L Analysis',
  query_tax_data: 'Tax Data',
  generate_tax_form_url: 'Tax Form',
  get_cocktail_recipe: 'Recipe',
  get_cocktail_cost: 'Cost',
  search_cocktails_by_ingredient: 'Cocktail Search',
  get_cocktail_preparation_guide: 'Prep Guide',
  suggest_cocktail: 'Cocktail Suggestion',
  save_tax_declaration: 'Tax Declaration',
  delegate_document_generator: 'Document Generator',
  delegate_web_researcher: 'Web Research',
  delegate_schedule_optimizer: 'Schedule Optimizer',
  delegate_sports_events: 'Sports Events',
  delegate_compliance_auditor: 'Compliance Auditor',
  delegate_financial_reporter: 'Financial Reporter',
  delegate_marketing_campaign: 'Marketing Campaign',
  get_training_guide: 'Training Guide',
  get_training_compliance: 'Compliance',
  get_task_templates: 'Task Templates',
  get_overdue_tasks: 'Overdue Tasks',
  get_business_resource: 'Resource',
  generate_image: 'Image',
  create_task_from_template: 'Create Task',
  // New tools
  get_employees: 'Employees',
  get_employee_details: 'Employee Details',
  get_leave_requests: 'Leave Requests',
  get_employee_availability: 'Availability',
  get_schedule_plans: 'Schedule Plans',
  create_task: 'Create Task',
  update_task_status: 'Update Task',
  create_leave_request: 'Leave Request',
  export_to_excel: 'Excel Export',
  batch_create_events: 'Create Events (Batch)',
}

interface ChatToolStatusProps {
  /** Tools currently being executed */
  activeTools: string[]
  /** Tools that have completed */
  completedTools?: string[]
  /** Tools that errored */
  errorTools?: string[]
}

export function ChatToolStatus({ activeTools, completedTools, errorTools }: ChatToolStatusProps) {
  const [expanded, setExpanded] = useState(false)

  const allTools = [
    ...activeTools.map(t => ({ name: t, status: 'active' as const })),
    ...(errorTools || []).map(t => ({ name: t, status: 'error' as const })),
    ...(completedTools || []).map(t => ({ name: t, status: 'done' as const })),
  ]

  if (allTools.length === 0) return null

  const visibleTools = expanded ? allTools : allTools.slice(0, 3)
  const hiddenCount = allTools.length - 3

  return (
    <div className="my-1.5 space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {visibleTools.map(tool => (
          <div
            key={`${tool.status}-${tool.name}`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors',
              tool.status === 'active' && 'border-primary/30 bg-primary/5 text-foreground',
              tool.status === 'done' && 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400',
              tool.status === 'error' && 'border-destructive/30 bg-destructive/5 text-destructive',
            )}
          >
            {tool.status === 'active' && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            {tool.status === 'done' && <Check className="h-3 w-3" />}
            {tool.status === 'error' && <X className="h-3 w-3" />}
            <span className="font-medium">{toolLabels[tool.name] || tool.name}</span>
          </div>
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Show less' : `+${hiddenCount} more`}
        </button>
      )}
    </div>
  )
}

export { toolLabels }
