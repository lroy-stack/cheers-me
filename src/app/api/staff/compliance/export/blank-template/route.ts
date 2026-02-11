import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import PDFDocumentCtor from 'pdfkit'
import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Layout mapping per ficha code
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

const FREQUENCY_ROWS: Record<string, number> = {
  daily: 31,
  weekly: 5,
  monthly: 12,
  per_event: 20,
  on_demand: 20,
}

// ---------------------------------------------------------------------------
// Multilingual labels
// ---------------------------------------------------------------------------

const LABELS: Record<string, Record<string, string>> = {
  page: { en: 'Page', es: 'Página', nl: 'Pagina', de: 'Seite' },
  of: { en: 'of', es: 'de', nl: 'van', de: 'von' },
  month: { en: 'Month', es: 'Mes', nl: 'Maand', de: 'Monat' },
  year: { en: 'Year', es: 'Año', nl: 'Jaar', de: 'Jahr' },
  date: { en: 'Date', es: 'Fecha', nl: 'Datum', de: 'Datum' },
  time: { en: 'Time', es: 'Hora', nl: 'Tijd', de: 'Uhrzeit' },
  dateTime: { en: 'Date / Time', es: 'Fecha / Hora', nl: 'Datum / Tijd', de: 'Datum / Uhrzeit' },
  responsible: { en: 'Responsible', es: 'Responsable', nl: 'Verantwoordelijke', de: 'Verantwortlich' },
  observations: { en: 'Observations', es: 'Observaciones', nl: 'Opmerkingen', de: 'Bemerkungen' },
  signature: { en: 'Signature', es: 'Firma', nl: 'Handtekening', de: 'Unterschrift' },
  yes: { en: 'Yes', es: 'Sí', nl: 'Ja', de: 'Ja' },
  no: { en: 'No', es: 'No', nl: 'Nee', de: 'Nein' },
  // Form-portrait labels
  record: { en: 'Record', es: 'Registro', nl: 'Registratie', de: 'Eintrag' },
  supplier: { en: 'Supplier', es: 'Proveedor', nl: 'Leverancier', de: 'Lieferant' },
  deliveryNote: { en: 'Delivery note #', es: 'Nº albarán', nl: 'Bonnummer', de: 'Lieferschein-Nr.' },
  products: { en: 'Products', es: 'Productos', nl: 'Producten', de: 'Produkte' },
  arrivalTemp: { en: 'Arrival temp.', es: 'Temp. llegada', nl: 'Aankomsttemp.', de: 'Ankunftstemp.' },
  packaging: { en: 'Packaging', es: 'Embalaje', nl: 'Verpakking', de: 'Verpackung' },
  labeling: { en: 'Labeling', es: 'Etiquetado', nl: 'Etikettering', de: 'Kennzeichnung' },
  expiry: { en: 'Expiry', es: 'Caducidad', nl: 'Houdbaarheid', de: 'Verfallsdatum' },
  organoleptic: { en: 'Organoleptic', es: 'Organoléptico', nl: 'Organoleptisch', de: 'Organoleptisch' },
  accepted: { en: 'Accepted', es: 'Aceptado', nl: 'Geaccepteerd', de: 'Akzeptiert' },
  rejected: { en: 'Rejected', es: 'Rechazado', nl: 'Afgewezen', de: 'Abgelehnt' },
  rejectionReason: { en: 'Rejection reason', es: 'Motivo rechazo', nl: 'Reden afwijzing', de: 'Ablehnungsgrund' },
  // Pest control
  visitDate: { en: 'Visit date', es: 'Fecha visita', nl: 'Bezoekdatum', de: 'Besuchsdatum' },
  company: { en: 'Company', es: 'Empresa', nl: 'Bedrijf', de: 'Unternehmen' },
  technician: { en: 'Technician', es: 'Técnico', nl: 'Technicus', de: 'Techniker' },
  areasInspected: { en: 'Areas inspected', es: 'Zonas inspeccionadas', nl: 'Geïnsp. gebieden', de: 'Insp. Bereiche' },
  findings: { en: 'Findings', es: 'Hallazgos', nl: 'Bevindingen', de: 'Befunde' },
  treatment: { en: 'Treatment applied', es: 'Tratamiento aplicado', nl: 'Toegep. behandeling', de: 'Angew. Behandlung' },
  nextVisit: { en: 'Next visit', es: 'Próxima visita', nl: 'Volgend bezoek', de: 'Nächster Besuch' },
  // Maintenance
  equipment: { en: 'Equipment', es: 'Equipo', nl: 'Apparatuur', de: 'Gerät' },
  interventionType: { en: 'Intervention type', es: 'Tipo intervención', nl: 'Type interventie', de: 'Interventionstyp' },
  description: { en: 'Description', es: 'Descripción', nl: 'Beschrijving', de: 'Beschreibung' },
  cost: { en: 'Cost (€)', es: 'Coste (€)', nl: 'Kosten (€)', de: 'Kosten (€)' },
  result: { en: 'Result', es: 'Resultado', nl: 'Resultaat', de: 'Ergebnis' },
  resolved: { en: 'Resolved', es: 'Resuelto', nl: 'Opgelost', de: 'Gelöst' },
  pending: { en: 'Pending', es: 'Pendiente', nl: 'In afwachting', de: 'Ausstehend' },
  preventive: { en: 'Preventive', es: 'Preventivo', nl: 'Preventief', de: 'Präventiv' },
  corrective: { en: 'Corrective', es: 'Correctivo', nl: 'Correctief', de: 'Korrektiv' },
  // Incident
  incidentReport: { en: 'INCIDENT REPORT', es: 'INFORME DE INCIDENTE', nl: 'INCIDENT RAPPORT', de: 'UNFALLBERICHT' },
  location: { en: 'Location', es: 'Ubicación', nl: 'Locatie', de: 'Standort' },
  type: { en: 'Type', es: 'Tipo', nl: 'Type', de: 'Typ' },
  severity: { en: 'Severity', es: 'Severidad', nl: 'Ernst', de: 'Schweregrad' },
  personsInvolved: { en: 'Persons involved', es: 'Personas implicadas', nl: 'Betrokken personen', de: 'Beteiligte Personen' },
  incidentDescription: { en: 'Incident description', es: 'Descripción del incidente', nl: 'Omschrijving incident', de: 'Beschreibung des Vorfalls' },
  immediateActions: { en: 'Immediate actions taken', es: 'Acciones inmediatas adoptadas', nl: 'Onmiddellijke acties genomen', de: 'Sofortmaßnahmen ergriffen' },
  firstAid: { en: 'First aid provided', es: 'Primeros auxilios prestados', nl: 'Eerste hulp verleend', de: 'Erste Hilfe geleistet' },
  medicalAttention: { en: 'Medical attention required', es: 'Atención médica requerida', nl: 'Medische hulp nodig', de: 'Ärztliche Versorgung erforderlich' },
  rootCause: { en: 'Root cause analysis', es: 'Análisis de causa raíz', nl: 'Grondoorzaak analyse', de: 'Ursachenanalyse' },
  correctiveActions: { en: 'Corrective / preventive actions', es: 'Acciones correctoras / preventivas', nl: 'Corrigerende / preventieve acties', de: 'Korrektur- / Präventivmaßnahmen' },
  reportedToAuthority: { en: 'Reported to authority', es: 'Comunicado a la autoridad', nl: 'Gemeld bij autoriteit', de: 'An Behörde gemeldet' },
  reportDate: { en: 'Report date', es: 'Fecha del informe', nl: 'Rapportdatum', de: 'Berichtsdatum' },
  incidentNo: { en: 'Incident No.', es: 'Incidente Nº', nl: 'Incident Nr.', de: 'Vorfall Nr.' },
  witnessName: { en: 'Witness name', es: 'Nombre del testigo', nl: 'Naam getuige', de: 'Name des Zeugen' },
  // Certificate
  trainingRecord: { en: 'TRAINING RECORD', es: 'CONSTANCIA DE FORMACIÓN RECIBIDA', nl: 'OPLEIDINGSREGISTRATIE', de: 'SCHULUNGSNACHWEIS' },
  employee: { en: 'Employee', es: 'Empleado/a', nl: 'Medewerker', de: 'Mitarbeiter/in' },
  idNumber: { en: 'ID / DNI', es: 'DNI / NIE', nl: 'ID-nummer', de: 'Ausweis-Nr.' },
  position: { en: 'Position', es: 'Puesto', nl: 'Functie', de: 'Position' },
  trainingTopic: { en: 'Training topic', es: 'Tema de formación', nl: 'Opleidingsonderwerp', de: 'Schulungsthema' },
  provider: { en: 'Provider / Center', es: 'Proveedor / Centro', nl: 'Aanbieder / Centrum', de: 'Anbieter / Zentrum' },
  duration: { en: 'Duration (hours)', es: 'Duración (horas)', nl: 'Duur (uren)', de: 'Dauer (Stunden)' },
  trainingType: { en: 'Training type', es: 'Tipo de formación', nl: 'Opleidingstype', de: 'Schulungstyp' },
  foodHandler: { en: 'Food handler', es: 'Manipulador de alimentos', nl: 'Voedselveiligheid', de: 'Lebensmittelhygiene' },
  basicPrl: { en: 'Basic OHS', es: 'PRL Básico', nl: 'Basis VGM', de: 'Grundl. Arbeitssicherheit' },
  specificPrl: { en: 'Specific OHS', es: 'PRL Específico', nl: 'Specifiek VGM', de: 'Spez. Arbeitssicherheit' },
  allergens: { en: 'Allergens', es: 'Alérgenos', nl: 'Allergenen', de: 'Allergene' },
  firstAidTraining: { en: 'First aid', es: 'Primeros auxilios', nl: 'Eerste hulp', de: 'Erste Hilfe' },
  haccp: { en: 'HACCP / APPCC', es: 'APPCC / HACCP', nl: 'HACCP', de: 'HACCP' },
  other: { en: 'Other', es: 'Otro', nl: 'Overig', de: 'Sonstiges' },
  certNumber: { en: 'Certificate No.', es: 'Nº Certificado', nl: 'Certificaatnr.', de: 'Zertifikatnr.' },
  expiryDate: { en: 'Expiry date', es: 'Fecha de caducidad', nl: 'Vervaldatum', de: 'Ablaufdatum' },
  pass: { en: 'Pass', es: 'Apto', nl: 'Geslaagd', de: 'Bestanden' },
  fail: { en: 'Fail', es: 'No apto', nl: 'Niet geslaagd', de: 'Nicht bestanden' },
  hrResponsible: { en: 'HR Responsible', es: 'Responsable RRHH', nl: 'HR Verantwoordelijke', de: 'Personalverantwortliche/r' },
  signatureAndStamp: { en: '(signature & stamp)', es: '(firma y sello)', nl: '(handtekening & stempel)', de: '(Unterschrift & Stempel)' },
  employeeSignature: { en: '(employee signature)', es: '(firma del empleado)', nl: '(handtekening medewerker)', de: '(Unterschrift Mitarbeiter)' },
  mallorca: { en: 'Mallorca, Spain', es: 'Mallorca, España', nl: 'Mallorca, Spanje', de: 'Mallorca, Spanien' },
  selfControlSystem: { en: 'Self-Control System', es: 'Sistema de Autocontrol', nl: 'Zelfcontrolesysteem', de: 'Eigenkontrollsystem' },
  establishment: { en: 'Establishment', es: 'Establecimiento', nl: 'Vestiging', de: 'Betrieb' },
}

function l(key: string, lang: string): string {
  return LABELS[key]?.[lang] || LABELS[key]?.en || key
}

// ---------------------------------------------------------------------------
// Colors (matching existing certificate)
// ---------------------------------------------------------------------------

const NAVY = '#1a1a2e'
const GOLD = '#c9a84c'
const GOLD_DARK = '#a08030'
const GOLD_LIGHT = '#e8d5a0'
const CREAM = '#faf8f2'
const LIGHT_GRAY = '#f5f5f5'
const BORDER_GRAY = '#BDBDBD'
const BORDER_LIGHT = '#e0e0e0'
const TEXT_DARK = '#2c2c3e'
const TEXT_MED = '#555'
const TEXT_GRAY = '#666666'

// ---------------------------------------------------------------------------
// Logo helper
// ---------------------------------------------------------------------------

function loadLogo(): Buffer | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'icons', 'logoheader.png')
    return fs.readFileSync(logoPath)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldSchema {
  key: string
  type: string
  label_en: string
  label_es: string
  label_nl?: string
  label_de?: string
  required: boolean
  options?: Array<{ value: string; label_en: string; label_es?: string; label_nl?: string; label_de?: string }>
  min?: number | null
  max?: number | null
  unit?: string | null
}

interface FichaOpts {
  fichaName: string
  code: string
  legalBasis: string | null
  fieldsSchema: FieldSchema[] | null
  rowCount: number
  lang: string
  frequency: string
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const format = searchParams.get('format') || 'pdf'
  const lang = searchParams.get('lang') || 'en'

  if (!code) {
    return NextResponse.json(
      { error: 'Ficha type code is required' },
      { status: 400 }
    )
  }

  if (format !== 'pdf' && format !== 'xlsx') {
    return NextResponse.json(
      { error: 'Format must be pdf or xlsx' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data: fichaType, error } = await supabase
    .from('compliance_ficha_types')
    .select('*')
    .eq('code', code)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Ficha type not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const nameKey = `name_${lang}` as string
  const fichaName =
    (fichaType[nameKey] as string) ||
    (fichaType.name_en as string) ||
    code

  const fieldsSchema = fichaType.fields_schema as FieldSchema[] | null
  const frequency = (fichaType.frequency as string) || 'on_demand'
  const rowCount = FREQUENCY_ROWS[frequency] || 20
  const legalBasis = fichaType.legal_basis as string | null

  const opts: FichaOpts = { fichaName, code, legalBasis, fieldsSchema, rowCount, lang, frequency }
  const layout = LAYOUT_MAP[code] || 'table-landscape'

  if (format === 'pdf') {
    switch (layout) {
      case 'form-portrait': return generateFormPDF(opts)
      case 'form-full-page': return generateIncidentPDF(opts)
      case 'certificate': return generateCertificatePDF(opts)
      default: return generateTablePDF(opts)
    }
  } else {
    switch (layout) {
      case 'form-portrait': return generateFormExcel(opts)
      case 'form-full-page': return generateFormExcel(opts)
      case 'certificate': return generateCertificateExcel(opts)
      default: return generateTableExcel(opts)
    }
  }
}

// ---------------------------------------------------------------------------
// Helper: create response from PDF
// ---------------------------------------------------------------------------

function pdfResponse(doc: InstanceType<typeof PDFDocumentCtor>, code: string, lang: string): Promise<NextResponse> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks)
      resolve(
        new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="blank-${code}-${lang}.pdf"`,
          },
        })
      )
    })
  })
}

// ---------------------------------------------------------------------------
// Decorative helpers (matching certificate style)
// ---------------------------------------------------------------------------

function drawCornerOrnaments(
  doc: InstanceType<typeof PDFDocumentCtor>,
  x1: number, y1: number, x2: number, y2: number,
  size: number, color: string,
) {
  doc.lineWidth(1.2)
  // Top-left
  doc.moveTo(x1, y1 + size).lineTo(x1, y1).lineTo(x1 + size, y1).stroke(color)
  // Top-right
  doc.moveTo(x2 - size, y1).lineTo(x2, y1).lineTo(x2, y1 + size).stroke(color)
  // Bottom-left
  doc.moveTo(x1, y2 - size).lineTo(x1, y2).lineTo(x1 + size, y2).stroke(color)
  // Bottom-right
  doc.moveTo(x2 - size, y2).lineTo(x2, y2).lineTo(x2, y2 - size).stroke(color)
}

function drawGoldDivider(
  doc: InstanceType<typeof PDFDocumentCtor>,
  centerX: number, y: number, width: number,
) {
  const halfW = width / 2
  doc.moveTo(centerX - halfW, y).lineTo(centerX - 5, y).lineWidth(0.8).stroke(GOLD)
  doc.moveTo(centerX + 5, y).lineTo(centerX + halfW, y).lineWidth(0.8).stroke(GOLD)
  // Diamond center
  doc.save()
  doc.moveTo(centerX, y - 3).lineTo(centerX + 3, y).lineTo(centerX, y + 3).lineTo(centerX - 3, y).closePath().fill(GOLD)
  doc.restore()
}

// ---------------------------------------------------------------------------
// Professional header for table & form layouts
// ---------------------------------------------------------------------------

function drawProfessionalHeader(
  doc: InstanceType<typeof PDFDocumentCtor>,
  opts: { fichaName: string; code: string; legalBasis: string | null; lang: string },
  logo: Buffer | null,
  W: number, _H: number, margin: number,
  options?: { subtitle?: string; showMonthYear?: boolean },
): number {
  const pageW = W - margin * 2

  // Top accent bar (navy)
  doc.rect(margin, margin, pageW, 4).fill(NAVY)

  // Gold thin line below
  doc.rect(margin, margin + 4, pageW, 1.5).fill(GOLD)

  let y = margin + 14

  // Logo
  if (logo) {
    try {
      doc.image(logo, margin + 8, y, { width: 36, height: 36 })
    } catch { /* skip */ }
  }

  // Company name + ficha title block
  const textX = logo ? margin + 52 : margin + 8
  const textW = pageW - (textX - margin) - 10

  doc.fontSize(13).font('Helvetica-Bold').fillColor(NAVY)
    .text('GRANDCAFE CHEERS', textX, y, { width: textW, lineBreak: false })

  doc.fontSize(6.5).font('Helvetica').fillColor(GOLD_DARK)
    .text(l('mallorca', opts.lang) + '  ·  ' + l('selfControlSystem', opts.lang), textX, y + 15, { width: textW, lineBreak: false })

  // Ficha title (right-aligned or below)
  doc.fontSize(11).font('Helvetica-Bold').fillColor(TEXT_DARK)
    .text(options?.subtitle || opts.fichaName, textX, y + 26, { width: textW, lineBreak: false })

  // Code badge
  const codeText = opts.code
  const codeBadgeW = codeText.length * 5.5 + 16
  const codeBadgeX = margin + pageW - codeBadgeW - 4
  doc.roundedRect(codeBadgeX, y + 2, codeBadgeW, 16, 3).fill(NAVY)
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#fff')
    .text(codeText, codeBadgeX + 8, y + 5, { width: codeBadgeW - 16, align: 'center', lineBreak: false })

  // Month/Year fields
  if (options?.showMonthYear !== false) {
    const myX = codeBadgeX - 200
    doc.fontSize(7.5).font('Helvetica').fillColor(TEXT_MED)
      .text(`${l('month', opts.lang)}: __________  ${l('year', opts.lang)}: ______`, myX, y + 26, { width: 200, align: 'right', lineBreak: false })
  }

  y += 44

  // Legal basis bar
  if (opts.legalBasis) {
    doc.roundedRect(margin, y, pageW, 16, 2).fill(LIGHT_GRAY)
    // Small gold accent on left
    doc.rect(margin, y, 3, 16).fill(GOLD)
    doc.fontSize(6).fillColor(TEXT_GRAY).font('Helvetica-Oblique')
      .text(opts.legalBasis, margin + 10, y + 3.5, { width: pageW - 20, lineBreak: false })
    y += 22
  } else {
    y += 6
  }

  return y
}

// ---------------------------------------------------------------------------
// Professional footer for all pages
// ---------------------------------------------------------------------------

/** Draw footer on the CURRENT page — no bufferPages/switchToPage needed */
function drawPageFooter(
  doc: InstanceType<typeof PDFDocumentCtor>,
  fichaName: string, code: string,
  lang: string, W: number, margin: number,
  currentPage: number, totalPages: number,
) {
  const pageW = W - margin * 2
  const footerY = doc.page.height - 28

  // Bottom gold line
  doc.rect(margin, footerY, pageW, 1).fill(GOLD)
  // Bottom navy bar
  doc.rect(margin, footerY + 1, pageW, 14).fill(NAVY)

  doc.fontSize(6).fillColor(GOLD_LIGHT).font('Helvetica')
    .text(
      `GrandCafe Cheers  ·  ${fichaName}  ·  ${code}  ·  ${l('page', lang)} ${currentPage} ${l('of', lang)} ${totalPages}`,
      margin + 8,
      footerY + 4,
      { width: pageW - 16, align: 'center', lineBreak: false }
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. TABLE-LANDSCAPE PDF (LD-001, LD-002, APPCC-TEMP, APPCC-COOK, APPCC-OIL)
// ═══════════════════════════════════════════════════════════════════════════

function generateTablePDF(opts: FichaOpts): Promise<NextResponse> {
  const { fichaName, code, legalBasis, fieldsSchema, lang } = opts
  const logo = loadLogo()
  const margin = 28

  const doc = new PDFDocumentCtor({
    size: 'A4',
    layout: 'landscape',
    margin,
  })

  const responsePromise = pdfResponse(doc, code, lang)

  const W = doc.page.width
  const H = doc.page.height
  const pageW = W - margin * 2

  // Professional header
  let y = drawProfessionalHeader(doc, { fichaName, code, legalBasis, lang }, logo, W, H, margin, { showMonthYear: true })

  // Build column definitions
  const columns: Array<{ header: string; subtext?: string; width: number }> = []

  // Date column
  columns.push({ header: l('date', lang), width: 0 })
  // Time column
  columns.push({ header: l('time', lang), width: 0 })

  const fields = Array.isArray(fieldsSchema) ? fieldsSchema : []
  for (const field of fields) {
    const labelKey = `label_${lang}` as keyof typeof field
    let header = (field[labelKey] as string) || field.label_en || field.key
    let subtext: string | undefined

    if (field.unit) header = `${header} (${field.unit})`

    if ((field.type === 'temperature' || field.type === 'number') && (field.min != null || field.max != null)) {
      const parts: string[] = []
      if (field.min != null) parts.push(`min: ${field.min}`)
      if (field.max != null) parts.push(`max: ${field.max}`)
      subtext = parts.join(' / ')
      if (field.unit) subtext += ` ${field.unit}`
    }

    if (field.type === 'select' && field.options && field.options.length > 0) {
      const optLabelKey = `label_${lang}` as keyof (typeof field.options)[0]
      subtext = field.options.map((o) => (o[optLabelKey] as string) || o.label_en || o.value).join(' | ')
    }

    columns.push({ header, subtext, width: 0 })
  }

  // Responsible (signature) column
  columns.push({ header: l('responsible', lang) + '\n(' + l('signature', lang) + ')', width: 0 })
  // Observations column
  columns.push({ header: l('observations', lang), width: 0 })

  // Calculate widths proportionally
  const totalCols = columns.length
  const dateW = 58
  const timeW = 42
  const responsableW = 72
  const observacionesW = 80
  const fixedW = dateW + timeW + responsableW + observacionesW
  const fieldColsCount = totalCols - 4

  columns[0].width = dateW
  columns[1].width = timeW
  columns[totalCols - 2].width = responsableW
  columns[totalCols - 1].width = observacionesW

  const remainingWidth = pageW - fixedW
  const fieldWidth = fieldColsCount > 0 ? Math.floor(remainingWidth / fieldColsCount) : 0
  for (let i = 2; i < 2 + fieldColsCount; i++) {
    columns[i].width = fieldWidth
  }
  // Distribute remainder to last field column
  if (fieldColsCount > 0) {
    const usedWidth = fixedW + fieldWidth * fieldColsCount
    columns[1 + fieldColsCount].width += pageW - usedWidth
  }

  // ── Table header row ──
  const tableHeaderH = 30
  // Navy background
  doc.rect(margin, y, pageW, tableHeaderH).fill(NAVY)

  let x = margin
  for (const col of columns) {
    // Vertical separator lines (gold)
    if (x > margin) {
      doc.moveTo(x, y + 2).lineTo(x, y + tableHeaderH - 2).lineWidth(0.3).stroke(GOLD_DARK)
    }

    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#FFFFFF')
      .text(col.header, x + 3, y + (col.subtext ? 3 : 8), {
        width: col.width - 6,
        align: 'center',
        height: col.subtext ? 13 : tableHeaderH - 8,
      })

    if (col.subtext) {
      doc.fontSize(5).font('Helvetica-Oblique').fillColor(GOLD_LIGHT)
        .text(col.subtext, x + 3, y + 17, {
          width: col.width - 6,
          align: 'center',
          height: 12,
        })
    }
    x += col.width
  }

  // Gold bottom border on header
  doc.rect(margin, y + tableHeaderH, pageW, 1.5).fill(GOLD)

  y += tableHeaderH + 1.5

  // ── Calculate max rows for 1 page ──
  const rowHeight = 16
  const footerReserve = 32
  const availableForRows = H - y - footerReserve
  const maxRows = Math.floor(availableForRows / rowHeight)
  const rowCount = Math.min(opts.rowCount, maxRows)

  // ── Draw data rows ──
  for (let r = 0; r < rowCount; r++) {
    // Alternating row colors
    const bgColor = r % 2 === 0 ? '#FFFFFF' : '#f7f7fa'
    doc.rect(margin, y, pageW, rowHeight).fill(bgColor)

    // Cell borders
    x = margin
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c]
      // Left border
      doc.moveTo(x, y).lineTo(x, y + rowHeight).lineWidth(0.3).stroke(BORDER_LIGHT)
      // Bottom border
      doc.moveTo(x, y + rowHeight).lineTo(x + col.width, y + rowHeight).lineWidth(0.3).stroke(BORDER_LIGHT)
      x += col.width
    }
    // Right edge
    doc.moveTo(margin + pageW, y).lineTo(margin + pageW, y + rowHeight).lineWidth(0.3).stroke(BORDER_LIGHT)

    y += rowHeight
  }

  // Bottom closing line (thicker)
  doc.moveTo(margin, y).lineTo(margin + pageW, y).lineWidth(1).stroke(NAVY)

  drawPageFooter(doc, fichaName, code, lang, W, margin, 1, 1)
  doc.end()
  return responsePromise
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. FORM-PORTRAIT PDF (APPCC-REC-001, PEST-001, MAINT-001)
// ═══════════════════════════════════════════════════════════════════════════

function generateFormPDF(opts: FichaOpts): Promise<NextResponse> {
  const { fichaName, code, legalBasis, lang } = opts
  const logo = loadLogo()
  const margin = 36

  const doc = new PDFDocumentCtor({
    size: 'A4',
    layout: 'portrait',
    margin,
  })

  const responsePromise = pdfResponse(doc, code, lang)

  const W = doc.page.width
  const H = doc.page.height
  const pageW = W - margin * 2

  let y = drawProfessionalHeader(doc, { fichaName, code, legalBasis, lang }, logo, W, H, margin, {
    showMonthYear: code !== 'APPCC-REC-001', // REC is per-event, no month
  })

  // Each form block
  const footerReserve = 32
  const availableH = H - y - footerReserve

  // Calculate block heights based on type
  const blockHeight = code === 'APPCC-REC-001' ? 172 : code === 'PEST-001' ? 152 : 160
  const blockGap = 8
  const blocksPerPage = Math.max(1, Math.floor(availableH / (blockHeight + blockGap)))

  for (let b = 0; b < blocksPerPage; b++) {
    const bTop = y + 2

    // Block container with navy left accent
    doc.roundedRect(margin, bTop, pageW, blockHeight, 4)
      .strokeColor(BORDER_GRAY).lineWidth(0.5).stroke()
    // Navy left accent bar
    doc.rect(margin, bTop, 4, blockHeight).fill(NAVY)
    // Gold accent top of block
    doc.rect(margin + 4, bTop, pageW - 4, 1).fill(GOLD)

    // Block number badge
    const badgeText = `${l('record', lang)} #${b + 1}`
    doc.roundedRect(margin + 12, bTop + 5, 80, 14, 3).fill(NAVY)
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#fff')
      .text(badgeText, margin + 14, bTop + 8, { width: 76, align: 'center' })

    let fy = bTop + 25
    const lPad = margin + 14 // left padding inside block
    const fieldW = pageW - 28

    if (code === 'APPCC-REC-001') {
      // ── Receiving form ──
      const lineH = 14
      const labelW = 110
      const valLineW = fieldW - labelW

      // Date / Time row (side by side)
      const halfField = fieldW / 2 - 5
      drawFormFieldInline(doc, l('date', lang), lPad, fy, halfField, lineH)
      drawFormFieldInline(doc, l('time', lang), lPad + halfField + 10, fy, halfField, lineH)
      fy += lineH + 2

      drawFormFieldInline(doc, l('supplier', lang), lPad, fy, fieldW, lineH, labelW, valLineW)
      fy += lineH + 2
      drawFormFieldInline(doc, l('deliveryNote', lang), lPad, fy, fieldW, lineH, labelW, valLineW)
      fy += lineH + 2
      drawFormFieldInline(doc, l('products', lang), lPad, fy, fieldW, lineH, labelW, valLineW)
      fy += lineH + 2

      // Temperature
      doc.fontSize(7).font('Helvetica-Bold').fillColor(TEXT_DARK)
        .text(l('arrivalTemp', lang) + ':', lPad, fy + 1, { width: labelW })
      doc.fontSize(7).font('Helvetica').fillColor(TEXT_MED)
        .text('_________ °C', lPad + labelW, fy + 1)
      fy += lineH + 2

      // Checklist boxes ✓/✗ in a grid
      const checks = [l('packaging', lang), l('labeling', lang), l('expiry', lang), l('organoleptic', lang)]
      const checkBoxW = fieldW / 4
      for (let ci = 0; ci < checks.length; ci++) {
        const cx = lPad + ci * checkBoxW
        // Check box
        doc.rect(cx, fy + 1, 8, 8).lineWidth(0.5).strokeColor(TEXT_DARK).stroke()
        doc.fontSize(6).font('Helvetica').fillColor(TEXT_DARK)
          .text('✓', cx + 1.5, fy + 2, { width: 8, align: 'center' })
        // Slash
        doc.fontSize(6).font('Helvetica').fillColor(TEXT_GRAY)
          .text('/', cx + 11, fy + 2)
        // X box
        doc.rect(cx + 17, fy + 1, 8, 8).lineWidth(0.5).strokeColor(TEXT_DARK).stroke()
        doc.fontSize(6).font('Helvetica').fillColor(TEXT_DARK)
          .text('✗', cx + 18.5, fy + 2, { width: 8, align: 'center' })
        // Label
        doc.fontSize(6).font('Helvetica').fillColor(TEXT_DARK)
          .text(checks[ci], cx + 28, fy + 2, { width: checkBoxW - 32 })
      }
      fy += lineH + 4

      // Accepted / Rejected checkboxes
      doc.rect(lPad, fy + 1, 8, 8).lineWidth(0.5).strokeColor(TEXT_DARK).stroke()
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#2e7d32')
        .text(l('accepted', lang), lPad + 12, fy + 1)

      doc.rect(lPad + 110, fy + 1, 8, 8).lineWidth(0.5).strokeColor(TEXT_DARK).stroke()
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#c62828')
        .text(l('rejected', lang), lPad + 124, fy + 1)

      // Rejection reason line
      doc.fontSize(6).font('Helvetica').fillColor(TEXT_GRAY)
        .text(l('rejectionReason', lang) + ':', lPad + 200, fy + 1)
      doc.moveTo(lPad + 280, fy + 9).lineTo(lPad + fieldW, fy + 9)
        .lineWidth(0.3).strokeColor(BORDER_GRAY).stroke()
      fy += lineH + 4

      // Responsible + Signature
      drawFormFieldInline(doc, l('responsible', lang), lPad, fy, fieldW / 2 - 5, lineH)
      drawFormFieldInline(doc, l('signature', lang), lPad + fieldW / 2 + 5, fy, fieldW / 2 - 5, lineH)

    } else if (code === 'PEST-001') {
      // ── Pest control form ──
      const lineH = 14
      const labelW = 120
      const valLineW = fieldW - labelW

      const halfField = fieldW / 2 - 5
      drawFormFieldInline(doc, l('visitDate', lang), lPad, fy, halfField, lineH)
      drawFormFieldInline(doc, l('time', lang), lPad + halfField + 10, fy, halfField, lineH)
      fy += lineH + 2

      drawFormFieldInline(doc, l('company', lang), lPad, fy, fieldW, lineH, labelW, valLineW)
      fy += lineH + 2
      drawFormFieldInline(doc, l('technician', lang), lPad, fy, fieldW, lineH, labelW, valLineW)
      fy += lineH + 2
      drawFormFieldInline(doc, l('areasInspected', lang), lPad, fy, fieldW, lineH, labelW, valLineW)
      fy += lineH + 2
      drawFormFieldInline(doc, l('findings', lang), lPad, fy, fieldW, lineH, labelW, valLineW)
      fy += lineH + 2
      drawFormFieldInline(doc, l('treatment', lang), lPad, fy, fieldW, lineH, labelW, valLineW)
      fy += lineH + 2
      drawFormFieldInline(doc, l('nextVisit', lang), lPad, fy, fieldW, lineH, labelW, valLineW)
      fy += lineH + 4

      drawFormFieldInline(doc, l('responsible', lang), lPad, fy, fieldW / 2 - 5, lineH)
      drawFormFieldInline(doc, l('signature', lang), lPad + fieldW / 2 + 5, fy, fieldW / 2 - 5, lineH)

    } else {
      // ── MAINT-001 maintenance form ──
      const lineH = 14
      const labelW = 120
      const valLineW = fieldW - labelW

      const halfField = fieldW / 2 - 5
      drawFormFieldInline(doc, l('date', lang), lPad, fy, halfField, lineH)
      drawFormFieldInline(doc, l('time', lang), lPad + halfField + 10, fy, halfField, lineH)
      fy += lineH + 2

      drawFormFieldInline(doc, l('equipment', lang), lPad, fy, fieldW, lineH, labelW, valLineW)
      fy += lineH + 2

      // Intervention type checkboxes
      doc.fontSize(7).font('Helvetica-Bold').fillColor(TEXT_DARK)
        .text(l('interventionType', lang) + ':', lPad, fy + 1, { width: labelW })
      const interventions = [l('preventive', lang), l('corrective', lang)]
      for (let ii = 0; ii < interventions.length; ii++) {
        const ix = lPad + labelW + ii * 100
        doc.rect(ix, fy + 1, 8, 8).lineWidth(0.5).strokeColor(TEXT_DARK).stroke()
        doc.fontSize(6.5).font('Helvetica').fillColor(TEXT_DARK)
          .text(interventions[ii], ix + 12, fy + 2)
      }
      fy += lineH + 2

      drawFormFieldInline(doc, l('description', lang), lPad, fy, fieldW, lineH, labelW, valLineW)
      fy += lineH + 2
      // Extra description line
      doc.moveTo(lPad, fy + 8).lineTo(lPad + fieldW, fy + 8).lineWidth(0.3).strokeColor(BORDER_GRAY).stroke()
      fy += lineH + 2

      drawFormFieldInline(doc, l('cost', lang), lPad, fy, halfField, lineH)

      // Result checkboxes
      doc.fontSize(7).font('Helvetica-Bold').fillColor(TEXT_DARK)
        .text(l('result', lang) + ':', lPad + halfField + 10, fy + 1, { width: 60 })
      doc.rect(lPad + halfField + 70, fy + 1, 8, 8).lineWidth(0.5).strokeColor(TEXT_DARK).stroke()
      doc.fontSize(6.5).font('Helvetica').fillColor('#2e7d32')
        .text(l('resolved', lang), lPad + halfField + 82, fy + 2)
      doc.rect(lPad + halfField + 140, fy + 1, 8, 8).lineWidth(0.5).strokeColor(TEXT_DARK).stroke()
      doc.fontSize(6.5).font('Helvetica').fillColor('#e65100')
        .text(l('pending', lang), lPad + halfField + 152, fy + 2)
      fy += lineH + 4

      drawFormFieldInline(doc, l('responsible', lang), lPad, fy, fieldW / 2 - 5, lineH)
      drawFormFieldInline(doc, l('signature', lang), lPad + fieldW / 2 + 5, fy, fieldW / 2 - 5, lineH)
    }

    y += blockHeight + blockGap
  }

  drawPageFooter(doc, fichaName, code, lang, W, margin, 1, 1)
  doc.end()
  return responsePromise
}

/** Draw a form field: label + underline */
function drawFormFieldInline(
  doc: InstanceType<typeof PDFDocumentCtor>,
  label: string,
  x: number, y: number,
  totalW: number, height: number,
  labelW?: number, lineW?: number,
) {
  const lw = labelW || Math.min(label.length * 5 + 20, totalW * 0.4)
  const vw = lineW || (totalW - lw)

  doc.fontSize(7).font('Helvetica-Bold').fillColor(TEXT_DARK)
    .text(label + ':', x, y + 1, { width: lw })
  doc.moveTo(x + lw, y + height - 3).lineTo(x + lw + vw, y + height - 3)
    .lineWidth(0.4).strokeColor(BORDER_GRAY).stroke()
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. FORM-FULL-PAGE PDF (INC-001 — 2 incident forms, 2 pages)
// ═══════════════════════════════════════════════════════════════════════════

function generateIncidentPDF(opts: FichaOpts): Promise<NextResponse> {
  const { fichaName, code, legalBasis, lang } = opts
  const logo = loadLogo()
  const margin = 36

  const doc = new PDFDocumentCtor({
    size: 'A4',
    layout: 'portrait',
    margin,
  })

  const responsePromise = pdfResponse(doc, code, lang)

  const W = doc.page.width
  const H = doc.page.height
  const pageW = W - margin * 2

  const drawIncidentForm = (pageIndex: number) => {
    if (pageIndex > 0) doc.addPage()

    // Cream background
    doc.rect(0, 0, W, H).fill(CREAM)

    // Outer border
    doc.rect(margin - 6, margin - 6, pageW + 12, H - margin * 2 + 12)
      .lineWidth(2).strokeColor(NAVY).stroke()
    doc.rect(margin - 3, margin - 3, pageW + 6, H - margin * 2 + 6)
      .lineWidth(0.5).strokeColor(GOLD).stroke()

    // Corner ornaments
    drawCornerOrnaments(doc, margin, margin, margin + pageW, H - margin, 18, GOLD)

    // Top accent bar
    doc.rect(margin, margin, pageW, 3).fill(NAVY)
    doc.rect(margin, margin + 3, pageW, 1).fill(GOLD)

    let y = margin + 12

    // Logo centered
    if (logo) {
      try {
        doc.image(logo, margin + 8, y, { width: 32, height: 32 })
      } catch { /* skip */ }
    }

    // Company name
    const textX = logo ? margin + 48 : margin + 8
    doc.fontSize(12).font('Helvetica-Bold').fillColor(NAVY)
      .text('GRANDCAFE CHEERS', textX, y + 2)
    doc.fontSize(6).font('Helvetica').fillColor(GOLD_DARK)
      .text(l('mallorca', lang), textX, y + 16)

    // Title - right side
    doc.fontSize(14).font('Helvetica-Bold').fillColor(NAVY)
      .text(l('incidentReport', lang), margin, y + 2, { width: pageW, align: 'right' })

    // Code + incident number
    doc.fontSize(7).font('Helvetica').fillColor(TEXT_GRAY)
      .text(`${code}  ·  ${l('incidentNo', lang)} ________`, margin, y + 20, { width: pageW, align: 'right' })

    y += 38

    // Divider
    drawGoldDivider(doc, margin + pageW / 2, y, 200)
    y += 10

    // Legal basis
    if (legalBasis) {
      doc.roundedRect(margin + 4, y, pageW - 8, 14, 2).fill(LIGHT_GRAY)
      doc.rect(margin + 4, y, 3, 14).fill(GOLD)
      doc.fontSize(5.5).fillColor(TEXT_GRAY).font('Helvetica-Oblique')
        .text(legalBasis, margin + 12, y + 3, { width: pageW - 24 })
      y += 20
    }

    const lPad = margin + 10
    const formW = pageW - 20
    const halfW = formW / 2 - 8

    // Section helper
    const drawSection = (title: string) => {
      doc.roundedRect(lPad - 2, y, formW + 4, 13, 2).fill(NAVY)
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#fff')
        .text(title.toUpperCase(), lPad + 4, y + 3, { width: formW - 8 })
      y += 17
    }

    const drawField = (label: string, wide = true) => {
      const w = wide ? formW : halfW
      doc.fontSize(7).font('Helvetica-Bold').fillColor(TEXT_DARK)
        .text(label + ':', lPad, y + 1)
      doc.moveTo(lPad + (wide ? 0 : label.length * 4 + 12), y + 11)
        .lineTo(lPad + w, y + 11).lineWidth(0.3).strokeColor(BORDER_GRAY).stroke()
      if (wide) y += 15
    }

    const drawMultiLine = (label: string, lines: number) => {
      doc.fontSize(7).font('Helvetica-Bold').fillColor(TEXT_DARK)
        .text(label + ':', lPad, y + 1)
      y += 11
      for (let i = 0; i < lines; i++) {
        doc.moveTo(lPad, y + 10).lineTo(lPad + formW, y + 10)
          .lineWidth(0.3).strokeColor(BORDER_GRAY).stroke()
        y += 14
      }
      y += 2
    }

    const drawCheckField = (label: string) => {
      doc.fontSize(7).font('Helvetica-Bold').fillColor(TEXT_DARK)
        .text(label + ':', lPad, y + 1, { width: 200 })
      // Yes
      doc.rect(lPad + 210, y + 1, 9, 9).lineWidth(0.5).strokeColor(TEXT_DARK).stroke()
      doc.fontSize(6.5).font('Helvetica').fillColor(TEXT_DARK)
        .text(l('yes', lang), lPad + 222, y + 2)
      // No
      doc.rect(lPad + 260, y + 1, 9, 9).lineWidth(0.5).strokeColor(TEXT_DARK).stroke()
      doc.fontSize(6.5).font('Helvetica').fillColor(TEXT_DARK)
        .text(l('no', lang), lPad + 272, y + 2)
      y += 15
    }

    // ── SECTION 1: Incident data ──
    drawSection(l('incidentDescription', lang).split(' ')[0] || 'Incident')

    // Date + Time (side by side)
    drawField(l('date', lang), false)
    drawFormFieldInline(doc, l('time', lang), lPad + halfW + 16, y + 1 - 15, halfW, 13)
    y += 15

    drawField(l('location', lang))

    // Type + Severity side by side
    drawField(l('type', lang), false)
    drawFormFieldInline(doc, l('severity', lang), lPad + halfW + 16, y + 1 - 15, halfW, 13)
    y += 15

    drawMultiLine(l('personsInvolved', lang), 2)
    drawMultiLine(l('incidentDescription', lang), 4)

    // ── SECTION 2: Response ──
    drawSection(l('immediateActions', lang))
    drawMultiLine(l('immediateActions', lang), 2)
    drawCheckField(l('firstAid', lang))
    drawCheckField(l('medicalAttention', lang))

    // ── SECTION 3: Root cause & corrective ──
    drawSection(l('rootCause', lang))
    drawMultiLine(l('rootCause', lang), 2)
    drawMultiLine(l('correctiveActions', lang), 2)
    drawCheckField(l('reportedToAuthority', lang))

    // ── SECTION 4: Observations + signatures ──
    drawMultiLine(l('observations', lang), 1)

    y += 4
    // Signature row
    const sigW = formW / 3 - 10
    const sigs = [l('responsible', lang), l('witnessName', lang), l('reportDate', lang)]
    for (let s = 0; s < sigs.length; s++) {
      const sx = lPad + s * (sigW + 15)
      doc.moveTo(sx, y + 22).lineTo(sx + sigW, y + 22).lineWidth(0.5).strokeColor(TEXT_MED).stroke()
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor(TEXT_DARK)
        .text(sigs[s], sx, y + 25, { width: sigW, align: 'center' })
      if (s < 2) {
        doc.fontSize(5.5).font('Helvetica-Oblique').fillColor(TEXT_GRAY)
          .text('(' + l('signature', lang) + ')', sx, y + 34, { width: sigW, align: 'center', lineBreak: false })
      }
    }

    // Footer on this page
    drawPageFooter(doc, fichaName, code, lang, W, margin, pageIndex + 1, 2)
  }

  // Draw 2 incident forms (2 pages)
  drawIncidentForm(0)
  drawIncidentForm(1)

  doc.end()
  return responsePromise
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. CERTIFICATE PDF (TRAIN-CERT-001) — Training Record / Constancia
// ═══════════════════════════════════════════════════════════════════════════

function generateCertificatePDF(opts: FichaOpts): Promise<NextResponse> {
  const { code, legalBasis, lang } = opts
  const logo = loadLogo()

  const doc = new PDFDocumentCtor({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
  })

  const responsePromise = pdfResponse(doc, code, lang)

  const W = 841.89
  const H = 595.28

  // ── Background ──
  doc.rect(0, 0, W, H).fill(CREAM)

  // ── Borders (matching certificate style) ──
  doc.rect(14, 14, W - 28, H - 28).lineWidth(2.5).stroke(NAVY)
  doc.rect(19, 19, W - 38, H - 38).lineWidth(1).stroke(GOLD)
  doc.rect(26, 26, W - 52, H - 52).lineWidth(0.4).dash(4, { space: 3 }).stroke(GOLD_LIGHT)
  doc.undash()

  // Corner ornaments
  drawCornerOrnaments(doc, 30, 30, W - 30, H - 30, 22, GOLD)

  // ── Logo (centered) ──
  let y = 36
  if (logo) {
    try {
      doc.image(logo, W / 2 - 28, y, { width: 56, height: 56 })
    } catch { /* skip */ }
  }
  y += 62

  // ── Company name ──
  doc.font('Helvetica').fontSize(9).fillColor(GOLD_DARK)
    .text('GRANDCAFE CHEERS MALLORCA', 0, y, { width: W, align: 'center' })
  y += 16

  // ── Title ──
  doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY)
    .text(l('trainingRecord', lang), 0, y, { width: W, align: 'center' })
  y += 24

  // Gold divider with diamond
  drawGoldDivider(doc, W / 2, y, 280)
  y += 16

  // ── Form fields (two-column layout) ──
  const leftCol = 80
  const rightCol = W / 2 + 30
  const colW = W / 2 - 110
  const fieldGap = 22
  const lineLen = colW

  const drawCertField = (label: string, x: number, currentY: number) => {
    doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT_DARK)
      .text(label + ':', x, currentY)
    doc.moveTo(x, currentY + 13).lineTo(x + lineLen, currentY + 13)
      .lineWidth(0.4).strokeColor(BORDER_GRAY).stroke()
  }

  // Employee + ID side by side
  drawCertField(l('employee', lang), leftCol, y)
  drawCertField(l('idNumber', lang), rightCol, y)
  y += fieldGap

  // Position (full width left)
  drawCertField(l('position', lang), leftCol, y)
  drawCertField(l('establishment', lang), rightCol, y)
  y += fieldGap

  // Topic + Provider
  drawCertField(l('trainingTopic', lang), leftCol, y)
  drawCertField(l('provider', lang), rightCol, y)
  y += fieldGap

  // Date + Duration
  drawCertField(l('date', lang), leftCol, y)
  drawCertField(l('duration', lang), rightCol, y)
  y += fieldGap + 6

  // ── Training type box ──
  const boxX = leftCol
  const boxW = W - 160
  const boxH = 62
  doc.roundedRect(boxX, y, boxW, boxH, 4).lineWidth(0.8).strokeColor(NAVY).stroke()

  // Box header
  doc.rect(boxX, y, boxW, 14).fill(NAVY)
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#fff')
    .text(l('trainingType', lang), boxX + 8, y + 3)

  const typeOptions = [
    l('foodHandler', lang), l('basicPrl', lang), l('specificPrl', lang),
    l('allergens', lang), l('firstAidTraining', lang), l('haccp', lang), l('other', lang),
  ]

  const checkY = y + 19
  const checkColW = (boxW - 24) / 4
  for (let i = 0; i < typeOptions.length; i++) {
    const cx = boxX + 12 + (i % 4) * checkColW
    const cy = checkY + Math.floor(i / 4) * 17
    doc.rect(cx, cy, 8, 8).lineWidth(0.5).strokeColor(TEXT_DARK).stroke()
    doc.fontSize(6.5).font('Helvetica').fillColor(TEXT_DARK)
      .text(typeOptions[i], cx + 12, cy + 1, { width: checkColW - 18 })
  }

  // "Other" line
  const otherI = typeOptions.length - 1
  const otherCx = boxX + 12 + (otherI % 4) * checkColW
  const otherCy = checkY + Math.floor(otherI / 4) * 17
  doc.moveTo(otherCx + 40, otherCy + 8).lineTo(otherCx + checkColW - 5, otherCy + 8)
    .lineWidth(0.3).strokeColor(BORDER_GRAY).stroke()

  y += boxH + 10

  // ── Cert number + expiry + result ──
  drawCertField(l('certNumber', lang), leftCol, y)
  drawCertField(l('expiryDate', lang), rightCol, y)
  y += fieldGap

  // Result checkboxes
  doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT_DARK)
    .text(l('result', lang) + ':', leftCol, y)
  doc.rect(leftCol + 80, y, 9, 9).lineWidth(0.5).strokeColor('#2e7d32').stroke()
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#2e7d32')
    .text(l('pass', lang), leftCol + 93, y + 1)
  doc.rect(leftCol + 140, y, 9, 9).lineWidth(0.5).strokeColor('#c62828').stroke()
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#c62828')
    .text(l('fail', lang), leftCol + 153, y + 1)

  // Observations
  doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT_DARK)
    .text(l('observations', lang) + ':', rightCol, y)
  doc.moveTo(rightCol, y + 13).lineTo(rightCol + lineLen, y + 13)
    .lineWidth(0.4).strokeColor(BORDER_GRAY).stroke()
  y += fieldGap + 8

  // ── Signature block ──
  const sigW = 190
  const sigGap = 100
  const sigLeftX = (W - sigW * 2 - sigGap) / 2
  const sigRightX = sigLeftX + sigW + sigGap

  // Left signature: HR
  doc.moveTo(sigLeftX, y + 28).lineTo(sigLeftX + sigW, y + 28).lineWidth(0.5).stroke(TEXT_MED)
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(NAVY)
    .text(l('hrResponsible', lang), sigLeftX, y + 32, { width: sigW, align: 'center' })
  doc.fontSize(6).font('Helvetica-Oblique').fillColor(TEXT_GRAY)
    .text(l('signatureAndStamp', lang), sigLeftX, y + 42, { width: sigW, align: 'center' })

  // Right signature: Employee
  doc.moveTo(sigRightX, y + 28).lineTo(sigRightX + sigW, y + 28).lineWidth(0.5).stroke(TEXT_MED)
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(NAVY)
    .text(l('employee', lang), sigRightX, y + 32, { width: sigW, align: 'center' })
  doc.fontSize(6).font('Helvetica-Oblique').fillColor(TEXT_GRAY)
    .text(l('employeeSignature', lang), sigRightX, y + 42, { width: sigW, align: 'center' })

  // ── Bottom bar (matching certificate) ──
  const barY = H - 50
  doc.rect(26, barY, W - 52, 18).fill(NAVY)
  doc.fontSize(6.5).fillColor(GOLD_LIGHT).font('Helvetica')
    .text(
      `GrandCafe Cheers  ·  ${code}  ·  ${legalBasis || 'Ley 31/1995 Art. 19, RD 39/1997'}`,
      40, barY + 4,
      { width: W - 80, align: 'center', lineBreak: false }
    )

  // Reset cursor to page 0 top to prevent PDFKit from adding an extra blank page
  doc.end()
  return responsePromise
}

// ═══════════════════════════════════════════════════════════════════════════
// EXCEL: Table layout (LD, APPCC-TEMP, APPCC-COOK, APPCC-OIL)
// ═══════════════════════════════════════════════════════════════════════════

async function generateTableExcel(opts: FichaOpts): Promise<NextResponse> {
  const { fichaName, code, legalBasis, fieldsSchema, rowCount, lang } = opts

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GrandCafe Cheers Manager'
  workbook.created = new Date()

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

  const fields = Array.isArray(fieldsSchema) ? fieldsSchema : []

  // Try to embed logo
  const logo = loadLogo()
  if (logo) {
    try {
      // @ts-expect-error ExcelJS Buffer type mismatch with Node 22
      const imageId = workbook.addImage({ buffer: logo, extension: 'png' })
      sheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 50, height: 50 },
      })
    } catch { /* skip */ }
  }

  // Build headers
  const headers: string[] = [
    l('date', lang),
    l('time', lang),
  ]

  const fieldColumns: Array<{ colIndex: number; field: (typeof fields)[0] }> = []

  for (const field of fields) {
    const labelKey = `label_${lang}` as keyof typeof field
    let label = (field[labelKey] as string) || field.label_en || field.key
    if (field.unit) label = `${label} (${field.unit})`
    if ((field.type === 'temperature' || field.type === 'number') && (field.min != null || field.max != null)) {
      const parts: string[] = []
      if (field.min != null) parts.push(`${field.min}`)
      if (field.max != null) parts.push(`${field.max}`)
      label = `${label} [${parts.join('-')}]`
    }
    fieldColumns.push({ colIndex: headers.length + 1, field })
    headers.push(label)
  }

  headers.push(l('responsible', lang))
  headers.push(l('observations', lang))

  const totalCols = headers.length

  // Row 1: Title
  sheet.mergeCells(1, 1, 1, totalCols)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = `GRANDCAFE CHEERS — ${fichaName}`
  titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAF8F2' } }
  sheet.getRow(1).height = 40

  // Row 2: Legal basis
  if (legalBasis) {
    sheet.mergeCells(2, 1, 2, totalCols)
    const legalCell = sheet.getCell(2, 1)
    legalCell.value = legalBasis
    legalCell.font = { italic: true, size: 9, color: { argb: '666666' } }
    legalCell.alignment = { horizontal: 'center', vertical: 'middle' }
    legalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F5' } }
    sheet.getRow(2).height = 20
  }

  // Row 3: Headers with navy background + gold bottom border
  const headerRow = sheet.getRow(3)
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1A1A2E' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'C9A84C' } },
      bottom: { style: 'medium', color: { argb: 'C9A84C' } },
      left: { style: 'thin', color: { argb: '333333' } },
      right: { style: 'thin', color: { argb: '333333' } },
    }
  })
  headerRow.height = 28

  // Column widths
  sheet.getColumn(1).width = 14
  sheet.getColumn(2).width = 10
  for (let i = 0; i < fields.length; i++) {
    sheet.getColumn(3 + i).width = 16
  }
  sheet.getColumn(3 + fields.length).width = 18
  sheet.getColumn(4 + fields.length).width = 24

  // Data rows with alternating cream/white
  const dataStartRow = 4
  for (let r = 0; r < rowCount; r++) {
    const row = sheet.getRow(dataStartRow + r)
    row.height = 22
    const bgColor = r % 2 === 0 ? 'FFFFFF' : 'F7F7FA'
    for (let col = 1; col <= totalCols; col++) {
      const cell = row.getCell(col)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } },
      }
      cell.alignment = { vertical: 'middle' }
    }
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(1).numFmt = 'dd/mm/yyyy'
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(2).numFmt = 'hh:mm'
  }

  // Bottom border row (navy)
  const bottomRow = sheet.getRow(dataStartRow + rowCount)
  for (let col = 1; col <= totalCols; col++) {
    bottomRow.getCell(col).border = {
      top: { style: 'medium', color: { argb: '1A1A2E' } },
    }
  }

  // Data validation
  const sheetWithValidations = sheet as ExcelJS.Worksheet & {
    dataValidations: { add(range: string, validation: Partial<ExcelJS.DataValidation>): void }
  }
  const dataEndRow = dataStartRow + rowCount - 1

  for (const { colIndex, field } of fieldColumns) {
    const colLetter = columnLetter(colIndex)
    const range = `${colLetter}${dataStartRow}:${colLetter}${dataEndRow}`

    if (field.type === 'select' && field.options && field.options.length > 0) {
      const optLabelKey = `label_${lang}` as keyof (typeof field.options)[0]
      const optLabels = field.options.map((o) => (o[optLabelKey] as string) || o.label_en || o.value)
      sheetWithValidations.dataValidations.add(range, {
        type: 'list', allowBlank: true,
        formulae: [`"${optLabels.join(',')}"`],
        showErrorMessage: true, errorTitle: 'Invalid',
        error: `Select: ${optLabels.join(', ')}`,
      })
    } else if (field.type === 'boolean') {
      const yesNo = `${l('yes', lang)},${l('no', lang)}`
      sheetWithValidations.dataValidations.add(range, {
        type: 'list', allowBlank: true, formulae: [`"${yesNo}"`],
      })
    } else if ((field.type === 'number' || field.type === 'temperature') && (field.min != null || field.max != null)) {
      sheetWithValidations.dataValidations.add(range, {
        type: 'decimal', allowBlank: true, showErrorMessage: true, errorTitle: 'Out of range',
        operator: 'between' as ExcelJS.DataValidationOperator,
        formulae: [field.min != null ? field.min : -99999, field.max != null ? field.max : 99999],
        error: `Value must be between ${field.min ?? '-'} and ${field.max ?? '-'}`,
      })
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="blank-${code}-${lang}.xlsx"`,
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// EXCEL: Form layout (REC, PEST, MAINT, INC)
// ═══════════════════════════════════════════════════════════════════════════

async function generateFormExcel(opts: FichaOpts): Promise<NextResponse> {
  const { fichaName, code, legalBasis, lang } = opts

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GrandCafe Cheers Manager'
  workbook.created = new Date()

  const sheetName = code.length > 31 ? code.slice(0, 31) : code
  const sheet = workbook.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const logo = loadLogo()
  if (logo) {
    try {
      // @ts-expect-error ExcelJS Buffer type mismatch with Node 22
      const imageId = workbook.addImage({ buffer: logo, extension: 'png' })
      sheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 50, height: 50 } })
    } catch { /* skip */ }
  }

  // Build form fields
  let formFields: string[] = []

  if (code === 'APPCC-REC-001') {
    formFields = [l('date', lang), l('time', lang), l('supplier', lang), l('deliveryNote', lang),
      l('products', lang), l('arrivalTemp', lang), l('packaging', lang) + ' ✓/✗', l('labeling', lang) + ' ✓/✗',
      l('expiry', lang) + ' ✓/✗', l('organoleptic', lang) + ' ✓/✗',
      l('accepted', lang) + '/' + l('rejected', lang),
      l('rejectionReason', lang), l('responsible', lang), l('signature', lang)]
  } else if (code === 'PEST-001') {
    formFields = [l('visitDate', lang), l('time', lang), l('company', lang), l('technician', lang),
      l('areasInspected', lang), l('findings', lang), l('treatment', lang), l('nextVisit', lang),
      l('responsible', lang), l('signature', lang)]
  } else if (code === 'MAINT-001') {
    formFields = [l('date', lang), l('time', lang), l('equipment', lang), l('interventionType', lang),
      l('description', lang), l('cost', lang), l('result', lang), l('responsible', lang), l('signature', lang)]
  } else {
    formFields = [l('date', lang), l('time', lang), l('location', lang), l('type', lang), l('severity', lang),
      l('personsInvolved', lang), l('incidentDescription', lang), l('immediateActions', lang),
      l('firstAid', lang) + ' (' + l('yes', lang) + '/' + l('no', lang) + ')',
      l('medicalAttention', lang) + ' (' + l('yes', lang) + '/' + l('no', lang) + ')',
      l('rootCause', lang), l('correctiveActions', lang),
      l('reportedToAuthority', lang) + ' (' + l('yes', lang) + '/' + l('no', lang) + ')',
      l('observations', lang), l('responsible', lang), l('reportDate', lang)]
  }

  const totalFormCols = formFields.length + 1

  // Title row
  sheet.mergeCells(1, 1, 1, totalFormCols)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = `GRANDCAFE CHEERS — ${fichaName}`
  titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAF8F2' } }
  sheet.getRow(1).height = 40

  if (legalBasis) {
    sheet.mergeCells(2, 1, 2, totalFormCols)
    const legalCell = sheet.getCell(2, 1)
    legalCell.value = legalBasis
    legalCell.font = { italic: true, size: 9, color: { argb: '666666' } }
    legalCell.alignment = { horizontal: 'center', vertical: 'middle' }
    legalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F5' } }
  }

  // Headers
  const headerRow = sheet.getRow(3)
  const formHeaders = [l('record', lang) + ' #', ...formFields]
  sheet.getColumn(1).width = 10

  for (let i = 0; i < formHeaders.length; i++) {
    const cell = headerRow.getCell(i + 1)
    cell.value = formHeaders[i]
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1A1A2E' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'C9A84C' } },
      bottom: { style: 'medium', color: { argb: 'C9A84C' } },
      left: { style: 'thin', color: { argb: '333333' } },
      right: { style: 'thin', color: { argb: '333333' } },
    }
    if (i > 0) sheet.getColumn(i + 1).width = 18
  }
  headerRow.height = 30

  // Data rows
  const recordCount = code === 'INC-001' ? 2 : 10
  for (let r = 0; r < recordCount; r++) {
    const row = sheet.getRow(4 + r)
    row.height = 24
    row.getCell(1).value = r + 1
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(1).font = { bold: true, size: 10, color: { argb: '1A237E' } }
    const bgColor = r % 2 === 0 ? 'FFFFFF' : 'F7F7FA'
    for (let c = 1; c <= formHeaders.length; c++) {
      const cell = row.getCell(c)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } },
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="blank-${code}-${lang}.xlsx"`,
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// EXCEL: Certificate layout (TRAIN-CERT-001)
// ═══════════════════════════════════════════════════════════════════════════

async function generateCertificateExcel(opts: FichaOpts): Promise<NextResponse> {
  const { code, legalBasis, lang } = opts

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GrandCafe Cheers Manager'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Training Record', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  })

  const logo = loadLogo()
  if (logo) {
    try {
      // @ts-expect-error ExcelJS Buffer type mismatch with Node 22
      const imageId = workbook.addImage({ buffer: logo, extension: 'png' })
      sheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 50, height: 50 } })
    } catch { /* skip */ }
  }

  // Columns A-I
  sheet.getColumn(1).width = 6
  sheet.getColumn(2).width = 22
  sheet.getColumn(3).width = 14
  sheet.getColumn(4).width = 26
  sheet.getColumn(5).width = 22
  sheet.getColumn(6).width = 14
  sheet.getColumn(7).width = 12
  sheet.getColumn(8).width = 16
  sheet.getColumn(9).width = 12

  const totalCols = 9

  // Title row
  sheet.mergeCells(1, 1, 1, totalCols)
  const titleCell = sheet.getCell('A1')
  titleCell.value = `GRANDCAFE CHEERS — ${l('trainingRecord', lang)}`
  titleCell.font = { bold: true, size: 16, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAF8F2' } }
  sheet.getRow(1).height = 44

  // Headers
  const headers = [
    '#', l('employee', lang), l('idNumber', lang), l('trainingTopic', lang),
    l('provider', lang), l('date', lang), l('duration', lang),
    l('certNumber', lang), l('result', lang),
  ]

  const headerRow = sheet.getRow(3)
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1A1A2E' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'C9A84C' } },
      bottom: { style: 'medium', color: { argb: 'C9A84C' } },
      left: { style: 'thin', color: { argb: '333333' } },
      right: { style: 'thin', color: { argb: '333333' } },
    }
  })
  headerRow.height = 28

  // 20 empty rows
  for (let r = 0; r < 20; r++) {
    const row = sheet.getRow(4 + r)
    row.height = 22
    row.getCell(1).value = r + 1
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(1).font = { bold: true, color: { argb: '1A237E' } }
    const bgColor = r % 2 === 0 ? 'FFFFFF' : 'F7F7FA'
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } },
      }
    }
  }

  // Result validation
  const sheetWithValidations = sheet as ExcelJS.Worksheet & {
    dataValidations: { add(range: string, validation: Partial<ExcelJS.DataValidation>): void }
  }
  sheetWithValidations.dataValidations.add('I4:I23', {
    type: 'list', allowBlank: true,
    formulae: [`"${l('pass', lang)},${l('fail', lang)}"`],
  })

  // Footer with legal basis
  sheet.mergeCells(25, 1, 25, totalCols)
  const footerCell = sheet.getCell('A25')
  footerCell.value = `GrandCafe Cheers  ·  ${code}  ·  ${legalBasis || 'Ley 31/1995 Art.19'}`
  footerCell.font = { italic: true, size: 8, color: { argb: '999999' } }
  footerCell.alignment = { horizontal: 'center', vertical: 'middle' }

  const buffer = await workbook.xlsx.writeBuffer()
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="blank-${code}-${lang}.xlsx"`,
    },
  })
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function columnLetter(col: number): string {
  let letter = ''
  let c = col
  while (c > 0) {
    const mod = (c - 1) % 26
    letter = String.fromCharCode(65 + mod) + letter
    c = Math.floor((c - 1) / 26)
  }
  return letter
}
