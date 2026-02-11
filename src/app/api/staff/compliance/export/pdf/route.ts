import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import PDFDocumentCtor from 'pdfkit'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Layout mapping — MUST match blank-template/route.ts
// ---------------------------------------------------------------------------

type LayoutType = 'table-landscape' | 'form-portrait' | 'form-full-page' | 'certificate'

const LAYOUT_MAP: Record<string, LayoutType> = {
  'LD-001': 'table-landscape',
  'LD-002': 'table-landscape',
  'APPCC-TEMP-001': 'table-landscape',
  'APPCC-COOK-001': 'table-landscape',
  'APPCC-OIL-001': 'table-landscape',
  'APPCC-REC-001': 'form-portrait',
  'PEST-001': 'form-portrait',
  'MAINT-001': 'form-portrait',
  'INC-001': 'form-full-page',
  'TRAIN-CERT-001': 'certificate',
}

// ---------------------------------------------------------------------------
// Colors — identical to blank-template
// ---------------------------------------------------------------------------

const NAVY = '#1a1a2e'
const GOLD = '#c9a84c'
const GOLD_DARK = '#a08030'
const GOLD_LIGHT = '#e8d5a0'
const CREAM = '#faf8f2'
const LIGHT_GRAY = '#f5f5f5'
const BORDER_GRAY = '#BDBDBD'
const TEXT_DARK = '#2c2c3e'
const TEXT_MED = '#555'
const TEXT_GRAY = '#666666'

// ---------------------------------------------------------------------------
// Labels — identical to blank-template
// ---------------------------------------------------------------------------

const LABELS: Record<string, Record<string, string>> = {
  page: { en: 'Page', es: 'Página', nl: 'Pagina', de: 'Seite' },
  of: { en: 'of', es: 'de', nl: 'van', de: 'von' },
  date: { en: 'Date', es: 'Fecha', nl: 'Datum', de: 'Datum' },
  time: { en: 'Time', es: 'Hora', nl: 'Tijd', de: 'Uhrzeit' },
  responsible: { en: 'Responsible', es: 'Responsable', nl: 'Verantwoordelijke', de: 'Verantwortlich' },
  observations: { en: 'Observations', es: 'Observaciones', nl: 'Opmerkingen', de: 'Bemerkungen' },
  signature: { en: 'Signature', es: 'Firma', nl: 'Handtekening', de: 'Unterschrift' },
  yes: { en: 'Yes', es: 'Sí', nl: 'Ja', de: 'Ja' },
  no: { en: 'No', es: 'No', nl: 'Nee', de: 'Nein' },
  mallorca: { en: 'Mallorca, Spain', es: 'Mallorca, España', nl: 'Mallorca, Spanje', de: 'Mallorca, Spanien' },
  selfControlSystem: { en: 'Self-Control System', es: 'Sistema de Autocontrol', nl: 'Zelfcontrolesysteem', de: 'Eigenkontrollsystem' },
  recordedBy: { en: 'Recorded by', es: 'Registrado por', nl: 'Geregistreerd door', de: 'Erfasst von' },
  status: { en: 'Status', es: 'Estado', nl: 'Status', de: 'Status' },
  recordedValues: { en: 'Recorded Values', es: 'Valores Registrados', nl: 'Geregistreerde Waarden', de: 'Erfasste Werte' },
  notes: { en: 'Notes', es: 'Notas', nl: 'Opmerkingen', de: 'Notizen' },
  review: { en: 'Review', es: 'Revisión', nl: 'Beoordeling', de: 'Überprüfung' },
  reviewedBy: { en: 'Reviewed by', es: 'Revisado por', nl: 'Beoordeeld door', de: 'Überprüft von' },
  reviewDate: { en: 'Review date', es: 'Fecha revisión', nl: 'Beoordelingsdatum', de: 'Überprüfungsdatum' },
  reviewNotes: { en: 'Review notes', es: 'Notas revisión', nl: 'Beoordelingsnotities', de: 'Überprüfungsnotizen' },
  incidentReport: { en: 'INCIDENT REPORT', es: 'INFORME DE INCIDENTE', nl: 'INCIDENT RAPPORT', de: 'UNFALLBERICHT' },
  trainingRecord: { en: 'TRAINING RECORD', es: 'CONSTANCIA DE FORMACIÓN RECIBIDA', nl: 'OPLEIDINGSREGISTRATIE', de: 'SCHULUNGSNACHWEIS' },
  incidentNo: { en: 'Incident No.', es: 'Incidente Nº', nl: 'Incident Nr.', de: 'Vorfall Nr.' },
  employee: { en: 'Employee', es: 'Empleado/a', nl: 'Medewerker', de: 'Mitarbeiter/in' },
  hrResponsible: { en: 'HR Responsible', es: 'Responsable RRHH', nl: 'HR Verantwoordelijke', de: 'Personalverantwortliche/r' },
  signatureAndStamp: { en: '(signature & stamp)', es: '(firma y sello)', nl: '(handtekening & stempel)', de: '(Unterschrift & Stempel)' },
  employeeSignature: { en: '(employee signature)', es: '(firma del empleado)', nl: '(handtekening medewerker)', de: '(Unterschrift Mitarbeiter)' },
}

function l(key: string, lang: string): string {
  return LABELS[key]?.[lang] || LABELS[key]?.en || key
}

const statusLabels: Record<string, Record<string, string>> = {
  completed: { en: 'Completed', es: 'Completado', nl: 'Voltooid', de: 'Abgeschlossen' },
  flagged: { en: 'Flagged', es: 'Marcado', nl: 'Gemarkeerd', de: 'Markiert' },
  requires_review: { en: 'Requires Review', es: 'Requiere Revisión', nl: 'Beoordeling Nodig', de: 'Überprüfung Erforderlich' },
}
const statusColors: Record<string, string> = { completed: '#2e7d32', flagged: '#e65100', requires_review: '#1565c0' }

// ---------------------------------------------------------------------------
// Logo — identical loader
// ---------------------------------------------------------------------------

function loadLogo(): Buffer | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'public', 'icons', 'logoheader.png'))
  } catch { return null }
}

// ---------------------------------------------------------------------------
// Shared PDF helpers — identical to blank-template
// ---------------------------------------------------------------------------

function drawCornerOrnaments(
  doc: InstanceType<typeof PDFDocumentCtor>,
  x1: number, y1: number, x2: number, y2: number, size: number, color: string,
) {
  doc.lineWidth(1.2)
  doc.moveTo(x1, y1 + size).lineTo(x1, y1).lineTo(x1 + size, y1).stroke(color)
  doc.moveTo(x2 - size, y1).lineTo(x2, y1).lineTo(x2, y1 + size).stroke(color)
  doc.moveTo(x1, y2 - size).lineTo(x1, y2).lineTo(x1 + size, y2).stroke(color)
  doc.moveTo(x2 - size, y2).lineTo(x2, y2).lineTo(x2, y2 - size).stroke(color)
}

function drawGoldDivider(
  doc: InstanceType<typeof PDFDocumentCtor>,
  centerX: number, y: number, width: number,
) {
  const halfW = width / 2
  doc.moveTo(centerX - halfW, y).lineTo(centerX - 5, y).lineWidth(0.8).stroke(GOLD)
  doc.moveTo(centerX + 5, y).lineTo(centerX + halfW, y).lineWidth(0.8).stroke(GOLD)
  doc.save()
  doc.moveTo(centerX, y - 3).lineTo(centerX + 3, y).lineTo(centerX, y + 3).lineTo(centerX - 3, y).closePath().fill(GOLD)
  doc.restore()
}

/** Header — identical to blank-template */
function drawProfessionalHeader(
  doc: InstanceType<typeof PDFDocumentCtor>,
  opts: { fichaName: string; code: string; legalBasis: string | null; lang: string; statusLabel?: string; statusColor?: string },
  logo: Buffer | null, W: number, _H: number, margin: number,
  options?: { subtitle?: string; showMonthYear?: boolean },
): number {
  const pageW = W - margin * 2
  doc.rect(margin, margin, pageW, 4).fill(NAVY)
  doc.rect(margin, margin + 4, pageW, 1.5).fill(GOLD)
  let y = margin + 14

  if (logo) { try { doc.image(logo, margin + 8, y, { width: 36, height: 36 }) } catch { /* skip */ } }

  const textX = logo ? margin + 52 : margin + 8
  const textW = pageW - (textX - margin) - 10

  doc.fontSize(13).font('Helvetica-Bold').fillColor(NAVY)
    .text('GRANDCAFE CHEERS', textX, y, { width: textW, lineBreak: false })
  doc.fontSize(6.5).font('Helvetica').fillColor(GOLD_DARK)
    .text(l('mallorca', opts.lang) + '  ·  ' + l('selfControlSystem', opts.lang), textX, y + 15, { width: textW, lineBreak: false })
  doc.fontSize(11).font('Helvetica-Bold').fillColor(TEXT_DARK)
    .text(options?.subtitle || opts.fichaName, textX, y + 26, { width: textW, lineBreak: false })

  // Code badge
  const codeBadgeW = opts.code.length * 5.5 + 16
  const codeBadgeX = margin + pageW - codeBadgeW - 4
  doc.roundedRect(codeBadgeX, y + 2, codeBadgeW, 16, 3).fill(NAVY)
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#fff')
    .text(opts.code, codeBadgeX + 8, y + 5, { width: codeBadgeW - 16, align: 'center', lineBreak: false })

  // Status badge (filled records only)
  if (opts.statusLabel) {
    const stBadgeW = opts.statusLabel.length * 5 + 16
    const stBadgeX = margin + pageW - stBadgeW - 4
    doc.roundedRect(stBadgeX, y + 22, stBadgeW, 14, 3).fill(opts.statusColor || TEXT_MED)
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#fff')
      .text(opts.statusLabel, stBadgeX + 8, y + 25, { width: stBadgeW - 16, align: 'center', lineBreak: false })
  }

  if (options?.showMonthYear) {
    const myX = codeBadgeX - 200
    doc.fontSize(7.5).font('Helvetica').fillColor(TEXT_MED)
      .text(`${l('date', opts.lang)}: __________`, myX, y + 26, { width: 200, align: 'right', lineBreak: false })
  }

  y += 48

  if (opts.legalBasis) {
    doc.roundedRect(margin, y, pageW, 16, 2).fill(LIGHT_GRAY)
    doc.rect(margin, y, 3, 16).fill(GOLD)
    doc.fontSize(6).fillColor(TEXT_GRAY).font('Helvetica-Oblique')
      .text(opts.legalBasis, margin + 10, y + 3.5, { width: pageW - 20, lineBreak: false })
    y += 22
  } else {
    y += 6
  }
  return y
}

/** Footer on current page — identical to blank-template */
function drawPageFooter(
  doc: InstanceType<typeof PDFDocumentCtor>,
  fichaName: string, code: string, _lang: string, W: number, margin: number,
) {
  const pageW = W - margin * 2
  const footerY = doc.page.height - 28
  doc.rect(margin, footerY, pageW, 1).fill(GOLD)
  doc.rect(margin, footerY + 1, pageW, 14).fill(NAVY)
  doc.fontSize(6).fillColor(GOLD_LIGHT).font('Helvetica')
    .text(`GrandCafe Cheers  ·  ${fichaName}  ·  ${code}`, margin + 8, footerY + 4,
      { width: pageW - 16, align: 'center', lineBreak: false })
}

// ---------------------------------------------------------------------------
// Field value resolver
// ---------------------------------------------------------------------------

interface FieldSchema {
  key: string; type: string; label_en: string; label_es: string
  label_nl?: string; label_de?: string
  options?: Array<{ value: string; label_en: string; label_es?: string; label_nl?: string; label_de?: string }>
  unit?: string | null; min?: number | null; max?: number | null
}

function resolveFieldValue(field: FieldSchema, rawValue: unknown, lang: string): string {
  if (rawValue === undefined || rawValue === null) return '—'
  if (typeof rawValue === 'boolean') return rawValue ? l('yes', lang) : l('no', lang)
  if (field.type === 'select' && field.options) {
    const optKey = `label_${lang}` as keyof (typeof field.options)[0]
    const opt = field.options.find(o => o.value === String(rawValue))
    if (opt) return (opt[optKey] as string) || opt.label_en || String(rawValue)
  }
  let v = String(rawValue)
  if (field.unit) v = `${v} ${field.unit}`
  return v
}

function fieldLabel(field: FieldSchema, lang: string): string {
  const key = `label_${lang}` as keyof FieldSchema
  return (field[key] as string) || field.label_en || field.key
}

// ═══════════════════════════════════════════════════════════════════════════
// GET handler
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = new URL(request.url)
  const recordId = searchParams.get('id')
  const lang = searchParams.get('lang') || 'en'

  if (!recordId) {
    return NextResponse.json({ error: 'Record id is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: record, error } = await supabase
    .from('compliance_records')
    .select(`
      *,
      ficha_type:compliance_ficha_types(*),
      recorded_by_employee:employees!compliance_records_recorded_by_fkey(
        id, profile:profiles(id, full_name, role)
      ),
      reviewer:profiles!compliance_records_reviewed_by_fkey(id, full_name)
    `)
    .eq('id', recordId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return NextResponse.json({ error: 'Compliance record not found' }, { status: 404 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const fichaType = record.ficha_type as Record<string, unknown>
  const employee = record.recorded_by_employee as { id: string; profile: { full_name: string | null } } | null
  const reviewer = record.reviewer as { id: string; full_name: string | null } | null

  const nameKey = `name_${lang}` as string
  const fichaName = (fichaType[nameKey] as string) || (fichaType.name_en as string) || (record.ficha_type_code as string)
  const code = record.ficha_type_code as string
  const legalBasis = fichaType.legal_basis as string | null
  const fieldsSchema = fichaType.fields_schema as FieldSchema[] | null
  const values = record.values as Record<string, unknown>
  const stLabel = statusLabels[record.status as string]?.[lang] || (record.status as string)
  const stColor = statusColors[record.status as string] || TEXT_MED

  const layout = LAYOUT_MAP[code] || 'table-landscape'
  const logo = loadLogo()

  const recordedAt = new Date(record.recorded_at as string)
  const dateStr = recordedAt.toLocaleDateString(
    lang === 'es' ? 'es-ES' : lang === 'nl' ? 'nl-NL' : lang === 'de' ? 'de-DE' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  )
  const employeeName = employee?.profile?.full_name || 'Unknown'

  // Route to layout-specific generator
  switch (layout) {
    case 'form-full-page':
      return generateIncidentRecord(
        { fichaName, code, legalBasis, lang, stLabel, stColor, dateStr, employeeName, fieldsSchema, values, notes: record.notes as string | null, reviewer, reviewedAt: record.reviewed_at as string | null, reviewNotes: record.review_notes as string | null },
        logo,
      )
    case 'certificate':
      return generateCertificateRecord(
        { fichaName, code, legalBasis, lang, stLabel, stColor, dateStr, employeeName, fieldsSchema, values, notes: record.notes as string | null, reviewer, reviewedAt: record.reviewed_at as string | null, reviewNotes: record.review_notes as string | null },
        logo,
      )
    default:
      // table-landscape & form-portrait both use the same filled-record layout
      return generateFilledRecord(
        { fichaName, code, legalBasis, lang, layout, stLabel, stColor, dateStr, employeeName, fieldsSchema, values, notes: record.notes as string | null, reviewer, reviewedAt: record.reviewed_at as string | null, reviewNotes: record.review_notes as string | null },
        logo,
      )
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecordOpts {
  fichaName: string; code: string; legalBasis: string | null; lang: string
  stLabel: string; stColor: string; dateStr: string; employeeName: string
  fieldsSchema: FieldSchema[] | null; values: Record<string, unknown>
  notes: string | null; reviewer: { id: string; full_name: string | null } | null
  reviewedAt: string | null; reviewNotes: string | null
}

function pdfResponse(doc: InstanceType<typeof PDFDocumentCtor>, code: string, recordId?: string): Promise<NextResponse> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => {
      const buf = Buffer.concat(chunks)
      const id = recordId ? recordId.slice(0, 8) : 'record'
      resolve(new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="compliance-${code}-${id}.pdf"`,
        },
      }))
    })
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// FILLED RECORD — table-landscape & form-portrait
// Uses the same professional header, then a structured values table
// ═══════════════════════════════════════════════════════════════════════════

function generateFilledRecord(
  opts: RecordOpts & { layout: LayoutType },
  logo: Buffer | null,
): Promise<NextResponse> {
  const { fichaName, code, legalBasis, lang, stLabel, stColor, dateStr, employeeName, fieldsSchema, values, notes, reviewer, reviewedAt, reviewNotes, layout } = opts
  const isLandscape = layout === 'table-landscape'
  const margin = isLandscape ? 28 : 36

  const doc = new PDFDocumentCtor({ size: 'A4', layout: isLandscape ? 'landscape' : 'portrait', margin })
  const responsePromise = pdfResponse(doc, code)
  const W = doc.page.width
  const H = doc.page.height
  const pageW = W - margin * 2

  let y = drawProfessionalHeader(doc, { fichaName, code, legalBasis, lang, statusLabel: stLabel, statusColor: stColor }, logo, W, H, margin)

  // ── Metadata row ──
  doc.roundedRect(margin, y, pageW, 18, 2).fill(NAVY)
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor(GOLD_LIGHT)
    .text(`${l('date', lang)}: ${dateStr}     |     ${l('recordedBy', lang)}: ${employeeName}     |     ${l('status', lang)}: ${stLabel}`,
      margin + 8, y + 5, { width: pageW - 16, lineBreak: false })
  y += 24

  // ── Values table ──
  const fields = Array.isArray(fieldsSchema) ? fieldsSchema : []
  const labelColW = isLandscape ? 220 : 180

  if (fields.length > 0) {
    for (let fi = 0; fi < fields.length; fi++) {
      const field = fields[fi]
      const label = fieldLabel(field, lang)
      const value = resolveFieldValue(field, values[field.key], lang)

      const rowBg = fi % 2 === 0 ? '#FFFFFF' : '#f7f7fa'
      doc.rect(margin, y, pageW, 20).fill(rowBg)
      doc.rect(margin, y, 3, 20).fill(fi % 2 === 0 ? GOLD : NAVY)

      doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT_DARK)
        .text(label, margin + 10, y + 5, { width: labelColW, lineBreak: false })
      doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_DARK)
        .text(value, margin + 10 + labelColW, y + 5, { width: pageW - labelColW - 20, lineBreak: false })

      doc.moveTo(margin, y + 20).lineTo(margin + pageW, y + 20).lineWidth(0.3).strokeColor('#e0e0e0').stroke()
      y += 20
    }
  } else {
    for (const [key, val] of Object.entries(values)) {
      const rowBg = Object.keys(values).indexOf(key) % 2 === 0 ? '#FFFFFF' : '#f7f7fa'
      doc.rect(margin, y, pageW, 20).fill(rowBg)
      doc.rect(margin, y, 3, 20).fill(GOLD)
      doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT_DARK)
        .text(key, margin + 10, y + 5, { width: labelColW, lineBreak: false })
      doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_DARK)
        .text(String(val ?? '—'), margin + 10 + labelColW, y + 5, { width: pageW - labelColW - 20, lineBreak: false })
      doc.moveTo(margin, y + 20).lineTo(margin + pageW, y + 20).lineWidth(0.3).strokeColor('#e0e0e0').stroke()
      y += 20
    }
  }

  // Bottom line
  doc.moveTo(margin, y).lineTo(margin + pageW, y).lineWidth(1).stroke(NAVY)
  y += 10

  // ── Notes ──
  if (notes) {
    drawSectionHeader(doc, l('notes', lang), margin, y, pageW)
    y += 18
    doc.fontSize(8).font('Helvetica').fillColor(TEXT_DARK)
      .text(notes, margin + 10, y, { width: pageW - 20, lineGap: 3 })
    y = doc.y + 10
  }

  // ── Review ──
  if (reviewer) {
    drawSectionHeader(doc, l('review', lang), margin, y, pageW)
    y += 18
    drawReviewBlock(doc, { lang, reviewer, reviewedAt, reviewNotes }, margin, y, pageW)
    y = doc.y + 10
  }

  drawPageFooter(doc, fichaName, code, lang, W, margin)
  doc.end()
  return responsePromise
}

// ═══════════════════════════════════════════════════════════════════════════
// FILLED INCIDENT — form-full-page style with cream bg, borders, ornaments
// ═══════════════════════════════════════════════════════════════════════════

function generateIncidentRecord(opts: RecordOpts, logo: Buffer | null): Promise<NextResponse> {
  const { fichaName, code, legalBasis, lang, stLabel, stColor, dateStr, employeeName, fieldsSchema, values, notes, reviewer: _reviewer, reviewedAt: _reviewedAt, reviewNotes: _reviewNotes } = opts
  const margin = 36

  const doc = new PDFDocumentCtor({ size: 'A4', layout: 'portrait', margin })
  const responsePromise = pdfResponse(doc, code)
  const W = doc.page.width
  const H = doc.page.height
  const pageW = W - margin * 2

  // Cream background + borders + ornaments — identical to blank template
  doc.rect(0, 0, W, H).fill(CREAM)
  doc.rect(margin - 6, margin - 6, pageW + 12, H - margin * 2 + 12).lineWidth(2).strokeColor(NAVY).stroke()
  doc.rect(margin - 3, margin - 3, pageW + 6, H - margin * 2 + 6).lineWidth(0.5).strokeColor(GOLD).stroke()
  drawCornerOrnaments(doc, margin, margin, margin + pageW, H - margin, 18, GOLD)

  let y = drawProfessionalHeader(doc, { fichaName, code, legalBasis, lang, statusLabel: stLabel, statusColor: stColor },
    logo, W, H, margin, { subtitle: l('incidentReport', lang) })

  // Gold divider
  drawGoldDivider(doc, margin + pageW / 2, y, 200)
  y += 12

  // Metadata bar
  doc.roundedRect(margin + 4, y, pageW - 8, 16, 2).fill(NAVY)
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor(GOLD_LIGHT)
    .text(`${l('date', lang)}: ${dateStr}   |   ${l('recordedBy', lang)}: ${employeeName}`,
      margin + 12, y + 4, { width: pageW - 24, lineBreak: false })
  y += 22

  // ── Values — same structured layout as blank incident ──
  const fields = Array.isArray(fieldsSchema) ? fieldsSchema : []
  const formW = pageW - 20
  const lPad = margin + 10

  for (const field of fields) {
    if (y > H - 60) break // safety
    const label = fieldLabel(field, lang)
    const value = resolveFieldValue(field, values[field.key], lang)

    // Section-style rendering for big text fields
    const isBigField = field.type === 'textarea' || field.key.includes('description') || field.key.includes('actions') || field.key.includes('cause')

    if (isBigField) {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(TEXT_DARK)
        .text(label + ':', lPad, y + 1)
      y += 12
      doc.roundedRect(lPad, y, formW, 0, 1).strokeColor(BORDER_GRAY).lineWidth(0.3).stroke()
      doc.fontSize(8).font('Helvetica').fillColor(TEXT_DARK)
        .text(value || '—', lPad + 4, y + 2, { width: formW - 8, lineGap: 2 })
      y = doc.y + 8
    } else if (field.type === 'boolean') {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(TEXT_DARK)
        .text(label + ':', lPad, y + 1, { width: 200, lineBreak: false })
      // Filled checkbox
      const isYes = values[field.key] === true
      const checkX = lPad + 210
      doc.rect(checkX, y + 1, 9, 9).lineWidth(0.5).strokeColor(TEXT_DARK).stroke()
      if (isYes) doc.fontSize(7).font('Helvetica-Bold').fillColor('#2e7d32').text('✓', checkX + 1.5, y + 1.5, { width: 9, align: 'center', lineBreak: false })
      doc.fontSize(6.5).font('Helvetica').fillColor(TEXT_DARK).text(l('yes', lang), checkX + 12, y + 2, { lineBreak: false })
      doc.rect(checkX + 50, y + 1, 9, 9).lineWidth(0.5).strokeColor(TEXT_DARK).stroke()
      if (!isYes && values[field.key] !== undefined) doc.fontSize(7).font('Helvetica-Bold').fillColor('#c62828').text('✗', checkX + 51.5, y + 1.5, { width: 9, align: 'center', lineBreak: false })
      doc.fontSize(6.5).font('Helvetica').fillColor(TEXT_DARK).text(l('no', lang), checkX + 62, y + 2, { lineBreak: false })
      y += 16
    } else {
      // Inline field: label + value
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(TEXT_DARK)
        .text(label + ':', lPad, y + 1, { width: 160, lineBreak: false })
      doc.fontSize(8).font('Helvetica').fillColor(NAVY)
        .text(value, lPad + 160, y + 1, { width: formW - 160, lineBreak: false })
      y += 15
    }
  }

  // Notes
  if (notes) {
    y += 4
    drawSectionHeader(doc, l('notes', lang), margin + 4, y, pageW - 8)
    y += 16
    doc.fontSize(8).font('Helvetica').fillColor(TEXT_DARK)
      .text(notes, lPad, y, { width: formW, lineGap: 2 })
    y = doc.y + 8
  }

  // Signature area
  y += 6
  const sigW = formW / 3 - 10
  const sigs = [l('responsible', lang), employeeName, l('date', lang)]
  for (let s = 0; s < sigs.length; s++) {
    const sx = lPad + s * (sigW + 15)
    doc.moveTo(sx, y + 22).lineTo(sx + sigW, y + 22).lineWidth(0.5).strokeColor(TEXT_MED).stroke()
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor(TEXT_DARK)
      .text(sigs[s], sx, y + 25, { width: sigW, align: 'center', lineBreak: false })
  }

  drawPageFooter(doc, fichaName, code, lang, W, margin)
  doc.end()
  return responsePromise
}

// ═══════════════════════════════════════════════════════════════════════════
// FILLED CERTIFICATE — landscape, cream bg, borders, ornaments
// ═══════════════════════════════════════════════════════════════════════════

function generateCertificateRecord(opts: RecordOpts, logo: Buffer | null): Promise<NextResponse> {
  const { fichaName, code, legalBasis, lang, dateStr, employeeName, fieldsSchema, values } = opts

  const doc = new PDFDocumentCtor({ size: 'A4', layout: 'landscape', margin: 0 })
  const responsePromise = pdfResponse(doc, code)
  const W = 841.89
  const H = 595.28

  // Background + borders — identical to blank template certificate
  doc.rect(0, 0, W, H).fill(CREAM)
  doc.rect(14, 14, W - 28, H - 28).lineWidth(2.5).stroke(NAVY)
  doc.rect(19, 19, W - 38, H - 38).lineWidth(1).stroke(GOLD)
  doc.rect(26, 26, W - 52, H - 52).lineWidth(0.4).dash(4, { space: 3 }).stroke(GOLD_LIGHT)
  doc.undash()
  drawCornerOrnaments(doc, 30, 30, W - 30, H - 30, 22, GOLD)

  let y = 36
  if (logo) { try { doc.image(logo, W / 2 - 28, y, { width: 56, height: 56 }) } catch { /* skip */ } }
  y += 62

  doc.font('Helvetica').fontSize(9).fillColor(GOLD_DARK)
    .text('GRANDCAFE CHEERS MALLORCA', 0, y, { width: W, align: 'center' })
  y += 16

  doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY)
    .text(l('trainingRecord', lang), 0, y, { width: W, align: 'center' })
  y += 24

  drawGoldDivider(doc, W / 2, y, 280)
  y += 16

  // Two-column filled values
  const leftCol = 80
  const rightCol = W / 2 + 30
  const colW = W / 2 - 110
  const fieldGap = 24

  const drawFilledField = (label: string, value: string, x: number) => {
    doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT_DARK)
      .text(label + ':', x, y, { lineBreak: false })
    doc.fontSize(9).font('Helvetica').fillColor(NAVY)
      .text(value || '—', x, y + 12, { width: colW, lineBreak: false })
    doc.moveTo(x, y + 22).lineTo(x + colW, y + 22).lineWidth(0.3).strokeColor(BORDER_GRAY).stroke()
  }

  // Resolve field values by key
  const fields = Array.isArray(fieldsSchema) ? fieldsSchema : []
  const getVal = (key: string): string => {
    const f = fields.find(fi => fi.key === key)
    if (f) return resolveFieldValue(f, values[key], lang)
    const raw = values[key]
    if (raw === undefined || raw === null) return '—'
    return String(raw)
  }

  // Employee name (from record metadata)
  drawFilledField(l('employee', lang), employeeName, leftCol)
  drawFilledField(l('date', lang), dateStr, rightCol)
  y += fieldGap

  // Try to find topic/provider/duration fields from schema
  const topicVal = getVal('training_topic') || getVal('topic') || getVal('tema') || fichaName
  const providerVal = getVal('provider') || getVal('proveedor') || getVal('centro')
  drawFilledField(LABELS['trainingTopic']?.[lang] || 'Training topic', topicVal, leftCol)
  drawFilledField(LABELS['provider']?.[lang] || 'Provider', providerVal, rightCol)
  y += fieldGap

  const durationVal = getVal('duration') || getVal('hours') || getVal('horas')
  const certNumVal = getVal('cert_number') || getVal('certificate_number') || getVal('numero_certificado')
  drawFilledField(LABELS['duration']?.[lang] || 'Duration', durationVal, leftCol)
  drawFilledField(LABELS['certNumber']?.[lang] || 'Certificate #', certNumVal, rightCol)
  y += fieldGap

  const resultVal = getVal('result') || getVal('resultado')
  const expiryVal = getVal('expiry_date') || getVal('fecha_caducidad') || getVal('expiry')
  drawFilledField(LABELS['result']?.[lang] || 'Result', resultVal, leftCol)
  drawFilledField(LABELS['expiryDate']?.[lang] || 'Expiry', expiryVal, rightCol)
  y += fieldGap + 8

  // Any remaining fields not rendered above
  const renderedKeys = new Set(['training_topic', 'topic', 'tema', 'provider', 'proveedor', 'centro', 'duration', 'hours', 'horas', 'cert_number', 'certificate_number', 'numero_certificado', 'result', 'resultado', 'expiry_date', 'fecha_caducidad', 'expiry'])
  const remaining = fields.filter(f => !renderedKeys.has(f.key) && values[f.key] !== undefined)
  for (const f of remaining) {
    if (y > H - 90) break
    const label = fieldLabel(f, lang)
    const value = resolveFieldValue(f, values[f.key], lang)
    drawFilledField(label, value, leftCol)
    y += fieldGap
  }

  // Signature block — identical to blank template
  const sigW = 190
  const sigGap = 100
  const sigLeftX = (W - sigW * 2 - sigGap) / 2
  const sigRightX = sigLeftX + sigW + sigGap

  y = Math.max(y, H - 120)
  doc.moveTo(sigLeftX, y + 28).lineTo(sigLeftX + sigW, y + 28).lineWidth(0.5).stroke(TEXT_MED)
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(NAVY)
    .text(l('hrResponsible', lang), sigLeftX, y + 32, { width: sigW, align: 'center' })
  doc.fontSize(6).font('Helvetica-Oblique').fillColor(TEXT_GRAY)
    .text(l('signatureAndStamp', lang), sigLeftX, y + 42, { width: sigW, align: 'center' })

  doc.moveTo(sigRightX, y + 28).lineTo(sigRightX + sigW, y + 28).lineWidth(0.5).stroke(TEXT_MED)
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(NAVY)
    .text(l('employee', lang), sigRightX, y + 32, { width: sigW, align: 'center' })
  doc.fontSize(6).font('Helvetica-Oblique').fillColor(TEXT_GRAY)
    .text(l('employeeSignature', lang), sigRightX, y + 42, { width: sigW, align: 'center' })

  // Bottom bar
  const barY = H - 50
  doc.rect(26, barY, W - 52, 18).fill(NAVY)
  doc.fontSize(6.5).fillColor(GOLD_LIGHT).font('Helvetica')
    .text(`GrandCafe Cheers  ·  ${code}  ·  ${legalBasis || 'Ley 31/1995 Art. 19, RD 39/1997'}`,
      40, barY + 4, { width: W - 80, align: 'center', lineBreak: false })

  doc.end()
  return responsePromise
}

// ---------------------------------------------------------------------------
// Shared drawing helpers
// ---------------------------------------------------------------------------

function drawSectionHeader(
  doc: InstanceType<typeof PDFDocumentCtor>,
  title: string, x: number, y: number, w: number,
) {
  doc.roundedRect(x, y, w, 14, 2).fill(NAVY)
  doc.fontSize(7).font('Helvetica-Bold').fillColor(GOLD_LIGHT)
    .text(title.toUpperCase(), x + 8, y + 3, { width: w - 16, lineBreak: false })
}

function drawReviewBlock(
  doc: InstanceType<typeof PDFDocumentCtor>,
  opts: { lang: string; reviewer: { full_name: string | null } | null; reviewedAt: string | null; reviewNotes: string | null },
  margin: number, y: number, pageW: number,
) {
  const { lang, reviewer, reviewedAt, reviewNotes } = opts

  doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT_DARK)
    .text(l('reviewedBy', lang) + ': ', margin + 10, y, { continued: true, width: 160 })
  doc.font('Helvetica').text(reviewer?.full_name || 'Unknown')
  y = doc.y + 3

  if (reviewedAt) {
    const rd = new Date(reviewedAt).toLocaleDateString(
      lang === 'es' ? 'es-ES' : lang === 'nl' ? 'nl-NL' : lang === 'de' ? 'de-DE' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    )
    doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT_DARK)
      .text(l('reviewDate', lang) + ': ', margin + 10, y, { continued: true, width: 160 })
    doc.font('Helvetica').text(rd)
    y = doc.y + 3
  }

  if (reviewNotes) {
    doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT_DARK)
      .text(l('reviewNotes', lang) + ':', margin + 10, y)
    y = doc.y + 2
    doc.fontSize(8).font('Helvetica').fillColor(TEXT_MED)
      .text(reviewNotes, margin + 10, y, { width: pageW - 20, lineGap: 2 })
  }
}
