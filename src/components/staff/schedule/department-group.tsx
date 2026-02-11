'use client'

import { DepartmentGroup as DepartmentGroupType, ScheduleCellType } from '@/types'
import { ScheduleRow } from './schedule-row'
import { TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface DepartmentGroupProps {
  group: DepartmentGroupType
  weekDates: string[]
  onSetType: (employeeId: string, date: string, type: ScheduleCellType) => void
  onOpenShiftForm?: (employeeId: string, date: string) => void
}

export function DepartmentGroup({
  group,
  weekDates,
  onSetType,
  onOpenShiftForm,
}: DepartmentGroupProps) {
  return (
    <>
      {/* Department header row */}
      <TableRow className="bg-muted/70 hover:bg-muted/70">
        <TableCell
          colSpan={weekDates.length + 2}
          className="sticky left-0 z-10 py-2"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs tracking-wider uppercase">
              {group.label}
            </span>
            <Badge variant="secondary" className="text-xs">
              {group.employees.length}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {group.totalHours.toFixed(1)}h total
            </span>
          </div>
        </TableCell>
      </TableRow>

      {/* Employee rows */}
      {group.employees.map((row) => (
        <ScheduleRow
          key={row.employee.id}
          row={row}
          weekDates={weekDates}
          onSetType={onSetType}
          onOpenShiftForm={onOpenShiftForm}
        />
      ))}
    </>
  )
}
