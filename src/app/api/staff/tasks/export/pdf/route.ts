import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import PDFDocumentCtor from 'pdfkit'

/**
 * GET /api/staff/tasks/export/pdf
 * Export tasks as PDF. Query params: ids (repeated) or filters.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const ids = searchParams.getAll('ids')

  let query = supabase
    .from('staff_tasks')
    .select(`
      *,
      assigned_employee:employees!staff_tasks_assigned_to_fkey(
        id,
        profile:profiles(id, full_name, role)
      ),
      assigner:profiles!staff_tasks_assigned_by_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false })

  if (ids.length > 0) {
    query = query.in('id', ids)
  }

  const { data: tasks, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch items for all tasks
  const taskIds = (tasks || []).map((t) => t.id)
  let itemsByTask: Record<string, Array<{ text: string; completed: boolean }>> = {}

  if (taskIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('staff_task_items')
      .select('task_id, text, completed')
      .in('task_id', taskIds)
      .order('sort_order', { ascending: true })

    if (itemsData) {
      for (const item of itemsData) {
        if (!itemsByTask[item.task_id]) itemsByTask[item.task_id] = []
        itemsByTask[item.task_id].push(item)
      }
    }
  }

  // Generate PDF
  const doc = new PDFDocumentCtor({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    bufferPages: true,
    info: {
      Title: 'GrandCafe Cheers — Tasks Report',
      Author: 'GrandCafe Cheers Management Platform',
    },
  })

  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  // Header
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('GRANDCAFE CHEERS', 40, 40)
    .fontSize(10)
    .font('Helvetica')
    .text('Carrer de Cartago 22, El Arenal, Mallorca 07600', 40, 62)

  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('Tasks Report', 40, 90)
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#999999')
    .text(`Generated: ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}`, 40, 90, { align: 'right' })
    .fillColor('#000000')

  // Table
  const tableTop = 120
  const colWidths = [220, 90, 80, 140, 80, 80, 60]
  const headers = ['Title', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Checklist', 'Notes']
  const rowHeight = 22

  // Header row
  let x = 40
  doc.fontSize(9).font('Helvetica-Bold')
  headers.forEach((h, i) => {
    doc.text(h, x + 4, tableTop + 5, { width: colWidths[i] - 8, align: 'left' })
    x += colWidths[i]
  })

  doc
    .strokeColor('#cccccc')
    .lineWidth(1)
    .moveTo(40, tableTop + rowHeight)
    .lineTo(40 + colWidths.reduce((a, b) => a + b, 0), tableTop + rowHeight)
    .stroke()

  // Data rows
  doc.fontSize(8).font('Helvetica').fillColor('#333333')

  let y = tableTop + rowHeight
  for (const task of tasks || []) {
    y += rowHeight

    if (y > doc.page.height - 60) {
      doc.addPage()
      y = 40 + rowHeight
    }

    x = 40
    const employee = task.assigned_employee as { id: string; profile: { full_name: string | null } } | null
    const items = itemsByTask[task.id] || []
    const completedItems = items.filter(i => i.completed).length

    const rowData = [
      task.title?.substring(0, 40) || '',
      (task.status as string).replace('_', ' '),
      task.priority as string,
      employee?.profile?.full_name || 'Unassigned',
      task.due_date || '—',
      items.length > 0 ? `${completedItems}/${items.length}` : '—',
      task.notes?.substring(0, 20) || '',
    ]

    rowData.forEach((val, i) => {
      doc.text(val, x + 4, y + 5, { width: colWidths[i] - 8, align: 'left' })
      x += colWidths[i]
    })

    doc
      .strokeColor('#eeeeee')
      .lineWidth(0.5)
      .moveTo(40, y + rowHeight)
      .lineTo(40 + colWidths.reduce((a, b) => a + b, 0), y + rowHeight)
      .stroke()
  }

  // Footer
  const pageCount = doc.bufferedPageRange().count
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i)
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text(`Page ${i + 1} of ${pageCount}`, 40, doc.page.height - 30, { align: 'center' })
  }

  doc.end()

  // Wait for stream to finish
  const buffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="tasks_${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  })
}
