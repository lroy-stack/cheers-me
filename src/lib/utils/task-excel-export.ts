/**
 * Task Excel Export — Client-side export using ExcelJS + file-saver
 * Pattern follows schedule-excel-export.ts
 */

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { format } from 'date-fns'
import { StaffTaskWithDetails } from '@/types'
import { STATUS_COLORS, PRIORITY_COLORS } from './task-colors'

interface TaskExportOptions {
  tasks: StaffTaskWithDetails[]
  filename?: string
}

export async function exportTasksToExcel({ tasks, filename }: TaskExportOptions) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GrandCafe Cheers Manager'
  workbook.created = new Date()

  // ---- Sheet 1: Tasks ----
  const sheet = workbook.addWorksheet('Tasks', {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  })

  // Title row
  sheet.mergeCells(1, 1, 1, 8)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = `GRANDCAFE CHEERS — Tasks Export (${format(new Date(), 'dd MMM yyyy')})`
  titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 30

  // Header row
  const headers = ['Title', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Checklist', 'Notes', 'Created']
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
  headerRow.height = 28

  // Column widths
  sheet.getColumn(1).width = 40
  sheet.getColumn(2).width = 14
  sheet.getColumn(3).width = 12
  sheet.getColumn(4).width = 22
  sheet.getColumn(5).width = 14
  sheet.getColumn(6).width = 12
  sheet.getColumn(7).width = 30
  sheet.getColumn(8).width = 14

  // Data rows
  tasks.forEach((task, idx) => {
    const row = sheet.getRow(idx + 4)

    // Title
    row.getCell(1).value = task.title
    row.getCell(1).font = { size: 10 }
    row.getCell(1).alignment = { vertical: 'middle', wrapText: true }

    // Status
    const statusCell = row.getCell(2)
    const statusKey = task.status as keyof typeof STATUS_COLORS
    statusCell.value = task.status.replace('_', ' ').toUpperCase()
    statusCell.font = { bold: true, size: 9, color: { argb: STATUS_COLORS[statusKey]?.excel.font || '000000' } }
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_COLORS[statusKey]?.excel.fill || 'FFFFFF' } }
    statusCell.alignment = { horizontal: 'center', vertical: 'middle' }

    // Priority
    const priorityCell = row.getCell(3)
    const priorityKey = task.priority as keyof typeof PRIORITY_COLORS
    priorityCell.value = task.priority.toUpperCase()
    priorityCell.font = { bold: true, size: 9, color: { argb: PRIORITY_COLORS[priorityKey]?.excel.font || '000000' } }
    priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIORITY_COLORS[priorityKey]?.excel.fill || 'FFFFFF' } }
    priorityCell.alignment = { horizontal: 'center', vertical: 'middle' }

    // Assigned To
    row.getCell(4).value = task.assigned_employee?.profile?.full_name || 'Unassigned'
    row.getCell(4).alignment = { vertical: 'middle' }

    // Due Date
    row.getCell(5).value = task.due_date ? format(new Date(task.due_date + 'T00:00:00'), 'dd/MM/yyyy') : ''
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }

    // Checklist progress
    const completedItems = task.items?.filter(i => i.completed).length || 0
    const totalItems = task.items?.length || 0
    row.getCell(6).value = totalItems > 0 ? `${completedItems}/${totalItems}` : ''
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }

    // Notes
    row.getCell(7).value = task.notes || task.description || ''
    row.getCell(7).alignment = { vertical: 'middle', wrapText: true }

    // Created
    row.getCell(8).value = format(new Date(task.created_at), 'dd/MM/yyyy')
    row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' }

    // Borders
    for (let col = 1; col <= 8; col++) {
      row.getCell(col).border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } },
      }
    }

    row.height = 22
  })

  // ---- Sheet 2: Checklists ----
  const tasksWithItems = tasks.filter(t => t.items && t.items.length > 0)
  if (tasksWithItems.length > 0) {
    const checklistSheet = workbook.addWorksheet('Checklists')

    const clHeaders = ['Task', 'Item', 'Completed', 'Completed By', 'Completed At']
    const clHeaderRow = checklistSheet.getRow(1)
    clHeaders.forEach((h, i) => {
      const cell = clHeaderRow.getCell(i + 1)
      cell.value = h
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '455A64' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    checklistSheet.getColumn(1).width = 35
    checklistSheet.getColumn(2).width = 40
    checklistSheet.getColumn(3).width = 12
    checklistSheet.getColumn(4).width = 22
    checklistSheet.getColumn(5).width = 16

    let rowIdx = 2
    for (const task of tasksWithItems) {
      for (const item of task.items) {
        const row = checklistSheet.getRow(rowIdx)
        row.getCell(1).value = task.title
        row.getCell(2).value = item.text
        row.getCell(3).value = item.completed ? 'YES' : 'NO'
        row.getCell(3).font = {
          bold: true,
          color: { argb: item.completed ? '2E7D32' : 'C62828' },
        }
        row.getCell(3).alignment = { horizontal: 'center' }
        row.getCell(4).value = item.completed_by || ''
        row.getCell(5).value = item.completed_at
          ? format(new Date(item.completed_at), 'dd/MM/yyyy HH:mm')
          : ''
        rowIdx++
      }
    }
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const name = filename || `tasks_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  saveAs(blob, name)
}
