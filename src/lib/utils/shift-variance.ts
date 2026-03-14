import type { ClockOutSummary } from '@/types'

export const EMOJI_RATINGS = ['😡', '😕', '😐', '🙂', '😄']

export const ANOMALY_THRESHOLD_MINUTES = 15

export const ANOMALY_REASONS = [
  'high_demand',
  'understaffed',
  'equipment_issue',
  'personal_decision',
  'other',
] as const

export type AnomalyReason = typeof ANOMALY_REASONS[number]

export interface ShiftVariance {
  scheduledMinutes: number
  workedMinutes: number
  varianceMinutes: number
  breakVarianceMinutes: number
  hasAnomaly: boolean
  anomalyType: 'overtime' | 'undertime' | 'break_variance' | null
}

export function calculateShiftVariance(
  summary: ClockOutSummary,
  standardBreakMinutes = 30
): ShiftVariance | null {
  if (!summary.scheduled_shift) return null

  const startParts = summary.scheduled_shift.start_time.split(':')
  const endParts = summary.scheduled_shift.end_time.split(':')
  const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1])
  let endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1])
  if (endMinutes < startMinutes) endMinutes += 24 * 60
  const scheduledMinutes = endMinutes - startMinutes

  const varianceMinutes = summary.total_minutes - scheduledMinutes
  const breakVarianceMinutes = summary.break_minutes - standardBreakMinutes

  let anomalyType: ShiftVariance['anomalyType'] = null
  if (varianceMinutes > ANOMALY_THRESHOLD_MINUTES) anomalyType = 'overtime'
  else if (varianceMinutes < -ANOMALY_THRESHOLD_MINUTES) anomalyType = 'undertime'
  else if (Math.abs(breakVarianceMinutes) > ANOMALY_THRESHOLD_MINUTES) anomalyType = 'break_variance'

  return {
    scheduledMinutes,
    workedMinutes: summary.net_minutes,
    varianceMinutes,
    breakVarianceMinutes,
    hasAnomaly: anomalyType !== null,
    anomalyType,
  }
}
