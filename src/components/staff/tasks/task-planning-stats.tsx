'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ClipboardList, Clock, Users, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface TaskPlanningStatsProps {
  grandTotal: { tasks: number; minutes: number; employees: number }
  zonesCovered: number
}

export function TaskPlanningStats({ grandTotal, zonesCovered }: TaskPlanningStatsProps) {
  const t = useTranslations('staff')

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{t('taskPlanning.totalTasks')}</p>
          </div>
          <div className="text-2xl font-bold mt-1">{grandTotal.tasks}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{t('taskPlanning.estMinutes')}</p>
          </div>
          <div className="text-2xl font-bold mt-1">{grandTotal.minutes}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{t('taskPlanning.employeesAssigned')}</p>
          </div>
          <div className="text-2xl font-bold mt-1">{grandTotal.employees}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{t('taskPlanning.zonesCovered')}</p>
          </div>
          <div className="text-2xl font-bold mt-1">{zonesCovered}</div>
        </CardContent>
      </Card>
    </div>
  )
}
