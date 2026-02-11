import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/staff/task-plans/[id]/export?format=excel|pdf
 * Server-side export, uploads to storage and returns signed URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id: planId } = await params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'excel'

  const supabase = await createClient()

  // Fetch plan with tasks
  const { data: plan, error } = await supabase
    .from('weekly_task_plans')
    .select(`
      *,
      planned_tasks(
        *,
        assigned_employee:employees(
          id,
          profile:profiles(id, full_name, role)
        ),
        section:floor_sections(id, name)
      )
    `)
    .eq('id', planId)
    .single()

  if (error || !plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  if (format === 'excel') {
    // Dynamically import ExcelJS for server-side generation
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Task Plan')

    // Title
    sheet.mergeCells('A1:H1')
    const titleCell = sheet.getCell('A1')
    titleCell.value = `Weekly Task Plan — ${plan.week_start_date}`
    titleCell.font = { bold: true, size: 14 }

    // Headers
    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const headerRow = sheet.addRow(['Task', ...dayLabels])
    headerRow.eachCell((cell) => {
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
      cell.border = { bottom: { style: 'thin' } }
    })

    // Group tasks by unique title, then mark which days they appear on
    const tasks = plan.planned_tasks || []
    const tasksByTitle = new Map<string, Set<number>>()
    for (const t of tasks) {
      if (!tasksByTitle.has(t.title)) tasksByTitle.set(t.title, new Set())
      tasksByTitle.get(t.title)!.add(t.day_of_week)
    }

    const priorityColors: Record<string, string> = {
      urgent: 'FFFF4444',
      high: 'FFFF8800',
      medium: 'FF4488FF',
      low: 'FF88CC88',
    }

    for (const [title, days] of tasksByTitle) {
      const task = tasks.find((t: Record<string, unknown>) => t.title === title)
      const row = sheet.addRow([
        title,
        ...dayLabels.map((_, i) => days.has(i) ? 'X' : ''),
      ])

      // Color priority
      if (task) {
        const color = priorityColors[(task as Record<string, string>).priority] || priorityColors.medium
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
        row.getCell(1).font = { color: { argb: 'FFFFFFFF' } }
      }

      // Center the X marks
      for (let i = 2; i <= 8; i++) {
        row.getCell(i).alignment = { horizontal: 'center' }
      }
    }

    // Auto-width columns
    sheet.columns.forEach(col => { col.width = 18 })
    sheet.getColumn(1).width = 35

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()
    const filename = `task-plan-${plan.week_start_date}.xlsx`

    // Try to upload to Supabase storage
    const storagePath = `${authResult.data.user.id}/${filename}`
    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(storagePath, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      })

    if (!uploadError) {
      const { data: signedUrlData } = await supabase.storage
        .from('exports')
        .createSignedUrl(storagePath, 3600)

      if (signedUrlData?.signedUrl) {
        return NextResponse.json({
          download_url: signedUrlData.signedUrl,
          filename,
          expires_in: 3600,
        })
      }
    }

    // Fallback: return file directly
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
}
