import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { format, parseISO } from 'date-fns'
import { DepartmentGroup } from '@/types'
import { SHIFT_TYPE_CONFIG } from '@/lib/constants/schedule'

interface ShiftTemplate {
  label: string
  start: string
  end: string
  break: number
  secondStart?: string
  secondEnd?: string
}

interface ExportOptions {
  departmentGroups: DepartmentGroup[]
  weekDates: string[]
  dailyTotals: Record<string, { hours: number; count: number }>
  grandTotal: { hours: number; cost: number; employees: number }
  weekStart: Date
  dayLabels: string[]
  shiftTemplates?: Record<string, ShiftTemplate>
}

const SHIFT_COLORS: Record<string, string> = {
  M: 'FFF3E0', // warm orange bg
  T: 'E3F2FD', // light blue bg
  N: 'F3E5F5', // light purple bg
  P: 'E8F5E9', // light green bg
  D: 'F5F5F5', // grey bg
}

const SHIFT_FONT_COLORS: Record<string, string> = {
  M: 'E65100',
  T: '1565C0',
  N: '6A1B9A',
  P: '2E7D32',
  D: '757575',
}

export async function exportScheduleToExcel(options: ExportOptions) {
  const { departmentGroups, weekDates, dailyTotals, grandTotal, weekStart, dayLabels, shiftTemplates } = options

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GrandCafe Cheers Manager'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Schedule', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  })

  // -- Title row --
  const weekLabel = `${format(weekStart, 'dd MMM yyyy')} - ${format(parseISO(weekDates[weekDates.length - 1]), 'dd MMM yyyy')}`
  sheet.mergeCells(1, 1, 1, weekDates.length + 2)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = `GRANDCAFE CHEERS — Schedule: ${weekLabel}`
  titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 30

  // -- Header row --
  const headerRow = sheet.getRow(3)
  headerRow.getCell(1).value = 'Employee'
  weekDates.forEach((date, i) => {
    const dayIdx = i
    const dayLabel = dayLabels[dayIdx] || format(parseISO(date), 'EEE')
    const dateLabel = format(parseISO(date), 'dd/MM')
    headerRow.getCell(i + 2).value = `${dayLabel}\n${dateLabel}`
  })
  headerRow.getCell(weekDates.length + 2).value = 'Total'

  // Style header
  for (let col = 1; col <= weekDates.length + 2; col++) {
    const cell = headerRow.getCell(col)
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1A237E' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  }
  headerRow.height = 32

  // Set column widths
  sheet.getColumn(1).width = 24
  for (let i = 2; i <= weekDates.length + 1; i++) {
    sheet.getColumn(i).width = 14
  }
  sheet.getColumn(weekDates.length + 2).width = 10

  let currentRow = 4

  // -- Department groups --
  for (const group of departmentGroups) {
    if (group.employees.length === 0) continue

    // Department header
    const deptRow = sheet.getRow(currentRow)
    sheet.mergeCells(currentRow, 1, currentRow, weekDates.length + 2)
    deptRow.getCell(1).value = group.label
    deptRow.getCell(1).font = { bold: true, size: 10, color: { argb: 'FFFFFF' } }
    deptRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '455A64' } }
    deptRow.getCell(1).alignment = { vertical: 'middle' }
    deptRow.height = 22
    currentRow++

    // Employee rows
    for (const empRow of group.employees) {
      const row = sheet.getRow(currentRow)
      row.getCell(1).value = empRow.employee.profile?.full_name || 'Unknown'
      row.getCell(1).font = { size: 10 }
      row.getCell(1).alignment = { vertical: 'middle' }

      weekDates.forEach((date, i) => {
        const cell = empRow.cells[date]
        const excelCell = row.getCell(i + 2)

        if (cell?.cellType && (cell.cellType as string) !== 'X') {
          const type = cell.cellType
          const shift = cell.shift

          if (type === 'D') {
            excelCell.value = 'OFF'
          } else if (shift) {
            if (type === 'P' && shift.second_start_time) {
              excelCell.value = `${shift.start_time}-${shift.end_time}\n${shift.second_start_time}-${shift.second_end_time}`
            } else {
              excelCell.value = `${type} ${shift.start_time}-${shift.end_time}`
            }
          } else {
            excelCell.value = type
          }

          if (SHIFT_COLORS[type]) {
            excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SHIFT_COLORS[type] } }
          }
          if (SHIFT_FONT_COLORS[type]) {
            excelCell.font = { size: 9, color: { argb: SHIFT_FONT_COLORS[type] }, bold: true }
          }
        } else if (cell?.isOnLeave) {
          excelCell.value = 'LEAVE'
          excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECB3' } }
          excelCell.font = { size: 9, color: { argb: 'F57F17' }, italic: true }
        }

        excelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        excelCell.border = {
          top: { style: 'thin', color: { argb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
          left: { style: 'thin', color: { argb: 'E0E0E0' } },
          right: { style: 'thin', color: { argb: 'E0E0E0' } },
        }
      })

      // Total hours
      const totalCell = row.getCell(weekDates.length + 2)
      totalCell.value = empRow.totalHours
      totalCell.font = { bold: true, size: 10 }
      totalCell.alignment = { horizontal: 'center', vertical: 'middle' }
      totalCell.numFmt = '0.0'
      totalCell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } },
      }

      row.height = 20
      currentRow++
    }
  }

  // -- Totals row --
  currentRow++
  const totalsRow = sheet.getRow(currentRow)
  totalsRow.getCell(1).value = 'TOTALS'
  totalsRow.getCell(1).font = { bold: true, size: 11 }

  weekDates.forEach((date, i) => {
    const dt = dailyTotals[date]
    const cell = totalsRow.getCell(i + 2)
    cell.value = dt ? `${dt.hours.toFixed(1)}h\n${dt.count} staff` : ''
    cell.font = { bold: true, size: 9 }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8EAF6' } }
    cell.border = {
      top: { style: 'medium' },
      bottom: { style: 'medium' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  const grandTotalCell = totalsRow.getCell(weekDates.length + 2)
  grandTotalCell.value = grandTotal.hours
  grandTotalCell.font = { bold: true, size: 11 }
  grandTotalCell.numFmt = '0.0'
  grandTotalCell.alignment = { horizontal: 'center', vertical: 'middle' }
  grandTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C5CAE9' } }
  grandTotalCell.border = {
    top: { style: 'medium' },
    bottom: { style: 'medium' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  }
  totalsRow.height = 28

  // -- Legend row --
  currentRow += 2
  const legendRow = sheet.getRow(currentRow)
  sheet.mergeCells(currentRow, 1, currentRow, weekDates.length + 2)
  const legendParts = Object.entries(SHIFT_TYPE_CONFIG)
    .filter(([key]) => key !== 'X')
    .map(([key, config]) => {
      const tmpl = shiftTemplates?.[key]
      const start = tmpl?.start || config.start
      const end = tmpl?.end || config.end
      const secondStart = tmpl?.secondStart || config.secondStart
      const secondEnd = tmpl?.secondEnd || config.secondEnd
      if (key === 'D') return `${key} = Day Off`
      if (key === 'P' && secondStart) return `${key} = ${start}-${end} / ${secondStart}-${secondEnd}`
      return `${key} = ${start}-${end}`
    })
    .join('  |  ')
  legendRow.getCell(1).value = `Legend: ${legendParts}`
  legendRow.getCell(1).font = { size: 8, color: { argb: '757575' }, italic: true }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const filename = `schedule_${format(weekStart, 'yyyy-MM-dd')}.xlsx`
  saveAs(blob, filename)
}
