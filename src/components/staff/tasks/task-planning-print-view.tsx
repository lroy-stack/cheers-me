'use client'

import { forwardRef, Fragment } from 'react'
import type { PlannedTask, WeeklyTaskPlan, TaskDepartmentGroup } from '@/types'
import type { UserRole } from '@/types'
import { PRINT_SECTOR_ROLES } from '@/lib/constants/schedule'
import type { PrintSector } from './task-plan-toolbar'
import { useTranslations } from 'next-intl'

interface TaskPlanningPrintViewProps {
  plan: WeeklyTaskPlan | null
  departmentGroups: TaskDepartmentGroup[]
  weekDates: string[]
  grandTotal: { tasks: number; minutes: number; employees: number }
  printSector?: PrintSector
  printGroups?: Record<string, string[]>
}

function filterBySector(
  groups: TaskDepartmentGroup[],
  sector: PrintSector = 'all',
  printGroups?: Record<string, string[]>
): TaskDepartmentGroup[] {
  if (sector === 'all') return groups
  const sectorMap = printGroups || PRINT_SECTOR_ROLES
  const allowedRoles = (sectorMap[sector] || []) as UserRole[]
  return groups.filter((g) => allowedRoles.includes(g.role as UserRole))
}

export const TaskPlanningPrintView = forwardRef<HTMLDivElement, TaskPlanningPrintViewProps>(
  function TaskPlanningPrintView({ plan, departmentGroups, weekDates, grandTotal, printSector = 'all', printGroups }, ref) {
    const t = useTranslations('staff')
    const filteredGroups = filterBySector(departmentGroups, printSector, printGroups)

    const dayLabels = [
      t('taskPlanning.dayMon'), t('taskPlanning.dayTue'), t('taskPlanning.dayWed'),
      t('taskPlanning.dayThu'), t('taskPlanning.dayFri'), t('taskPlanning.daySat'), t('taskPlanning.daySun'),
    ]

    // Recalculate totals for filtered groups
    const filteredTotal = {
      tasks: filteredGroups.reduce((s, g) => s + g.totalTasks, 0),
      minutes: filteredGroups.reduce((s, g) => s + g.totalMinutes, 0),
      employees: filteredGroups.reduce((s, g) => s + g.employees.length, 0),
    }
    const displayTotal = printSector === 'all' ? grandTotal : filteredTotal

    const sectorLabel = printSector !== 'all'
      ? ` — ${printSector.charAt(0).toUpperCase() + printSector.slice(1)}`
      : ''

    return (
      <div ref={ref} className="print-view hidden print:block">
        <style>{`
          @media print {
            @page { size: A4 landscape; margin: 12mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .print-view { display: block !important; }
          }
          .print-priority-urgent { border-left: 3px solid #ef4444 !important; }
          .print-priority-high { border-left: 3px solid #f97316 !important; }
          .print-priority-medium { border-left: 3px solid #3b82f6 !important; }
          .print-priority-low { border-left: 3px solid #22c55e !important; }
        `}</style>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
            GRANDCAFE CHEERS — {t('taskPlanning.title')}{sectorLabel}
          </h1>
          <p style={{ fontSize: '12px', margin: '4px 0', color: '#666' }}>
            {weekDates[0]} — {weekDates[6]} · {plan?.status === 'published' ? t('taskPlanning.published') : t('taskPlanning.draft')}
          </p>
        </div>

        {/* Grid */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'left', minWidth: '120px', backgroundColor: '#e5e7eb' }}>
                {t('taskPlanning.employeeColumn')}
              </th>
              {dayLabels.map((label, i) => (
                <th
                  key={i}
                  style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center', backgroundColor: '#e5e7eb' }}
                >
                  {label}<br />
                  <span style={{ fontWeight: 'normal', color: '#666' }}>{weekDates[i]?.slice(5)}</span>
                </th>
              ))}
              <th style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'right', backgroundColor: '#e5e7eb' }}>
                {t('taskPlanning.totalColumn')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map((group) => (
              <Fragment key={group.role}>
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      border: '1px solid #ccc',
                      padding: '3px 6px',
                      fontWeight: 'bold',
                      backgroundColor: '#e5e7eb',
                      fontSize: '9px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.has(`employees.departments.${group.role}`)
                      ? t(`employees.departments.${group.role}`)
                      : group.label}
                    {' '}({group.employees.length})
                  </td>
                </tr>
                {group.employees.map((row) => (
                  <tr key={row.employee.id}>
                    <td style={{ border: '1px solid #ccc', padding: '3px 6px', fontWeight: 500 }}>
                      {row.employee.profile.full_name || row.employee.profile.email}
                    </td>
                    {weekDates.map((date) => {
                      const cell = row.cells[date]
                      return (
                        <td key={date} style={{ border: '1px solid #ccc', padding: '2px', verticalAlign: 'top' }}>
                          {cell && cell.tasks.length > 0 ? (
                            <div>
                              {cell.tasks.map((task: PlannedTask) => (
                                <div
                                  key={task.id}
                                  className={`print-priority-${task.priority}`}
                                  style={{
                                    paddingLeft: '4px',
                                    marginBottom: '2px',
                                    fontSize: '8px',
                                    lineHeight: '1.2',
                                  }}
                                >
                                  <span style={{ fontWeight: 500 }}>{task.title}</span>
                                  {task.estimated_minutes ? (
                                    <span style={{ color: '#999', marginLeft: '2px' }}>
                                      {task.estimated_minutes}m
                                    </span>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#ccc' }}>—</span>
                          )}
                        </td>
                      )
                    })}
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right', fontWeight: 'bold' }}>
                      {row.totalTasks}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        {/* Totals + Legend */}
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>{t('taskPlanning.totalTasks')}: {displayTotal.tasks}</span>
            <span>{t('taskPlanning.estMinutes')}: {displayTotal.minutes}</span>
            <span>{t('taskPlanning.employeesAssigned')}: {displayTotal.employees}</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {(['urgent', 'high', 'medium', 'low'] as const).map((p) => {
              const colors = { urgent: '#ef4444', high: '#f97316', medium: '#3b82f6', low: '#22c55e' }
              return (
                <span key={p} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: colors[p], borderRadius: '2px' }} />
                  {t(`taskPlanning.priority${p.charAt(0).toUpperCase() + p.slice(1)}`)}
                </span>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginTop: '16px', borderTop: '1px solid #ccc', paddingTop: '8px' }}>
          <p style={{ fontSize: '9px', fontWeight: 'bold' }}>{t('taskPlanning.printNotes')}</p>
          <div style={{ height: '40px' }} />
        </div>
      </div>
    )
  }
)
