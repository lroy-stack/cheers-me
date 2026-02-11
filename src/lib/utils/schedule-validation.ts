import {
  ShiftWithEmployee,
  EmployeeWithProfile,
  LeaveRequest,
  Availability,
  ScheduleViolation,
  ScheduleValidationResult,
} from '@/types'
import { LABOR_CONSTRAINTS as DEFAULT_LABOR_CONSTRAINTS } from '@/lib/constants/schedule'
import { format, parseISO, differenceInHours } from 'date-fns'

export interface LaborConstraints {
  maxWeeklyHours: number
  minRestBetweenShifts: number
  minDaysOffPerWeek: number
  overtimeMultiplier: number
  overtimeWarningThreshold: number
}

function getShiftHours(shift: ShiftWithEmployee): number {
  const startParts = shift.start_time.split(':')
  const endParts = shift.end_time.split(':')
  const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1])
  const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1])
  let durationMinutes = endMinutes - startMinutes
  if (durationMinutes < 0) durationMinutes += 24 * 60

  // Add second range for split shifts
  if (shift.second_start_time && shift.second_end_time) {
    const s2Parts = shift.second_start_time.split(':')
    const e2Parts = shift.second_end_time.split(':')
    const s2Min = parseInt(s2Parts[0]) * 60 + parseInt(s2Parts[1])
    const e2Min = parseInt(e2Parts[0]) * 60 + parseInt(e2Parts[1])
    let dur2 = e2Min - s2Min
    if (dur2 < 0) dur2 += 24 * 60
    durationMinutes += dur2
  }

  return (durationMinutes - shift.break_duration_minutes) / 60
}

function getShiftEndDateTime(shift: ShiftWithEmployee): Date {
  const date = parseISO(shift.date)
  const [h, m] = shift.end_time.split(':').map(Number)
  const endDate = new Date(date)
  endDate.setHours(h, m, 0, 0)
  // If end time is earlier than start time, it's next day
  const [sh] = shift.start_time.split(':').map(Number)
  if (h < sh) {
    endDate.setDate(endDate.getDate() + 1)
  }
  return endDate
}

function getShiftStartDateTime(shift: ShiftWithEmployee): Date {
  const date = parseISO(shift.date)
  const [h, m] = shift.start_time.split(':').map(Number)
  const startDate = new Date(date)
  startDate.setHours(h, m, 0, 0)
  return startDate
}

export function validateSchedule(
  shifts: ShiftWithEmployee[],
  employees: EmployeeWithProfile[],
  leaveRequests: LeaveRequest[],
  availability: Availability[],
  constraints?: Partial<LaborConstraints>
): ScheduleValidationResult {
  const LABOR_CONSTRAINTS: LaborConstraints = {
    ...DEFAULT_LABOR_CONSTRAINTS,
    ...constraints,
  }
  const errors: ScheduleViolation[] = []
  const warnings: ScheduleViolation[] = []

  // Group shifts by employee
  const shiftsByEmployee: Record<string, ShiftWithEmployee[]> = {}
  for (const shift of shifts) {
    if (!shiftsByEmployee[shift.employee_id]) {
      shiftsByEmployee[shift.employee_id] = []
    }
    shiftsByEmployee[shift.employee_id].push(shift)
  }

  // Approved leave by employee
  const approvedLeave = leaveRequests.filter((lr) => lr.status === 'approved')
  const leaveByEmployee: Record<string, LeaveRequest[]> = {}
  for (const lr of approvedLeave) {
    if (!leaveByEmployee[lr.employee_id]) {
      leaveByEmployee[lr.employee_id] = []
    }
    leaveByEmployee[lr.employee_id].push(lr)
  }

  // Availability by employee+date
  const unavailableMap: Record<string, Set<string>> = {}
  for (const a of availability) {
    if (!a.available) {
      if (!unavailableMap[a.employee_id]) {
        unavailableMap[a.employee_id] = new Set()
      }
      unavailableMap[a.employee_id].add(a.date)
    }
  }

  for (const employee of employees) {
    const empShifts = shiftsByEmployee[employee.id] || []
    const empName = employee.profile.full_name || employee.profile.email

    // Filter out day-off shifts for hour calculations
    const workShifts = empShifts.filter((s) => !('is_day_off' in s && (s as ShiftWithEmployee & { is_day_off?: boolean }).is_day_off))

    // 1. Max weekly hours check
    const totalHours = workShifts.reduce((sum, s) => sum + getShiftHours(s), 0)

    if (totalHours > LABOR_CONSTRAINTS.maxWeeklyHours) {
      errors.push({
        employeeId: employee.id,
        employeeName: empName,
        type: 'max_hours',
        message: `${empName} has ${totalHours.toFixed(1)}h scheduled (max ${LABOR_CONSTRAINTS.maxWeeklyHours}h)`,
        severity: 'error',
      })
    } else if (totalHours > LABOR_CONSTRAINTS.overtimeWarningThreshold) {
      warnings.push({
        employeeId: employee.id,
        employeeName: empName,
        type: 'max_hours',
        message: `${empName} is approaching overtime: ${totalHours.toFixed(1)}h`,
        severity: 'warning',
      })
    }

    // 2. Min rest between consecutive shifts (12h)
    const sortedShifts = [...workShifts].sort((a, b) => {
      const aStart = getShiftStartDateTime(a)
      const bStart = getShiftStartDateTime(b)
      return aStart.getTime() - bStart.getTime()
    })

    for (let i = 0; i < sortedShifts.length - 1; i++) {
      const currentEnd = getShiftEndDateTime(sortedShifts[i])
      const nextStart = getShiftStartDateTime(sortedShifts[i + 1])
      const restHours = differenceInHours(nextStart, currentEnd)

      if (restHours < LABOR_CONSTRAINTS.minRestBetweenShifts && restHours >= 0) {
        errors.push({
          employeeId: employee.id,
          employeeName: empName,
          type: 'min_rest',
          message: `${empName} has only ${restHours}h rest between ${format(parseISO(sortedShifts[i].date), 'EEE')} and ${format(parseISO(sortedShifts[i + 1].date), 'EEE')} (min ${LABOR_CONSTRAINTS.minRestBetweenShifts}h)`,
          severity: 'error',
        })
      }
    }

    // 3. Min days off per week
    const workingDays = new Set(workShifts.map((s) => s.date))
    const daysOff = 7 - workingDays.size

    if (daysOff < LABOR_CONSTRAINTS.minDaysOffPerWeek) {
      errors.push({
        employeeId: employee.id,
        employeeName: empName,
        type: 'days_off',
        message: `${empName} has only ${daysOff} day(s) off (min ${LABOR_CONSTRAINTS.minDaysOffPerWeek})`,
        severity: 'error',
      })
    }

    // 4. Leave conflict
    const empLeave = leaveByEmployee[employee.id] || []
    for (const shift of workShifts) {
      for (const leave of empLeave) {
        if (shift.date >= leave.start_date && shift.date <= leave.end_date) {
          errors.push({
            employeeId: employee.id,
            employeeName: empName,
            type: 'leave_conflict',
            message: `${empName} has a shift on ${format(parseISO(shift.date), 'EEE dd/MM')} but is on ${leave.leave_type.replace('_', ' ')}`,
            severity: 'error',
          })
        }
      }
    }

    // 5. Availability conflict
    const empUnavailable = unavailableMap[employee.id]
    if (empUnavailable) {
      for (const shift of workShifts) {
        if (empUnavailable.has(shift.date)) {
          errors.push({
            employeeId: employee.id,
            employeeName: empName,
            type: 'availability',
            message: `${empName} is marked unavailable on ${format(parseISO(shift.date), 'EEE dd/MM')}`,
            severity: 'error',
          })
        }
      }
    }
  }

  // 6. Check Sunday coverage
  const allDates = new Set(shifts.map((s) => s.date))
  for (const dateStr of allDates) {
    const date = parseISO(dateStr)
    if (date.getDay() === 0) {
      const sundayShifts = shifts.filter((s) => s.date === dateStr && !('is_day_off' in s && (s as ShiftWithEmployee & { is_day_off?: boolean }).is_day_off))
      if (sundayShifts.length === 0) {
        warnings.push({
          employeeId: '',
          employeeName: 'Coverage',
          type: 'availability',
          message: `No staff scheduled on Sunday ${format(date, 'dd/MM')}`,
          severity: 'warning',
        })
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export function calculateShiftHours(
  startTime: string,
  endTime: string,
  breakMinutes: number,
  secondStartTime?: string | null,
  secondEndTime?: string | null,
): number {
  const startParts = startTime.split(':')
  const endParts = endTime.split(':')
  const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1])
  const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1])
  let durationMinutes = endMinutes - startMinutes
  if (durationMinutes < 0) durationMinutes += 24 * 60

  // Add second range for split shifts
  if (secondStartTime && secondEndTime) {
    const s2Parts = secondStartTime.split(':')
    const e2Parts = secondEndTime.split(':')
    const s2Min = parseInt(s2Parts[0]) * 60 + parseInt(s2Parts[1])
    const e2Min = parseInt(e2Parts[0]) * 60 + parseInt(e2Parts[1])
    let dur2 = e2Min - s2Min
    if (dur2 < 0) dur2 += 24 * 60
    durationMinutes += dur2
  }

  return (durationMinutes - breakMinutes) / 60
}
