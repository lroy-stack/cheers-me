import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

/**
 * GET /api/staff/compliance/export/excel
 * Export filtered compliance records as Excel
 * Auth: admin/manager/owner only
 * Query params: type_code, category, date_from, date_to, lang (default 'en')
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const typeCode = searchParams.get('type_code')
  const category = searchParams.get('category')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const lang = searchParams.get('lang') || 'en'

  // Fetch records with filters
  let query = supabase
    .from('compliance_records')
    .select(`
      *,
      ficha_type:compliance_ficha_types(*),
      recorded_by_employee:employees!compliance_records_recorded_by_fkey(
        id,
        profile:profiles(id, full_name, role)
      ),
      reviewer:profiles!compliance_records_reviewed_by_fkey(id, full_name)
    `)
    .order('recorded_at', { ascending: false })

  if (typeCode) {
    query = query.eq('ficha_type_code', typeCode)
  }

  if (category) {
    query = query.eq('ficha_type.category', category)
  }

  if (dateFrom) {
    query = query.gte('recorded_at', dateFrom)
  }

  if (dateTo) {
    query = query.lte('recorded_at', dateTo)
  }

  const { data: records, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!records || records.length === 0) {
    return NextResponse.json(
      { error: 'No records found for the given filters' },
      { status: 404 }
    )
  }

  // Group records by ficha_type_code
  const grouped: Record<
    string,
    {
      fichaType: Record<string, unknown>
      records: typeof records
    }
  > = {}

  for (const record of records) {
    const code = record.ficha_type_code as string
    if (!grouped[code]) {
      grouped[code] = {
        fichaType: record.ficha_type as Record<string, unknown>,
        records: [],
      }
    }
    grouped[code].records.push(record)
  }

  // Create workbook
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GrandCafe Cheers Manager'
  workbook.created = new Date()

  for (const [code, group] of Object.entries(grouped)) {
    const fichaType = group.fichaType
    const fieldsSchema = fichaType.fields_schema as Array<{
      key: string
      label_en: string
      label_es: string
      label_nl?: string
      label_de?: string
      type: string
      unit?: string | null
    }> | null

    // Sheet name (max 31 chars for Excel)
    const sheetName = code.length > 31 ? code.slice(0, 31) : code

    const sheet = workbook.addWorksheet(sheetName, {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    })

    // Title row
    const nameKey = `name_${lang}` as string
    const fichaName =
      (fichaType[nameKey] as string) ||
      (fichaType.name_en as string) ||
      code

    const titleColCount = (fieldsSchema?.length || 0) + 5
    if (titleColCount > 1) {
      sheet.mergeCells(1, 1, 1, Math.max(titleColCount, 2))
    }
    const titleCell = sheet.getCell(1, 1)
    titleCell.value = `GRANDCAFE CHEERS - ${fichaName}`
    titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    sheet.getRow(1).height = 30

    // Build headers: metadata columns + field columns
    const headers: string[] = [
      lang === 'es' ? 'Fecha' : 'Date',
      lang === 'es' ? 'Registrado por' : 'Recorded By',
      lang === 'es' ? 'Estado' : 'Status',
    ]

    // Add field-specific columns
    const fieldKeys: string[] = []
    if (Array.isArray(fieldsSchema)) {
      for (const field of fieldsSchema) {
        const labelKey = `label_${lang}` as keyof typeof field
        const label = (field[labelKey] as string) || field.label_en || field.key
        headers.push(field.unit ? `${label} (${field.unit})` : label)
        fieldKeys.push(field.key)
      }
    }

    headers.push(lang === 'es' ? 'Notas' : 'Notes')
    headers.push(lang === 'es' ? 'Revisado por' : 'Reviewed By')

    // Write header row
    const headerRow = sheet.getRow(3)
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = h
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1A237E' },
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
    })
    headerRow.height = 28

    // Set column widths
    sheet.getColumn(1).width = 20 // Date
    sheet.getColumn(2).width = 22 // Recorded by
    sheet.getColumn(3).width = 16 // Status
    for (let i = 0; i < fieldKeys.length; i++) {
      sheet.getColumn(4 + i).width = 18
    }
    sheet.getColumn(4 + fieldKeys.length).width = 30 // Notes
    sheet.getColumn(5 + fieldKeys.length).width = 22 // Reviewed by

    // Data rows
    group.records.forEach((record, idx) => {
      const row = sheet.getRow(idx + 4)

      const recordedAt = new Date(record.recorded_at as string)
      const employee = record.recorded_by_employee as {
        id: string
        profile: { full_name: string | null }
      } | null
      const reviewer = record.reviewer as {
        full_name: string | null
      } | null
      const values = record.values as Record<string, unknown>

      // Date
      row.getCell(1).value = recordedAt.toLocaleDateString(
        lang === 'es' ? 'es-ES' : 'en-US',
        { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
      )
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }

      // Recorded by
      row.getCell(2).value = employee?.profile?.full_name || 'Unknown'
      row.getCell(2).alignment = { vertical: 'middle' }

      // Status
      const statusCell = row.getCell(3)
      const status = record.status as string
      statusCell.value = status.replace('_', ' ').toUpperCase()
      statusCell.alignment = { horizontal: 'center', vertical: 'middle' }

      if (status === 'flagged') {
        statusCell.font = { bold: true, color: { argb: 'C62828' } }
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEBEE' },
        }
      } else if (status === 'requires_review') {
        statusCell.font = { bold: true, color: { argb: 'F57F17' } }
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8E1' },
        }
      } else {
        statusCell.font = { bold: true, color: { argb: '2E7D32' } }
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E8F5E9' },
        }
      }

      // Field values
      fieldKeys.forEach((key, i) => {
        let val = values[key]
        if (val === undefined || val === null) {
          val = ''
        } else if (typeof val === 'boolean') {
          val = val ? (lang === 'es' ? 'Si' : 'Yes') : 'No'
        }
        row.getCell(4 + i).value = String(val)
        row.getCell(4 + i).alignment = { vertical: 'middle' }
      })

      // Notes
      row.getCell(4 + fieldKeys.length).value =
        (record.notes as string) || ''
      row.getCell(4 + fieldKeys.length).alignment = {
        vertical: 'middle',
        wrapText: true,
      }

      // Reviewed by
      row.getCell(5 + fieldKeys.length).value =
        reviewer?.full_name || ''
      row.getCell(5 + fieldKeys.length).alignment = { vertical: 'middle' }

      // Borders
      for (let col = 1; col <= headers.length; col++) {
        row.getCell(col).border = {
          top: { style: 'thin', color: { argb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
          left: { style: 'thin', color: { argb: 'E0E0E0' } },
          right: { style: 'thin', color: { argb: 'E0E0E0' } },
        }
      }

      row.height = 22
    })
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `compliance-records-${dateStr}.xlsx`

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
