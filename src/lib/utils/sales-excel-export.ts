import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

/**
 * Sales Excel Export Utilities
 * Client-side Excel generation using ExcelJS
 */

interface DailyReportData {
  date: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  daily_sales: any
  iva_breakdown: Array<{
    category: string
    base_imponible: number
    iva_rate: number
    iva_amount: number
    total: number
  }>
}

interface ExpenseRow {
  date: string
  category: string
  description: string
  vendor?: string
  base_imponible?: number
  iva_rate: number
  iva_amount?: number
  amount: number
  is_deductible: boolean
  factura_number?: string
  supplier_nif?: string
}

interface Modelo303ExcelData {
  quarter: string
  period_start: string
  period_end: string
  iva_repercutido: number
  iva_repercutido_by_rate: Array<{ rate: number; base: number; iva: number }>
  iva_soportado: number
  iva_soportado_by_category: Array<{ category: string; base: number; iva: number }>
  resultado: number
}

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: '1A237E' },
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 10,
  color: { argb: 'FFFFFF' },
}

const CURRENCY_FORMAT = '#,##0.00 "EUR"'

function styleHeaderRow(sheet: ExcelJS.Worksheet, rowNum: number, colCount: number) {
  const row = sheet.getRow(rowNum)
  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col)
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  }
  row.height = 24
}

/**
 * Export daily report data to Excel
 */
export async function exportDailyReportExcel(data: DailyReportData, date: string) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GrandCafe Cheers'
  workbook.created = new Date()

  // Revenue sheet
  const revenueSheet = workbook.addWorksheet('Revenue', {
    pageSetup: { paperSize: 9, orientation: 'portrait' },
  })

  // Title
  revenueSheet.mergeCells(1, 1, 1, 4)
  const titleCell = revenueSheet.getCell(1, 1)
  titleCell.value = `Daily Sales Report — ${date}`
  titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  revenueSheet.getRow(1).height = 30

  // Revenue headers
  const revHeaders = ['Category', 'Amount (EUR)']
  const revHeaderRow = revenueSheet.getRow(3)
  revHeaders.forEach((header, i) => {
    revHeaderRow.getCell(i + 1).value = header
  })
  styleHeaderRow(revenueSheet, 3, revHeaders.length)

  // Revenue data
  const sales = data.daily_sales || {}
  const revenueRows = [
    ['Food Revenue', sales.food_revenue || 0],
    ['Beverage Revenue', sales.beverage_revenue || 0],
    ['Other Revenue', sales.other_revenue || 0],
  ]

  let currentRow = 4
  revenueRows.forEach(([label, amount]) => {
    const row = revenueSheet.getRow(currentRow)
    row.getCell(1).value = label as string
    row.getCell(2).value = amount as number
    row.getCell(2).numFmt = CURRENCY_FORMAT
    currentRow++
  })

  // Total row
  const totalRevenue =
    (sales.food_revenue || 0) +
    (sales.beverage_revenue || 0) +
    (sales.other_revenue || 0)
  const totalRow = revenueSheet.getRow(currentRow + 1)
  totalRow.getCell(1).value = 'TOTAL'
  totalRow.getCell(1).font = { bold: true }
  totalRow.getCell(2).value = totalRevenue
  totalRow.getCell(2).numFmt = CURRENCY_FORMAT
  totalRow.getCell(2).font = { bold: true }

  // Covers and average ticket
  currentRow += 3
  if (sales.total_covers) {
    revenueSheet.getRow(currentRow).getCell(1).value = 'Total Covers'
    revenueSheet.getRow(currentRow).getCell(2).value = sales.total_covers
    currentRow++
    if (totalRevenue > 0) {
      revenueSheet.getRow(currentRow).getCell(1).value = 'Average Ticket'
      revenueSheet.getRow(currentRow).getCell(2).value = totalRevenue / sales.total_covers
      revenueSheet.getRow(currentRow).getCell(2).numFmt = CURRENCY_FORMAT
    }
  }

  revenueSheet.getColumn(1).width = 24
  revenueSheet.getColumn(2).width = 18

  // IVA Breakdown sheet
  if (data.iva_breakdown && data.iva_breakdown.length > 0) {
    const ivaSheet = workbook.addWorksheet('IVA Breakdown', {
      pageSetup: { paperSize: 9, orientation: 'portrait' },
    })

    ivaSheet.mergeCells(1, 1, 1, 5)
    const ivaTitleCell = ivaSheet.getCell(1, 1)
    ivaTitleCell.value = `IVA Breakdown — ${date}`
    ivaTitleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
    ivaTitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ivaSheet.getRow(1).height = 30

    const ivaHeaders = ['Category', 'Base Imponible', 'IVA Rate', 'IVA Amount', 'Total']
    const ivaHeaderRow = ivaSheet.getRow(3)
    ivaHeaders.forEach((header, i) => {
      ivaHeaderRow.getCell(i + 1).value = header
    })
    styleHeaderRow(ivaSheet, 3, ivaHeaders.length)

    let ivaRow = 4
    let totalBase = 0
    let totalIva = 0
    let totalAmount = 0

    data.iva_breakdown.forEach((item) => {
      const row = ivaSheet.getRow(ivaRow)
      row.getCell(1).value = item.category
      row.getCell(2).value = item.base_imponible
      row.getCell(2).numFmt = CURRENCY_FORMAT
      row.getCell(3).value = `${item.iva_rate}%`
      row.getCell(3).alignment = { horizontal: 'center' }
      row.getCell(4).value = item.iva_amount
      row.getCell(4).numFmt = CURRENCY_FORMAT
      row.getCell(5).value = item.total
      row.getCell(5).numFmt = CURRENCY_FORMAT

      totalBase += item.base_imponible || 0
      totalIva += item.iva_amount || 0
      totalAmount += item.total || 0
      ivaRow++
    })

    // IVA totals
    ivaRow++
    const ivaTotalRow = ivaSheet.getRow(ivaRow)
    ivaTotalRow.getCell(1).value = 'TOTAL'
    ivaTotalRow.getCell(1).font = { bold: true }
    ivaTotalRow.getCell(2).value = totalBase
    ivaTotalRow.getCell(2).numFmt = CURRENCY_FORMAT
    ivaTotalRow.getCell(2).font = { bold: true }
    ivaTotalRow.getCell(4).value = totalIva
    ivaTotalRow.getCell(4).numFmt = CURRENCY_FORMAT
    ivaTotalRow.getCell(4).font = { bold: true }
    ivaTotalRow.getCell(5).value = totalAmount
    ivaTotalRow.getCell(5).numFmt = CURRENCY_FORMAT
    ivaTotalRow.getCell(5).font = { bold: true }

    ivaSheet.getColumn(1).width = 20
    ivaSheet.getColumn(2).width = 18
    ivaSheet.getColumn(3).width = 12
    ivaSheet.getColumn(4).width = 16
    ivaSheet.getColumn(5).width = 16
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveAs(blob, `daily-report-${date}.xlsx`)
}

/**
 * Export expenses to Excel
 */
export async function exportExpensesExcel(expenses: ExpenseRow[], period: string) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GrandCafe Cheers'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Expenses', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  })

  // Title
  sheet.mergeCells(1, 1, 1, 10)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = `Expense Report — ${period}`
  titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 30

  // Headers
  const headers = [
    'Date',
    'Category',
    'Description',
    'Vendor',
    'NIF',
    'Invoice #',
    'Base Imponible',
    'IVA %',
    'IVA Amount',
    'Total',
  ]
  const headerRow = sheet.getRow(3)
  headers.forEach((header, i) => {
    headerRow.getCell(i + 1).value = header
  })
  styleHeaderRow(sheet, 3, headers.length)

  // Data rows
  let currentRow = 4
  let totalBase = 0
  let totalIva = 0
  let totalAmount = 0

  expenses.forEach((expense) => {
    const row = sheet.getRow(currentRow)
    row.getCell(1).value = expense.date
    row.getCell(2).value = expense.category
    row.getCell(3).value = expense.description
    row.getCell(4).value = expense.vendor || ''
    row.getCell(5).value = expense.supplier_nif || ''
    row.getCell(6).value = expense.factura_number || ''
    row.getCell(7).value = expense.base_imponible || 0
    row.getCell(7).numFmt = CURRENCY_FORMAT
    row.getCell(8).value = `${expense.iva_rate}%`
    row.getCell(8).alignment = { horizontal: 'center' }
    row.getCell(9).value = expense.iva_amount || 0
    row.getCell(9).numFmt = CURRENCY_FORMAT
    row.getCell(10).value = expense.amount || 0
    row.getCell(10).numFmt = CURRENCY_FORMAT

    totalBase += expense.base_imponible || 0
    totalIva += expense.iva_amount || 0
    totalAmount += expense.amount || 0
    currentRow++
  })

  // Totals row
  currentRow++
  const totalsRow = sheet.getRow(currentRow)
  totalsRow.getCell(1).value = 'TOTALS'
  totalsRow.getCell(1).font = { bold: true, size: 11 }
  totalsRow.getCell(7).value = totalBase
  totalsRow.getCell(7).numFmt = CURRENCY_FORMAT
  totalsRow.getCell(7).font = { bold: true }
  totalsRow.getCell(9).value = totalIva
  totalsRow.getCell(9).numFmt = CURRENCY_FORMAT
  totalsRow.getCell(9).font = { bold: true }
  totalsRow.getCell(10).value = totalAmount
  totalsRow.getCell(10).numFmt = CURRENCY_FORMAT
  totalsRow.getCell(10).font = { bold: true }

  // Column widths
  sheet.getColumn(1).width = 12
  sheet.getColumn(2).width = 14
  sheet.getColumn(3).width = 24
  sheet.getColumn(4).width = 16
  sheet.getColumn(5).width = 14
  sheet.getColumn(6).width = 14
  sheet.getColumn(7).width = 16
  sheet.getColumn(8).width = 8
  sheet.getColumn(9).width = 14
  sheet.getColumn(10).width = 14

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveAs(blob, `expenses-${period}.xlsx`)
}

/**
 * Export Modelo 303 data to Excel
 */
export async function exportModelo303Excel(data: Modelo303ExcelData, quarter: string) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GrandCafe Cheers'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Modelo 303', {
    pageSetup: { paperSize: 9, orientation: 'portrait' },
  })

  // Title
  sheet.mergeCells(1, 1, 1, 4)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = `Modelo 303 — IVA Declaration ${quarter}`
  titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 30

  // Period info
  sheet.getRow(2).getCell(1).value = `Period: ${data.period_start} to ${data.period_end}`
  sheet.getRow(2).getCell(1).font = { size: 10, color: { argb: '666666' } }

  // IVA Repercutido section
  let currentRow = 4
  sheet.getRow(currentRow).getCell(1).value = 'IVA REPERCUTIDO (Output VAT)'
  sheet.getRow(currentRow).getCell(1).font = { bold: true, size: 12 }
  currentRow++

  const repHeaders = ['IVA Rate', 'Base Imponible', 'IVA Amount']
  const repHeaderRow = sheet.getRow(currentRow)
  repHeaders.forEach((header, i) => {
    repHeaderRow.getCell(i + 1).value = header
  })
  styleHeaderRow(sheet, currentRow, repHeaders.length)
  currentRow++

  data.iva_repercutido_by_rate.forEach((item) => {
    const row = sheet.getRow(currentRow)
    row.getCell(1).value = `${item.rate}%`
    row.getCell(1).alignment = { horizontal: 'center' }
    row.getCell(2).value = item.base
    row.getCell(2).numFmt = CURRENCY_FORMAT
    row.getCell(3).value = item.iva
    row.getCell(3).numFmt = CURRENCY_FORMAT
    currentRow++
  })

  // Repercutido total
  currentRow++
  const repTotalRow = sheet.getRow(currentRow)
  repTotalRow.getCell(1).value = 'Total IVA Repercutido'
  repTotalRow.getCell(1).font = { bold: true }
  repTotalRow.getCell(3).value = data.iva_repercutido
  repTotalRow.getCell(3).numFmt = CURRENCY_FORMAT
  repTotalRow.getCell(3).font = { bold: true }

  // IVA Soportado section
  currentRow += 2
  sheet.getRow(currentRow).getCell(1).value = 'IVA SOPORTADO (Input VAT — Deductible)'
  sheet.getRow(currentRow).getCell(1).font = { bold: true, size: 12 }
  currentRow++

  const sopHeaders = ['Category', 'Base Imponible', 'IVA Amount']
  const sopHeaderRow = sheet.getRow(currentRow)
  sopHeaders.forEach((header, i) => {
    sopHeaderRow.getCell(i + 1).value = header
  })
  styleHeaderRow(sheet, currentRow, sopHeaders.length)
  currentRow++

  data.iva_soportado_by_category.forEach((item) => {
    const row = sheet.getRow(currentRow)
    row.getCell(1).value = item.category
    row.getCell(2).value = item.base
    row.getCell(2).numFmt = CURRENCY_FORMAT
    row.getCell(3).value = item.iva
    row.getCell(3).numFmt = CURRENCY_FORMAT
    currentRow++
  })

  // Soportado total
  currentRow++
  const sopTotalRow = sheet.getRow(currentRow)
  sopTotalRow.getCell(1).value = 'Total IVA Soportado'
  sopTotalRow.getCell(1).font = { bold: true }
  sopTotalRow.getCell(3).value = data.iva_soportado
  sopTotalRow.getCell(3).numFmt = CURRENCY_FORMAT
  sopTotalRow.getCell(3).font = { bold: true }

  // Resultado
  currentRow += 2
  const resultRow = sheet.getRow(currentRow)
  resultRow.getCell(1).value = 'RESULTADO'
  resultRow.getCell(1).font = { bold: true, size: 14 }
  resultRow.getCell(3).value = data.resultado
  resultRow.getCell(3).numFmt = CURRENCY_FORMAT
  resultRow.getCell(3).font = {
    bold: true,
    size: 14,
    color: { argb: data.resultado >= 0 ? 'CC0000' : '006600' },
  }

  currentRow++
  sheet.getRow(currentRow).getCell(1).value = data.resultado >= 0
    ? 'A ingresar (To pay)'
    : 'A compensar (To offset)'
  sheet.getRow(currentRow).getCell(1).font = {
    size: 10,
    italic: true,
    color: { argb: '666666' },
  }

  // Column widths
  sheet.getColumn(1).width = 28
  sheet.getColumn(2).width = 20
  sheet.getColumn(3).width = 18
  sheet.getColumn(4).width = 16

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveAs(blob, `modelo-303-${quarter}.xlsx`)
}
