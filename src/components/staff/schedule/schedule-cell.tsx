'use client'

import { ScheduleCellType, ScheduleGridCell } from '@/types'
import { SHIFT_TYPE_CONFIG } from '@/lib/constants/schedule'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface ScheduleCellProps {
  cell: ScheduleGridCell
  employeeId: string
  onSetType: (employeeId: string, date: string, type: ScheduleCellType) => void
  isToday?: boolean
  onOpenShiftForm?: (employeeId: string, date: string) => void
}

export function ScheduleCell({
  cell,
  employeeId,
  onSetType,
  isToday,
  onOpenShiftForm,
}: ScheduleCellProps) {
  const [open, setOpen] = useState(false)
  const t = useTranslations('staff')

  const handleQuickAssign = (type: ScheduleCellType) => {
    onSetType(employeeId, cell.date, type)
    setOpen(false)
  }

  const config = cell.cellType ? SHIFT_TYPE_CONFIG[cell.cellType] : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-full h-12 rounded-md border text-center text-sm font-bold transition-all',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'hover:shadow-sm cursor-pointer',
            isToday && 'ring-2 ring-primary ring-offset-1',
            cell.isOnLeave && 'bg-stripes',
            cell.hasViolation && 'relative',
            config
              ? cn(config.bg, config.text, 'border-l-4', config.border)
              : 'border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-muted/50'
          )}
        >
          {cell.cellType ? (
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-base leading-none">{cell.cellType}</span>
              {cell.shift && cell.cellType === 'P' && cell.shift.second_start_time ? (
                <span className="text-[10px] opacity-70 leading-none mt-0.5">
                  {cell.shift.start_time}-{cell.shift.end_time} / {cell.shift.second_start_time}-{cell.shift.second_end_time}
                </span>
              ) : cell.shift && cell.cellType !== 'D' ? (
                <span className="text-[10px] opacity-70 leading-none mt-0.5">
                  {cell.shift.start_time?.slice(0, 5)}-{cell.shift.end_time?.slice(0, 5)}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-muted-foreground/40 text-lg">+</span>
          )}
          {cell.hasViolation && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
          )}
          {cell.isOnLeave && !cell.cellType && (
            <span className="text-xs text-muted-foreground">{t('schedule.onLeave')}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="center">
        <div className="space-y-2">
          <div className="grid grid-cols-6 gap-1">
            {(['M', 'T', 'N', 'P', 'D'] as const).map((type) => {
              const c = SHIFT_TYPE_CONFIG[type]
              return (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-9 font-bold',
                    cell.cellType === type && cn(c.bg, c.text),
                    c.border,
                    'border-l-4'
                  )}
                  onClick={() => handleQuickAssign(type)}
                >
                  {type}
                </Button>
              )
            })}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground"
              onClick={() => handleQuickAssign(null)}
            >
              {t('schedule.clear')}
            </Button>
          </div>
          {onOpenShiftForm && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                onOpenShiftForm(employeeId, cell.date)
                setOpen(false)
              }}
            >
              {cell.shift ? t('schedule.editDetails') : t('schedule.customTime')}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
