/**
 * CSV Generation Utilities
 * For Excel-compatible CSV exports
 */

export interface CSVColumn {
  header: string
  dataKey: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  format?: (value: any) => string
}

/**
 * Generate CSV content from data
 */
export function generateCSV(
  columns: CSVColumn[],
  data: Record<string, unknown>[],
  options?: {
    includeHeaders?: boolean
    delimiter?: string
    encoding?: string
  }
): string {
  const {
    includeHeaders = true,
    delimiter = ',',
    encoding = 'utf-8',
  } = options || {}

  const rows: string[] = []

  // Add BOM for Excel UTF-8 compatibility
  if (encoding === 'utf-8') {
    rows.push('\uFEFF')
  }

  // Add headers
  if (includeHeaders) {
    rows.push(columns.map((col) => escapeCSVValue(col.header)).join(delimiter))
  }

  // Add data rows
  data.forEach((row) => {
    const values = columns.map((col) => {
      const value = row[col.dataKey]
      const formattedValue = col.format ? col.format(value) : String(value || '')
      return escapeCSVValue(formattedValue)
    })
    rows.push(values.join(delimiter))
  })

  return rows.join('\n')
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: string): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Add totals row to CSV data
 */
export function addCSVTotalsRow(
  data: Record<string, unknown>[],
  totals: Record<string, number | string>,
  labelKey: string = 'category'
): Record<string, unknown>[] {
  return [
    ...data,
    {},
    {
      [labelKey]: 'TOTALS',
      ...totals,
    },
  ]
}

/**
 * Format currency for CSV (no symbols, just numbers with 2 decimals)
 */
export function formatCSVCurrency(amount: number): string {
  return amount.toFixed(2)
}

/**
 * Format percentage for CSV
 */
export function formatCSVPercentage(value: number): string {
  return value.toFixed(2)
}

/**
 * Format date for CSV (ISO format)
 */
export function formatCSVDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}
