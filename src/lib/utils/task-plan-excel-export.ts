import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { PlannedTask, WeeklyTaskPlan } from '@/types'

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'FFFF4444',
  high: 'FFFF8800',
  medium: 'FF4488FF',
  low: 'FF88CC88',
}

const PRIORITY_FONT: Record<string, string> = {
  urgent: 'FFFFFFFF',
  high: 'FFFFFFFF',
  medium: 'FFFFFFFF',
  low: 'FF000000',
}

interface ExportOptions {
  plan: WeeklyTaskPlan | null
  tasksByDay: Record<number, PlannedTask[]>
  weekStartStr: string
  dayLabels: string[]
  weekDates: string[]
  dailyStats: Record<number, { count: number; minutes: number }>
}

export async function exportTaskPlanExcel({
  plan,
  tasksByDay,
  weekStartStr,
  dayLabels,
  weekDates,
  dailyStats,
}: ExportOptions) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GrandCafe Cheers'
  workbook.created = new Date()

  // ============ SHEET 1: Overview Grid ============
  const overview = workbook.addWorksheet('Task Plan', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  })

  // Title
  overview.mergeCells('A1:H1')
  const titleCell = overview.getCell('A1')
  titleCell.value = `Weekly Task Plan — ${weekStartStr}`
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1a1a2e' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  overview.getRow(1).height = 30

  // Status
  overview.mergeCells('A2:H2')
  const statusCell = overview.getCell('A2')
  statusCell.value = `Status: ${plan?.status || 'no plan'} | Generated: ${new Date().toLocaleString()}`
  statusCell.font = { size: 9, color: { argb: 'FF666666' } }
  statusCell.alignment = { horizontal: 'center' }

  // Headers
  const headerRow = overview.addRow(['#', ...dayLabels.map((l, i) => `${l}\n${weekDates[i]?.slice(5) || ''}`)])
  headerRow.height = 32
  headerRow.eachCell((cell, _colNumber) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2d3748' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  // Find all unique tasks across all days
  const allTasks = Object.values(tasksByDay).flat()
  const uniqueTitles = [...new Set(allTasks.map(t => t.title))]

  // Rows: one per unique task title
  uniqueTitles.forEach((title, idx) => {
    const row = overview.addRow([
      idx + 1,
      ...dayLabels.map((_, dayIdx) => {
        const task = tasksByDay[dayIdx]?.find(t => t.title === title)
        if (!task) return ''
        const assignee = task.assigned_employee?.profile?.full_name || task.assigned_role || ''
        return assignee ? `${task.priority[0].toUpperCase()} | ${assignee}` : task.priority[0].toUpperCase()
      }),
    ])

    // Style cells by priority
    row.eachCell((cell, colNumber) => {
      if (colNumber === 1) {
        cell.font = { size: 9 }
        cell.value = title
        return
      }
      const dayIdx = colNumber - 2
      const task = tasksByDay[dayIdx]?.find(t => t.title === title)
      if (task) {
        const bgColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
        const fontColor = PRIORITY_FONT[task.priority] || 'FF000000'
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
        cell.font = { size: 8, color: { argb: fontColor } }
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFe2e8f0' } },
        bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } },
        left: { style: 'thin', color: { argb: 'FFe2e8f0' } },
        right: { style: 'thin', color: { argb: 'FFe2e8f0' } },
      }
    })
  })

  // Totals row
  const totalsRow = overview.addRow([
    'TOTAL',
    ...dayLabels.map((_, i) => {
      const s = dailyStats[i]
      return s ? `${s.count} tasks\n${s.minutes}min` : '—'
    }),
  ])
  totalsRow.eachCell((cell) => {
    cell.font = { bold: true, size: 9 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf7fafc' } }
    cell.alignment = { horizontal: 'center', wrapText: true }
    cell.border = { top: { style: 'medium' } }
  })

  // Column widths
  overview.getColumn(1).width = 30
  for (let i = 2; i <= 8; i++) {
    overview.getColumn(i).width = 16
  }

  // ============ SHEET 2: Detailed List ============
  const detail = workbook.addWorksheet('Task Details')

  const detailHeaders = ['Day', 'Title', 'Priority', 'Shift', 'Assigned To', 'Role', 'Zone', 'Est. Min', 'Status']
  const detailHeaderRow = detail.addRow(detailHeaders)
  detailHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2d3748' } }
  })

  for (let day = 0; day < 7; day++) {
    const dayTasks = tasksByDay[day] || []
    for (const task of dayTasks) {
      const row = detail.addRow([
        `${dayLabels[day]} ${weekDates[day]?.slice(5) || ''}`,
        task.title,
        task.priority,
        task.shift_type || '—',
        task.assigned_employee?.profile?.full_name || '—',
        task.assigned_role || '—',
        task.section?.name || '—',
        task.estimated_minutes || '—',
        task.status,
      ])

      // Priority color
      const bgColor = PRIORITY_COLORS[task.priority]
      if (bgColor) {
        row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
        row.getCell(3).font = { color: { argb: PRIORITY_FONT[task.priority] || 'FF000000' }, size: 9 }
      }
    }
  }

  // Auto-width
  detail.columns.forEach(col => { col.width = 16 })
  detail.getColumn(2).width = 35

  // Legend
  detail.addRow([])
  detail.addRow(['Priority Legend:'])
  const legendEntries = [
    { label: 'Urgent', color: PRIORITY_COLORS.urgent },
    { label: 'High', color: PRIORITY_COLORS.high },
    { label: 'Medium', color: PRIORITY_COLORS.medium },
    { label: 'Low', color: PRIORITY_COLORS.low },
  ]
  for (const entry of legendEntries) {
    const row = detail.addRow([entry.label])
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: entry.color } }
    row.getCell(1).font = { color: { argb: 'FFFFFFFF' }, size: 9 }
  }

  // Download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveAs(blob, `task-plan-${weekStartStr}.xlsx`)
}
