import { describe, it, expect } from 'vitest'
import { generateCSV, formatCSVCurrency, formatCSVDate } from '@/lib/utils/csv'
import { formatCurrency, formatPercentage } from '@/lib/utils/pdf'

describe('CSV Export Utils', () => {
  it('should generate CSV with headers and data', () => {
    const columns = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Amount', dataKey: 'amount', format: formatCSVCurrency },
    ]

    const data = [
      { date: '2024-01-01', amount: 100.5 },
      { date: '2024-01-02', amount: 200.75 },
    ]

    const csv = generateCSV(columns, data)

    expect(csv).toContain('Date,Amount')
    expect(csv).toContain('2024-01-01,100.50')
    expect(csv).toContain('2024-01-02,200.75')
  })

  it('should escape CSV values with commas', () => {
    const columns = [
      { header: 'Description', dataKey: 'description' },
    ]

    const data = [
      { description: 'Item with, comma' },
    ]

    const csv = generateCSV(columns, data)

    expect(csv).toContain('"Item with, comma"')
  })

  it('should format currency correctly', () => {
    expect(formatCSVCurrency(100.5)).toBe('100.50')
    expect(formatCSVCurrency(1000)).toBe('1000.00')
    expect(formatCSVCurrency(0)).toBe('0.00')
  })

  it('should format date correctly', () => {
    const result = formatCSVDate('2024-01-15T10:30:00Z')
    expect(result).toBe('2024-01-15')
  })
})

describe('PDF Export Utils', () => {
  it('should format currency with EUR symbol', () => {
    const result = formatCurrency(100.5)
    expect(result).toContain('100')
    expect(result).toContain('50')
    expect(result).toContain('€')
  })

  it('should format percentage correctly', () => {
    expect(formatPercentage(25.5)).toBe('25.50%')
    expect(formatPercentage(100)).toBe('100.00%')
    expect(formatPercentage(0)).toBe('0.00%')
  })
})
