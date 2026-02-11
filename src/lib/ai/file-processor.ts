/**
 * File Processor
 * Server-side processing of uploaded files for the AI assistant.
 */

import type { FileAttachment } from './types'

export async function processFile(
  buffer: Buffer | ArrayBuffer,
  filename: string,
  mimeType: string
): Promise<FileAttachment> {
  // Ensure we have a Node.js Buffer
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  const id = crypto.randomUUID()
  const fileSize = buf.length

  if (mimeType.startsWith('image/')) {
    // For images, convert to base64 for Anthropic vision
    const base64 = buf.toString('base64')
    return {
      id,
      filename,
      mimeType,
      fileSize,
      base64,
    }
  }

  if (mimeType === 'application/pdf') {
    try {
      // Truly dynamic import — webpack can't resolve the module name from a variable
      const moduleName = 'pdf-parse'
      const pdfParse = (await import(/* webpackIgnore: true */ moduleName)).default
      const data = await pdfParse(buf)
      return {
        id,
        filename,
        mimeType,
        fileSize,
        processedContent: data.text.slice(0, 50000),
      }
    } catch {
      // pdf-parse not installed or parsing failed — return filename only
      return {
        id,
        filename,
        mimeType,
        fileSize,
        processedContent: `[PDF file: ${filename} — install pdf-parse for text extraction]`,
      }
    }
  }

  if (mimeType === 'text/csv') {
    const text = buf.toString('utf-8')
    const lines = text.split('\n').slice(0, 500) // Limit rows
    return {
      id,
      filename,
      mimeType,
      fileSize,
      processedContent: `CSV Data (${lines.length} rows):\n${lines.join('\n')}`,
    }
  }

  if (mimeType.includes('spreadsheetml') || mimeType.includes('excel')) {
    try {
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buf as unknown as ArrayBuffer)

      let content = ''
      workbook.eachSheet((sheet) => {
        content += `Sheet: ${sheet.name}\n`
        const rows: string[] = []
        sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber > 200) return // Limit rows
          const values = row.values as unknown[]
          rows.push(values.slice(1).join('\t')) // Skip index 0 (1-based)
        })
        content += rows.join('\n') + '\n\n'
      })

      return {
        id,
        filename,
        mimeType,
        fileSize,
        processedContent: content.slice(0, 50000),
      }
    } catch {
      return {
        id,
        filename,
        mimeType,
        fileSize,
        processedContent: '[Excel parsing failed]',
      }
    }
  }

  // Unsupported type
  return {
    id,
    filename,
    mimeType,
    fileSize,
    processedContent: `[Unsupported file type: ${mimeType}]`,
  }
}
