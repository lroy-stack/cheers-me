'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Euro, Calendar, Clock, User } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface TipRecord {
  id: string
  amount: number
  created_at: string
  shift: {
    id: string
    date: string
    shift_type: string
    start_time: string
    end_time: string
  }
  employee: {
    id: string
    profile: {
      full_name: string
    }
  }
}

interface TipsListProps {
  tips: TipRecord[]
  showEmployee?: boolean
}

export function TipsList({ tips, showEmployee = true }: TipsListProps) {
  const t = useTranslations('sales')
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getShiftTypeBadgeColor = (shiftType: string) => {
    switch (shiftType) {
      case 'morning':
        return 'bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary'
      case 'afternoon':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'night':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300'
      default:
        return 'bg-muted text-foreground dark:bg-card dark:text-muted-foreground'
    }
  }

  const totalTips = tips.reduce((sum, tip) => sum + tip.amount, 0)

  if (tips.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Euro className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('tips.noTips')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Tips History</CardTitle>
            <CardDescription>{tips.length} tip records</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
              {formatCurrency(totalTips)}
            </p>
            <p className="text-xs text-muted-foreground">{t('tips.totalTips')}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tips.date')}</TableHead>
                {showEmployee && <TableHead>{t('tips.employee')}</TableHead>}
                <TableHead>Shift</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">{t('tips.amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tips.map((tip) => (
                <TableRow key={tip.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(parseISO(tip.shift.date), 'MMM d, yyyy')}
                    </div>
                  </TableCell>
                  {showEmployee && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {tip.employee.profile.full_name}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge className={getShiftTypeBadgeColor(tip.shift.shift_type)}>
                      {tip.shift.shift_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {tip.shift.start_time} - {tip.shift.end_time}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(tip.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {tips.map((tip) => (
            <div
              key={tip.id}
              className="border rounded-lg p-4 space-y-2 bg-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {tip.employee.profile.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(tip.shift.date), 'MMM d, yyyy')}
                  </p>
                </div>
                <p className="text-lg font-bold text-pink-600 dark:text-pink-400">
                  {formatCurrency(tip.amount)}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <Badge className={getShiftTypeBadgeColor(tip.shift.shift_type)}>
                  {tip.shift.shift_type}
                </Badge>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {tip.shift.start_time} - {tip.shift.end_time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
