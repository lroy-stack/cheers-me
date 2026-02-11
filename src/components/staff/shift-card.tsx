'use client'

import { ShiftWithEmployee, ShiftType } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Clock, User, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface ShiftCardProps {
  shift: ShiftWithEmployee
  onEdit?: (shift: ShiftWithEmployee) => void
  onDelete?: (shift: ShiftWithEmployee) => void
  isDragging?: boolean
}

const shiftTypeColors: Record<ShiftType, string> = {
  morning: 'bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary',
  afternoon: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  night: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  split: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

export function ShiftCard({ shift, onEdit, onDelete, isDragging }: ShiftCardProps) {
  const t = useTranslations('staff')
  const employeeName = shift.employee?.profile?.full_name || 'Unknown'
  const employeeRole = shift.employee?.profile?.role || 'staff'

  // Calculate shift duration
  const startParts = shift.start_time.split(':')
  const endParts = shift.end_time.split(':')
  const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1])
  const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1])
  let durationMinutes = endMinutes - startMinutes

  // Handle overnight shifts
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60
  }

  const durationHours = ((durationMinutes - shift.break_duration_minutes) / 60).toFixed(1)

  return (
    <Card
      className={cn(
        'p-3 hover:shadow-md transition-all cursor-move',
        'border-l-4',
        shift.shift_type === 'morning' && 'border-l-amber-500',
        shift.shift_type === 'afternoon' && 'border-l-orange-500',
        shift.shift_type === 'night' && 'border-l-indigo-500',
        isDragging && 'opacity-50 rotate-2 scale-95'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Employee name */}
          <div className="flex items-center gap-2 mb-1">
            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <p className="font-medium text-sm truncate">{employeeName}</p>
          </div>

          {/* Time and duration */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>
              {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
            </span>
            <span className="text-xs">({durationHours}h)</span>
          </div>

          {/* Badges */}
          <div className="flex gap-1 flex-wrap">
            <Badge variant="outline" className={cn('text-xs', shiftTypeColors[shift.shift_type])}>
              {t(`schedule.${shift.shift_type}`)}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {employeeRole}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(shift)
                }}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(shift)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {shift.notes && (
        <p className="mt-2 text-xs text-muted-foreground italic truncate" title={shift.notes}>
          {shift.notes}
        </p>
      )}
    </Card>
  )
}
