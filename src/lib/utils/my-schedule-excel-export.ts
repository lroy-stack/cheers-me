import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { format, parseISO } from 'date-fns'
import { SHIFT_TYPE_CONFIG, SHIFT_TYPE_TO_CELL_TYPE } from '@/lib/constants/schedule'
import type { ShiftWithEmployee } from '@/types'

const SHIFT_COLORS: Record<string, string> = {
  M: 'FFF3E0',
  T: 'E3F2FD',
  N: 'F3E5F5',
  P: 'E8F5E9',
  D: 'F5F5F5',
}

const SHIFT_FONT_COLORS: Record<string, string> = {
  M: 'E65100',
  T: '1565C0',
  N: '6A1B9A',
  P: '2E7D32',
  D: '757575',
}

interface ExportOptions {
  employeeName: string
  weekStart: Date
  weekDays: string[]
  dayLabels: string[]
  shifts: ShiftWithEmployee[]
}

export async function exportMyScheduleToExcel(options: ExportOptions) {
  const { employeeName, weekStart, weekDays, dayLabels, shifts } = options

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GrandCafe Cheers'
  workbook.created = new Date()

  const weekLabel = `${format(weekStart, 'dd MMM yyyy')} - ${format(parseISO(weekDays[weekDays.length - 1]), 'dd MMM yyyy')}`
  const sheet = workbook.addWorksheet(employeeName, {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  })

  // Title
  sheet.mergeCells(1, 1, 1, 5)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = `${employeeName} — ${weekLabel}`
  titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 30

  // Headers
  const headers = ['Day', 'Date', 'Shift Type', 'Schedule', 'Hours']
  const headerRow = sheet.getRow(3)
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1A237E' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  })
  headerRow.height = 24

  // Column widths
  sheet.getColumn(1).width = 12
  sheet.getColumn(2).width = 14
  sheet.getColumn(3).width = 16
  sheet.getColumn(4).width = 22
  sheet.getColumn(5).width = 10

  // Build shift map
  const shiftByDate = new Map<string, ShiftWithEmployee>()
  for (const shift of shifts) {
    if (shift.status !== 'cancelled') {
      shiftByDate.set(shift.date, shift)
    }
  }

  let totalHours = 0

  weekDays.forEach((date, i) => {
    const row = sheet.getRow(4 + i)
    const shift = shiftByDate.get(date)
    const cellType = shift ? SHIFT_TYPE_TO_CELL_TYPE[shift.shift_type] : null
    const config = cellType ? SHIFT_TYPE_CONFIG[cellType] : null

    row.getCell(1).value = dayLabels[i]
    row.getCell(2).value = format(parseISO(date), 'dd/MM/yyyy')

    if (shift && config && cellType) {
      row.getCell(3).value = config.label
      if (cellType === 'P' && shift.second_start_time) {
        row.getCell(4).value = `${shift.start_time}-${shift.end_time} / ${shift.second_start_time}-${shift.second_end_time}`
      } else {
        row.getCell(4).value = `${shift.start_time}-${shift.end_time}`
      }
      row.getCell(5).value = config.hours
      totalHours += config.hours

      // Colors
      if (SHIFT_COLORS[cellType]) {
        for (let col = 1; col <= 5; col++) {
          row.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: SHIFT_COLORS[cellType] },
          }
        }
      }
      if (SHIFT_FONT_COLORS[cellType]) {
        row.getCell(3).font = { bold: true, size: 10, color: { argb: SHIFT_FONT_COLORS[cellType] } }
      }
    } else {
      row.getCell(3).value = '—'
      row.getCell(4).value = '—'
      row.getCell(5).value = 0
    }

    // Borders + alignment
    for (let col = 1; col <= 5; col++) {
      const cell = row.getCell(col)
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } },
      }
    }

    row.height = 22
  })

  // Total row
  const totalRow = sheet.getRow(11)
  totalRow.getCell(1).value = 'TOTAL'
  totalRow.getCell(1).font = { bold: true, size: 11 }
  totalRow.getCell(5).value = totalHours
  totalRow.getCell(5).font = { bold: true, size: 11 }
  totalRow.getCell(5).numFmt = '0.0'
  for (let col = 1; col <= 5; col++) {
    const cell = totalRow.getCell(col)
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8EAF6' } }
    cell.border = {
      top: { style: 'medium' },
      bottom: { style: 'medium' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  }
  totalRow.height = 26

  // Download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const filename = `my_schedule_${format(weekStart, 'yyyy-MM-dd')}.xlsx`
  saveAs(blob, filename)
}
