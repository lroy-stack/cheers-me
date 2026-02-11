/**
 * Shared color constants for task status and priority badges
 * Used by both the DataTable UI and Excel export
 */

export const STATUS_COLORS = {
  pending: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-300',
    border: 'border-yellow-300 dark:border-yellow-700',
    excel: { fill: 'FFF9C4', font: 'F57F17' },
  },
  in_progress: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    excel: { fill: 'BBDEFB', font: '1565C0' },
  },
  completed: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
    border: 'border-green-300 dark:border-green-700',
    excel: { fill: 'C8E6C9', font: '2E7D32' },
  },
  cancelled: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
    excel: { fill: 'E0E0E0', font: '616161' },
  },
} as const

export const PRIORITY_COLORS = {
  low: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
    excel: { fill: 'ECEFF1', font: '546E7A' },
  },
  medium: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    excel: { fill: 'BBDEFB', font: '1565C0' },
  },
  high: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
    excel: { fill: 'FFE0B2', font: 'E65100' },
  },
  urgent: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    excel: { fill: 'FFCDD2', font: 'C62828' },
  },
} as const

export const COMPLIANCE_STATUS_COLORS = {
  completed: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
    excel: { fill: 'C8E6C9', font: '2E7D32' },
  },
  flagged: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    excel: { fill: 'FFCDD2', font: 'C62828' },
  },
  requires_review: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-300',
    excel: { fill: 'FFE0B2', font: 'E65100' },
  },
} as const

export const COMPLIANCE_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  ld: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300' },
  appcc: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  prl: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  receiving: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300' },
  pest_control: { bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-700 dark:text-lime-300' },
  maintenance: { bg: 'bg-muted', text: 'text-muted-foreground' },
  incident: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  training: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  other: { bg: 'bg-muted', text: 'text-muted-foreground' },
}

export type TaskStatusKey = keyof typeof STATUS_COLORS
export type TaskPriorityKey = keyof typeof PRIORITY_COLORS
export type ComplianceStatusKey = keyof typeof COMPLIANCE_STATUS_COLORS
