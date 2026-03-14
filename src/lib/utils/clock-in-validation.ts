/**
 * Clock-in validation: grace period, early/late detection, no-shift warnings.
 *
 * Rules (based on industry best practices + Spanish labor law):
 * - > 30 min before shift → BLOCK (too early)
 * - 15-30 min before shift → WARNING (early)
 * - 0-15 min before shift → OK (normal grace period)
 * - After shift start → WARNING (late, with minutes)
 * - No shift today → WARNING (allow clock-in but flag)
 */

export type ShiftWarningType = 'blocked_too_early' | 'early' | 'late' | 'no_shift_today'

export interface ShiftWarning {
  type: ShiftWarningType
  message: string
  minutes_until_shift?: number
  minutes_late?: number
  blocked: boolean
}

interface ShiftInfo {
  start_time: string // "HH:MM" or "HH:MM:SS"
  end_time: string
  shift_type?: string
}

/**
 * Validate clock-in timing against the assigned shift.
 * @param shift - The employee's shift for today (null if none)
 * @param timezone - IANA timezone (default: Europe/Madrid)
 * @returns ShiftWarning or null if clock-in is within normal window
 */
export function validateClockInTiming(
  shift: ShiftInfo | null,
  timezone = 'Europe/Madrid'
): ShiftWarning | null {
  if (!shift) {
    return {
      type: 'no_shift_today',
      message: 'You have no shift scheduled today. Clock-in will be recorded as unscheduled.',
      blocked: false,
    }
  }

  // Parse shift start time
  const startParts = shift.start_time.split(':')
  const shiftStartHour = parseInt(startParts[0])
  const shiftStartMin = parseInt(startParts[1])

  // Get current time in restaurant timezone
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const timeParts = formatter.format(now).split(':')
  const nowHour = parseInt(timeParts[0])
  const nowMin = parseInt(timeParts[1])

  const nowTotalMin = nowHour * 60 + nowMin
  let shiftTotalMin = shiftStartHour * 60 + shiftStartMin

  // Handle overnight shifts (e.g. shift starts at 22:00, now is 21:00)
  if (shiftTotalMin < nowTotalMin - 12 * 60) {
    shiftTotalMin += 24 * 60
  }

  const minutesUntilShift = shiftTotalMin - nowTotalMin

  // > 30 min early → block
  if (minutesUntilShift > 30) {
    return {
      type: 'blocked_too_early',
      message: `Your shift starts in ${minutesUntilShift} minutes. You cannot clock in yet.`,
      minutes_until_shift: minutesUntilShift,
      blocked: true,
    }
  }

  // 15-30 min early → warning
  if (minutesUntilShift > 15) {
    return {
      type: 'early',
      message: `Your shift starts in ${minutesUntilShift} minutes. You are clocking in early.`,
      minutes_until_shift: minutesUntilShift,
      blocked: false,
    }
  }

  // 0-15 min early → OK (normal grace period)
  if (minutesUntilShift >= 0) {
    return null
  }

  // Late (shift already started)
  const minutesLate = Math.abs(minutesUntilShift)
  if (minutesLate > 5) {
    return {
      type: 'late',
      message: `Your shift started ${minutesLate} minutes ago.`,
      minutes_late: minutesLate,
      blocked: false,
    }
  }

  return null
}
