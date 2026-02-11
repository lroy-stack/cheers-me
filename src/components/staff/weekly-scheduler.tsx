'use client'

import { useState, useMemo } from 'react'
import { ShiftWithEmployee } from '@/types'
import { ShiftCard } from './shift-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface WeeklySchedulerProps {
  shifts: ShiftWithEmployee[]
  onShiftEdit?: (shift: ShiftWithEmployee) => void
  onShiftDelete?: (shift: ShiftWithEmployee) => void
  onShiftCreate?: (date: string) => void
  onShiftMove?: (shiftId: string, newDate: string) => Promise<void>
  loading?: boolean
}

export function WeeklyScheduler({
  shifts,
  onShiftEdit,
  onShiftDelete,
  onShiftCreate,
  onShiftMove,
  loading,
}: WeeklySchedulerProps) {
  const t = useTranslations('staff')
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  })
  const [activeId, setActiveId] = useState<string | null>(null)

  // Generate 7 days starting from Monday
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  }, [currentWeekStart])

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const grouped: Record<string, ShiftWithEmployee[]> = {}

    shifts.forEach((shift) => {
      if (!grouped[shift.date]) {
        grouped[shift.date] = []
      }
      grouped[shift.date].push(shift)
    })

    return grouped
  }, [shifts])

  const handlePreviousWeek = () => {
    setCurrentWeekStart((prev) => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1))
  }

  const handleThisWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    // Extract shift ID and new date from droppable ID
    const shiftId = active.id as string
    const newDate = over.id as string

    if (onShiftMove) {
      try {
        await onShiftMove(shiftId, newDate)
      } catch (error) {
        console.error('Failed to move shift:', error)
      }
    }
  }

  const activeShift = useMemo(() => {
    if (!activeId) return null
    return shifts.find((shift) => shift.id === activeId)
  }, [activeId, shifts])

  const getShiftsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return shiftsByDate[dateStr] || []
  }

  const isToday = (date: Date) => {
    return isSameDay(date, new Date())
  }

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{t('schedule.weekView')}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleThisWeek}>
                {t('schedule.thisWeek')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
          </p>
        </CardHeader>
      </Card>

      {/* Scheduler Grid */}
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayShifts = getShiftsForDate(day)

            return (
              <Card
                key={dateStr}
                className={cn(
                  'min-h-[400px]',
                  isToday(day) && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {format(day, 'EEE')}
                      </CardTitle>
                      <p className="text-2xl font-bold mt-1">{format(day, 'd')}</p>
                      {isToday(day) && (
                        <p className="text-xs text-primary font-medium">{t('schedule.today')}</p>
                      )}
                    </div>
                    {onShiftCreate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onShiftCreate(dateStr)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  {loading ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      {t('schedule.loading')}
                    </div>
                  ) : dayShifts.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      {t('schedule.noShifts')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayShifts
                        .sort((a, b) => a.start_time.localeCompare(b.start_time))
                        .map((shift) => (
                          <div
                            key={shift.id}
                            id={shift.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move'
                              e.dataTransfer.setData('text/plain', shift.id)
                            }}
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                            }}
                            onDrop={async (e) => {
                              e.preventDefault()
                              const shiftId = e.dataTransfer.getData('text/plain')
                              if (shiftId && shiftId !== shift.id && onShiftMove) {
                                await onShiftMove(shiftId, dateStr)
                              }
                            }}
                          >
                            <ShiftCard
                              shift={shift}
                              onEdit={onShiftEdit}
                              onDelete={onShiftDelete}
                              isDragging={activeId === shift.id}
                            />
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <DragOverlay>
          {activeShift && <ShiftCard shift={activeShift} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary" />
              <span className="text-sm">{t('schedule.morning')} {t('schedule.morningHours')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span className="text-sm">{t('schedule.afternoon')} {t('schedule.afternoonHours')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-indigo-500" />
              <span className="text-sm">{t('schedule.night')} {t('schedule.nightHours')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
