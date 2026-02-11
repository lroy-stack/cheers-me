import { ScheduleCellType, UserRole } from '@/types'

export interface ShiftTypeConfig {
  label: string
  start: string
  end: string
  break: number
  hours: number
  bg: string
  text: string
  printBg: string
  border: string
  secondStart?: string
  secondEnd?: string
}

export const SHIFT_TYPE_CONFIG: Record<NonNullable<ScheduleCellType>, ShiftTypeConfig> = {
  M: {
    label: 'Morning',
    start: '10:00',
    end: '17:00',
    break: 30,
    hours: 6.5,
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-800 dark:text-amber-300',
    printBg: '#fef3c7',
    border: 'border-l-amber-500',
  },
  T: {
    label: 'Afternoon',
    start: '17:00',
    end: '00:00',
    break: 30,
    hours: 6.5,
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    text: 'text-orange-800 dark:text-orange-300',
    printBg: '#ffedd5',
    border: 'border-l-orange-500',
  },
  N: {
    label: 'Night',
    start: '20:00',
    end: '03:00',
    break: 15,
    hours: 6.75,
    bg: 'bg-indigo-100 dark:bg-indigo-900/40',
    text: 'text-indigo-800 dark:text-indigo-300',
    printBg: '#e0e7ff',
    border: 'border-l-indigo-500',
  },
  P: {
    label: 'Split',
    start: '10:00',
    end: '14:00',
    break: 0,
    hours: 8,
    bg: 'bg-green-100 dark:bg-green-900/40',
    text: 'text-green-800 dark:text-green-300',
    printBg: '#dcfce7',
    border: 'border-l-green-500',
    secondStart: '18:00',
    secondEnd: '22:00',
  },
  D: {
    label: 'Day Off',
    start: '',
    end: '',
    break: 0,
    hours: 0,
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    printBg: '#f3f4f6',
    border: 'border-l-border',
  },
}

export const ROLE_DEPARTMENT_MAP: Record<UserRole, { label: string; labelKey: string; order: number }> = {
  waiter: { label: 'CAMAREROS', labelKey: 'employees.departments.waiter', order: 1 },
  bar: { label: 'BARTENDERS', labelKey: 'employees.departments.bar', order: 2 },
  kitchen: { label: 'COCINA', labelKey: 'employees.departments.kitchen', order: 3 },
  dj: { label: 'DJ & ENTERTAINMENT', labelKey: 'employees.departments.dj', order: 4 },
  manager: { label: 'MANAGERS', labelKey: 'employees.departments.manager', order: 5 },
  admin: { label: 'ADMINISTRACIÓN', labelKey: 'employees.departments.admin', order: 6 },
  owner: { label: 'DIRECCIÓN', labelKey: 'employees.departments.owner', order: 7 },
}

export const LABOR_CONSTRAINTS = {
  maxWeeklyHours: 40,
  minRestBetweenShifts: 12,
  minDaysOffPerWeek: 2,
  overtimeMultiplier: 1.5,
  overtimeWarningThreshold: 35,
}

export const CELL_TYPE_TO_SHIFT_TYPE: Record<NonNullable<ScheduleCellType>, string> = {
  M: 'morning',
  T: 'afternoon',
  N: 'night',
  P: 'split',
  D: 'morning', // placeholder, not used for day off
}

export const SHIFT_TYPE_TO_CELL_TYPE: Record<string, ScheduleCellType> = {
  morning: 'M',
  afternoon: 'T',
  night: 'N',
  split: 'P',
}

export const PRINT_SECTOR_ROLES: Record<string, UserRole[]> = {
  sala: ['waiter', 'bar', 'dj', 'manager', 'admin', 'owner'],
  cocina: ['kitchen'],
}
