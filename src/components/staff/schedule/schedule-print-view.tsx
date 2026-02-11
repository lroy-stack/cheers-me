'use client'

import { DepartmentGroup } from '@/types'
import { SHIFT_TYPE_CONFIG, PRINT_SECTOR_ROLES } from '@/lib/constants/schedule'
import type { UserRole } from '@/types'
import { format, parseISO } from 'date-fns'
import { useTranslations } from 'next-intl'
import { PrintSector } from './schedule-toolbar'

interface ShiftTemplate {
  label: string
  start: string
  end: string
  break: number
  secondStart?: string
  secondEnd?: string
}

interface SchedulePrintViewProps {
  departmentGroups: DepartmentGroup[]
  weekDates: string[]
  dailyTotals: Record<string, { hours: number; count: number }>
  grandTotal: { hours: number; cost: number; employees: number }
  weekStart: Date
  mode: 'weekly' | 'daily'
  dailyDate?: string
  printSector?: PrintSector
  printGroups?: Record<string, string[]>
  shiftTemplates?: Record<string, ShiftTemplate>
}

function filterBySector(
  groups: DepartmentGroup[],
  sector: PrintSector = 'all',
  printGroups?: Record<string, string[]>
): DepartmentGroup[] {
  if (sector === 'all') return groups
  const sectorMap = printGroups || PRINT_SECTOR_ROLES
  const allowedRoles = (sectorMap[sector] || []) as UserRole[]
  return groups.filter((g) => allowedRoles.includes(g.role))
}

export function SchedulePrintView({
  departmentGroups,
  weekDates,
  dailyTotals,
  grandTotal,
  weekStart,
  mode,
  dailyDate,
  printSector = 'all',
  printGroups,
  shiftTemplates,
}: SchedulePrintViewProps) {
  const t = useTranslations('staff')
  const filteredGroups = filterBySector(departmentGroups, printSector, printGroups)

  if (mode === 'daily' && dailyDate) {
    return <DailyPrintView departmentGroups={filteredGroups} date={dailyDate} />
  }

  const dayLabels = [
    t('schedule.dayMon'), t('schedule.dayTue'), t('schedule.dayWed'),
    t('schedule.dayThu'), t('schedule.dayFri'), t('schedule.daySat'), t('schedule.daySun'),
  ]

  return (
    <div className="print-view hidden print:block">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-view { display: block !important; }
        }
        .print-cell-M { background-color: ${SHIFT_TYPE_CONFIG.M.printBg} !important; }
        .print-cell-T { background-color: ${SHIFT_TYPE_CONFIG.T.printBg} !important; }
        .print-cell-N { background-color: ${SHIFT_TYPE_CONFIG.N.printBg} !important; }
        .print-cell-P { background-color: ${SHIFT_TYPE_CONFIG.P.printBg} !important; }
        .print-cell-D { background-color: ${SHIFT_TYPE_CONFIG.D.printBg} !important; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
          {t('schedule.printWeeklyTitle')}
        </h1>
        <p style={{ fontSize: '12px', margin: '4px 0' }}>
          {format(weekStart, 'dd MMM')} - {format(parseISO(weekDates[6]), 'dd MMM yyyy')}
        </p>
      </div>

      {/* Grid */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'left', minWidth: '120px' }}>
              {t('schedule.printEmployee')}
            </th>
            {weekDates.map((date, i) => (
              <th key={date} style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center', minWidth: '60px' }}>
                {dayLabels[i]}<br />{format(parseISO(date), 'd')}
              </th>
            ))}
            <th style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'right' }}>{t('schedule.printTotal')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredGroups.map((group) => (
            <DepartmentPrintGroup key={group.role} group={group} weekDates={weekDates} />
          ))}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 'bold', backgroundColor: '#e5e7eb' }}>
            <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{t('schedule.printTotals')}</td>
            {weekDates.map((date) => {
              const totals = dailyTotals[date] || { hours: 0 }
              return (
                <td key={date} style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>
                  {totals.hours.toFixed(1)}h
                </td>
              )
            })}
            <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'right' }}>
              {grandTotal.hours.toFixed(1)}h
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Legend */}
      <div style={{ marginTop: '10px', display: 'flex', gap: '16px', fontSize: '9px' }}>
        {(['M', 'T', 'N', 'P', 'D'] as const).map((type) => {
          const c = SHIFT_TYPE_CONFIG[type]
          const tmpl = shiftTemplates?.[type]
          const start = tmpl?.start || c.start
          const end = tmpl?.end || c.end
          const secondStart = tmpl?.secondStart || c.secondStart
          const secondEnd = tmpl?.secondEnd || c.secondEnd
          return (
            <span key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                className={`print-cell-${type}`}
                style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px solid #ccc' }}
              />
              {type} = {tmpl?.label || c.label}
              {start && type !== 'P' && ` (${start}-${end})`}
              {type === 'P' && secondStart && ` (${start}-${end} / ${secondStart}-${secondEnd})`}
            </span>
          )
        })}
      </div>

      {/* Notes area */}
      <div style={{ marginTop: '16px', borderTop: '1px solid #ccc', paddingTop: '8px' }}>
        <p style={{ fontSize: '9px', fontWeight: 'bold' }}>{t('schedule.printNotes')}</p>
        <div style={{ height: '40px' }} />
      </div>
    </div>
  )
}

function DepartmentPrintGroup({ group, weekDates }: { group: DepartmentGroup; weekDates: string[] }) {
  return (
    <>
      <tr>
        <td
          colSpan={weekDates.length + 2}
          style={{ border: '1px solid #ccc', padding: '3px 6px', fontWeight: 'bold', backgroundColor: '#e5e7eb', fontSize: '9px', textTransform: 'uppercase' }}
        >
          {group.label} ({group.employees.length})
        </td>
      </tr>
      {group.employees.map((row) => (
        <tr key={row.employee.id}>
          <td style={{ border: '1px solid #ccc', padding: '3px 6px' }}>
            {row.employee.profile.full_name || '-'}
          </td>
          {weekDates.map((date) => {
            const cell = row.cells[date]
            const ct = cell?.cellType
            return (
              <td
                key={date}
                className={ct ? `print-cell-${ct}` : ''}
                style={{
                  border: '1px solid #ccc',
                  padding: '3px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                }}
              >
                {ct || ''}
              </td>
            )
          })}
          <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right', fontWeight: 'bold' }}>
            {row.totalHours.toFixed(1)}h
          </td>
        </tr>
      ))}
    </>
  )
}

function DailyPrintView({
  departmentGroups,
  date,
}: {
  departmentGroups: DepartmentGroup[]
  date: string
}) {
  const d = parseISO(date)
  const t = useTranslations('staff')

  return (
    <div className="print-view hidden print:block">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-view { display: block !important; }
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
          {t('schedule.printDailyTitle')}
        </h1>
        <p style={{ fontSize: '14px', margin: '4px 0' }}>
          {format(d, 'EEEE dd MMMM yyyy')}
        </p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left' }}>{t('schedule.printEmployee')}</th>
            <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>{t('schedule.printShift')}</th>
            <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>{t('schedule.printSchedule')}</th>
            <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>{t('schedule.printHours')}</th>
            <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left' }}>{t('schedule.notes')}</th>
          </tr>
        </thead>
        <tbody>
          {departmentGroups.map((group) => {
            const dayEmployees = group.employees.filter((e) => e.cells[date]?.cellType)
            if (dayEmployees.length === 0) return null

            return (
              <DailyDepartmentGroup key={group.role} group={group} dayEmployees={dayEmployees} date={date} />
            )
          })}
        </tbody>
      </table>

      <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '8px' }}>
        <p style={{ fontSize: '10px', fontWeight: 'bold' }}>{t('schedule.printDayNotes')}</p>
        <div style={{ height: '60px' }} />
      </div>
    </div>
  )
}

function DailyDepartmentGroup({
  group,
  dayEmployees,
  date,
}: {
  group: DepartmentGroup
  dayEmployees: DepartmentGroup['employees']
  date: string
}) {
  return (
    <>
      <tr>
        <td colSpan={5} style={{ border: '1px solid #ccc', padding: '4px 6px', fontWeight: 'bold', backgroundColor: '#e5e7eb', fontSize: '10px' }}>
          {group.label}
        </td>
      </tr>
      {dayEmployees.map((row) => {
        const cell = row.cells[date]
        const ct = cell?.cellType
        const shift = cell?.shift

        return (
          <tr key={row.employee.id}>
            <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>
              {row.employee.profile.full_name}
            </td>
            <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>
              {ct}
            </td>
            <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>
              {shift?.start_time && shift?.end_time
                ? ct === 'P' && shift.second_start_time
                  ? `${shift.start_time}-${shift.end_time} / ${shift.second_start_time}-${shift.second_end_time}`
                  : `${shift.start_time} - ${shift.end_time}`
                : '-'}
            </td>
            <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>
              {row.totalHours > 0 ? `${row.totalHours.toFixed(1)}h` : '0h'}
            </td>
            <td style={{ border: '1px solid #ccc', padding: '4px' }}>
              {shift?.notes || ''}
            </td>
          </tr>
        )
      })}
    </>
  )
}
