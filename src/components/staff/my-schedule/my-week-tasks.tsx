'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { format, addDays, subDays, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, ListTodo } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface MyWeekTasksProps {
  employeeId: string
  weekStart: Date
  onWeekChange: (date: Date) => void
}

interface PlannedTask {
  id: string
  title: string
  day_of_week: number
  priority: string
  status: string
  assigned_employee: {
    id: string
    profile: { id: string; full_name: string | null; role: string; avatar_url: string | null }
  } | null
  section: { id: string; name: string } | null
  template: { id: string; title: string } | null
}

interface TaskPlan {
  id: string
  week_start_date: string
  planned_tasks: PlannedTask[]
}

export function MyWeekTasks({ employeeId, weekStart, onWeekChange }: MyWeekTasksProps) {
  const t = useTranslations('staff.mySchedule')
  const [plan, setPlan] = useState<TaskPlan | null>(null)
  const [loading, setLoading] = useState(true)

  const weekStr = format(weekStart, 'yyyy-MM-dd')

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/staff/task-plans?week=${weekStr}`)
        if (res.ok) {
          const data = await res.json()
          setPlan(data)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [weekStr])

  const dayKeys = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const

  const myTasks = useMemo(() => {
    if (!plan?.planned_tasks) return []
    return plan.planned_tasks.filter(
      (task) => task.assigned_employee?.id === employeeId
    )
  }, [plan, employeeId])

  const tasksByDay = useMemo(() => {
    const grouped: Record<number, PlannedTask[]> = {}
    for (const task of myTasks) {
      if (!grouped[task.day_of_week]) grouped[task.day_of_week] = []
      grouped[task.day_of_week].push(task)
    }
    return grouped
  }, [myTasks])

  const priorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive' as const
      case 'high': return 'destructive' as const
      case 'medium': return 'default' as const
      default: return 'secondary' as const
    }
  }

  const handlePrev = () => onWeekChange(subDays(weekStart, 7))
  const handleNext = () => onWeekChange(addDays(weekStart, 7))
  const handleToday = () => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))

  return (
    <div className="space-y-4">
      {/* Week Navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {t('weekOf', { date: format(weekStart, 'dd MMM yyyy') })}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleToday}>
          {t('today')}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : myTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListTodo className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t('noTasks')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
            const tasks = tasksByDay[dayIdx]
            if (!tasks || tasks.length === 0) return null
            const dayDate = addDays(weekStart, dayIdx)
            return (
              <div key={dayIdx}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  {t(dayKeys[dayIdx])} — {format(dayDate, 'dd MMM')}
                </h3>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <Card key={task.id}>
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {task.template?.title || task.title}
                          </span>
                          {task.section && (
                            <Badge variant="outline" className="text-xs">
                              {task.section.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={priorityVariant(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {task.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer link */}
      <div className="flex justify-end">
        <Button variant="link" asChild>
          <Link href="/staff/tasks">{t('viewAllTasks')} →</Link>
        </Button>
      </div>
    </div>
  )
}
