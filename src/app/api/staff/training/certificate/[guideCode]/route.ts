import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { GUIDES } from '@/lib/data/resource-guides'
import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const categoryLabels: Record<string, Record<string, string>> = {
  food_safety: { en: 'Food Safety & Hygiene', es: 'Seguridad Alimentaria e Higiene', nl: 'Voedselveiligheid & Hygiëne', de: 'Lebensmittelsicherheit & Hygiene' },
  occupational_health: { en: 'Occupational Health & Safety', es: 'Salud y Seguridad Laboral', nl: 'Arbeidsgezondheid & Veiligheid', de: 'Arbeitsschutz & Sicherheit' },
  labor_regulations: { en: 'Labor Regulations', es: 'Regulaciones Laborales', nl: 'Arbeidsregels', de: 'Arbeitsrecht' },
  role_specific: { en: 'Role-Specific Training', es: 'Formación Específica del Rol', nl: 'Rolspecifieke Training', de: 'Rollenspezifische Schulung' },
  required_docs: { en: 'Documentation & Compliance', es: 'Documentación y Cumplimiento', nl: 'Documentatie & Naleving', de: 'Dokumentation & Compliance' },
  environmental: { en: 'Environmental Compliance', es: 'Cumplimiento Medioambiental', nl: 'Milieuvoorschriften', de: 'Umweltvorschriften' },
}

const labels: Record<string, Record<string, string>> = {
  certTitle: { en: 'CERTIFICATE OF COMPLETION', es: 'CERTIFICADO DE FINALIZACIÓN', nl: 'CERTIFICAAT VAN VOLTOOIING', de: 'ABSCHLUSSZERTIFIKAT' },
  certify: { en: 'This is to certify that', es: 'Se certifica que', nl: 'Hierbij wordt verklaard dat', de: 'Hiermit wird bescheinigt, dass' },
  completed: { en: 'has successfully completed the professional training course', es: 'ha completado satisfactoriamente el curso de formación profesional', nl: 'de professionele training met succes heeft afgerond', de: 'die professionelle Schulung erfolgreich abgeschlossen hat' },
  score: { en: 'Final Score', es: 'Puntuación Final', nl: 'Eindscore', de: 'Endergebnis' },
  certNo: { en: 'Certificate No.', es: 'Certificado Nº', nl: 'Certificaat Nr.', de: 'Zertifikat Nr.' },
  issued: { en: 'Issued on', es: 'Emitido el', nl: 'Uitgegeven op', de: 'Ausgestellt am' },
  director: { en: 'Training Director', es: 'Director de Formación', nl: 'Opleidingsdirecteur', de: 'Ausbildungsleiter' },
  management: { en: 'GrandCafe Cheers Management', es: 'Dirección GrandCafe Cheers', nl: 'GrandCafe Cheers Management', de: 'GrandCafe Cheers Geschäftsleitung' },
  location: { en: 'Mallorca, Spain', es: 'Mallorca, España', nl: 'Mallorca, Spanje', de: 'Mallorca, Spanien' },
  hours: { en: 'Training Hours', es: 'Horas de Formación', nl: 'Trainingsuren', de: 'Schulungsstunden' },
  verified: { en: 'This certificate can be verified with the certification number above', es: 'Este certificado puede verificarse con el número de certificación indicado', nl: 'Dit certificaat kan worden geverifieerd met het bovenstaande certificaatnummer', de: 'Dieses Zertifikat kann mit der oben genannten Zertifizierungsnummer verifiziert werden' },
}

function t(key: string, lang: string): string {
  return labels[key]?.[lang] || labels[key]?.en || key
}

function drawSeal(doc: PDFKit.PDFDocument, cx: number, cy: number, radius: number) {
  const GOLD = '#c9a84c'
  const CREAM = '#faf8f2'
  const notches = 32

  // Starburst outer shape
  doc.save()
  const startAngle = -Math.PI / 2
  const firstOuter = {
    x: cx + Math.cos(startAngle) * radius,
    y: cy + Math.sin(startAngle) * radius,
  }
  doc.moveTo(firstOuter.x, firstOuter.y)
  for (let i = 1; i <= notches * 2; i++) {
    const angle = startAngle + (Math.PI * 2 * i) / (notches * 2)
    const r = i % 2 === 0 ? radius : radius - 5
    doc.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
  }
  doc.closePath().fill(GOLD)

  // Inner concentric circles
  doc.circle(cx, cy, radius - 9).lineWidth(1.5).stroke(CREAM)
  doc.circle(cx, cy, radius - 12).lineWidth(0.5).stroke(CREAM)

  // Decorative dots ring
  const dotRadius = radius - 16
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 * i) / 24
    const dx = cx + Math.cos(angle) * dotRadius
    const dy = cy + Math.sin(angle) * dotRadius
    doc.circle(dx, dy, 1).fill(CREAM)
  }

  // Inner circle background
  doc.circle(cx, cy, radius - 20).fill(GOLD)
  doc.circle(cx, cy, radius - 22).lineWidth(0.5).stroke(CREAM)

  // Seal text
  doc.font('Helvetica-Bold').fontSize(6).fillColor(CREAM)
    .text('PROFESSIONALLY', cx - 28, cy - 14, { width: 56, align: 'center' })
  doc.font('Helvetica-Bold').fontSize(8).fillColor(CREAM)
    .text('CERTIFIED', cx - 28, cy - 5, { width: 56, align: 'center' })
  doc.font('Helvetica-Bold').fontSize(14).fillColor(CREAM)
    .text('✓', cx - 10, cy + 6, { width: 20, align: 'center' })

  doc.restore()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guideCode: string }> }
) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { guideCode } = await params
  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang') || 'en'

  const guide = GUIDES.find((g) => g.code === guideCode)
  if (!guide) {
    return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
  }

  const supabase = await createClient()

  const { data: employee } = await supabase
    .from('employees')
    .select('id, profile:profiles(full_name, role)')
    .eq('profile_id', authResult.data.user.id)
    .single()

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  const { data: testRecord } = await supabase
    .from('training_records')
    .select('*')
    .eq('employee_id', employee.id)
    .eq('guide_code', guideCode)
    .eq('action', 'test_passed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!testRecord) {
    return NextResponse.json({ error: 'No passing test record found' }, { status: 404 })
  }

  // Guide title
  let guideTitle = guideCode
  try {
    const messages = await import(`@/i18n/messages/${lang}/resources.json`)
    const data = messages.default || messages
    const parts = guide.titleKey.split('.')
    let current: unknown = data
    for (const part of parts) {
      current = (current as Record<string, unknown>)?.[part]
    }
    if (typeof current === 'string') guideTitle = current
  } catch {
    // Use code as fallback
  }

  const profileArr = employee.profile as unknown as Array<{ full_name: string | null; role: string }>
  const profile = Array.isArray(profileArr) ? profileArr[0] : profileArr as unknown as { full_name: string | null; role: string }
  const employeeName = profile?.full_name || 'Employee'
  const employeeRole = profile?.role || ''
  const score = testRecord.score ?? 0
  const categoryLabel = categoryLabels[guide.category]?.[lang] || guide.category

  // Unique certification number
  const certHash = crypto
    .createHash('sha256')
    .update(`${employee.id}-${guideCode}-${testRecord.created_at}`)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase()
  const certYear = new Date(testRecord.created_at).getFullYear()
  const certNumber = `GCC-${certYear}-${certHash}`

  // Load logo
  const logoPath = path.join(process.cwd(), 'public', 'icons', 'logoheader.png')
  let logoBuffer: Buffer | null = null
  try {
    logoBuffer = fs.readFileSync(logoPath)
  } catch {
    // Logo not available
  }

  // Record certificate download
  await supabase.from('training_records').insert({
    employee_id: employee.id,
    guide_code: guideCode,
    action: 'certificate_downloaded',
    language: lang,
  })

  // ============================================
  // Generate professional A4 landscape certificate
  // ============================================
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  const W = 841.89
  const H = 595.28

  // Colors
  const NAVY = '#1a1a2e'
  const GOLD = '#c9a84c'
  const GOLD_DARK = '#a08030'
  const GOLD_LIGHT = '#e8d5a0'
  const CREAM = '#faf8f2'
  const TEXT_DARK = '#2c2c3e'
  const TEXT_MED = '#555'

  // Background - elegant cream
  doc.rect(0, 0, W, H).fill(CREAM)

  // Outer border (navy, thick)
  doc.rect(14, 14, W - 28, H - 28).lineWidth(3).stroke(NAVY)

  // Gold border
  doc.rect(19, 19, W - 38, H - 38).lineWidth(1.5).stroke(GOLD)

  // Inner decorative border (dashed gold)
  doc.rect(27, 27, W - 54, H - 54).lineWidth(0.5).dash(4, { space: 3 }).stroke(GOLD_LIGHT)
  doc.undash()

  // Corner ornaments (L-shapes)
  const cSize = 25
  const cOff = 31
  // Top-left
  doc.moveTo(cOff, cOff + cSize).lineTo(cOff, cOff).lineTo(cOff + cSize, cOff).lineWidth(1.5).stroke(GOLD)
  // Top-right
  doc.moveTo(W - cOff - cSize, cOff).lineTo(W - cOff, cOff).lineTo(W - cOff, cOff + cSize).lineWidth(1.5).stroke(GOLD)
  // Bottom-left
  doc.moveTo(cOff, H - cOff - cSize).lineTo(cOff, H - cOff).lineTo(cOff + cSize, H - cOff).lineWidth(1.5).stroke(GOLD)
  // Bottom-right
  doc.moveTo(W - cOff - cSize, H - cOff).lineTo(W - cOff, H - cOff).lineTo(W - cOff, H - cOff - cSize).lineWidth(1.5).stroke(GOLD)

  // Logo at top center
  if (logoBuffer) {
    doc.image(logoBuffer, W / 2 - 32, 42, { width: 64, height: 64 })
  }

  // Organization name
  doc.font('Helvetica').fontSize(9).fillColor(GOLD_DARK)
  doc.text('GRANDCAFE CHEERS MALLORCA', 0, 112, { width: W, align: 'center' })

  // Certificate title
  doc.font('Times-Bold').fontSize(26).fillColor(NAVY)
    .text(t('certTitle', lang), 0, 132, { width: W, align: 'center' })

  // Gold divider with diamond center
  const divY = 168
  doc.moveTo(W / 2 - 130, divY).lineTo(W / 2 - 6, divY).lineWidth(1).stroke(GOLD)
  doc.moveTo(W / 2 + 6, divY).lineTo(W / 2 + 130, divY).lineWidth(1).stroke(GOLD)
  // Diamond
  doc.save()
  doc.moveTo(W / 2, divY - 4).lineTo(W / 2 + 4, divY).lineTo(W / 2, divY + 4).lineTo(W / 2 - 4, divY).closePath().fill(GOLD)
  doc.restore()

  // "This is to certify that"
  doc.font('Times-Roman').fontSize(11).fillColor(TEXT_MED)
    .text(t('certify', lang), 0, 186, { width: W, align: 'center' })

  // Employee name
  doc.font('Times-Bold').fontSize(28).fillColor(NAVY)
    .text(employeeName, 0, 208, { width: W, align: 'center' })

  // Gold line under name
  const nameY = 244
  doc.moveTo(W / 2 - 150, nameY).lineTo(W / 2 + 150, nameY).lineWidth(0.5).stroke(GOLD)

  // "has successfully completed..."
  doc.font('Times-Roman').fontSize(11).fillColor(TEXT_MED)
    .text(t('completed', lang), 0, 256, { width: W, align: 'center' })

  // Course title
  doc.font('Times-Bold').fontSize(18).fillColor(TEXT_DARK)
    .text(guideTitle, 80, 282, { width: W - 160, align: 'center' })

  // Category + Code
  doc.font('Helvetica').fontSize(9).fillColor(GOLD_DARK)
    .text(`${categoryLabel}  ·  ${guideCode}`, 0, 312, { width: W, align: 'center' })

  // ---- Score badge (left) ----
  const badgeY = 342
  const scoreX = W / 2 - 108
  doc.roundedRect(scoreX, badgeY, 90, 38, 4).fill(NAVY)
  doc.font('Helvetica').fontSize(7).fillColor(GOLD_LIGHT)
    .text(t('score', lang).toUpperCase(), scoreX, badgeY + 5, { width: 90, align: 'center' })
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff')
    .text(`${score}%`, scoreX, badgeY + 17, { width: 90, align: 'center' })

  // ---- Date badge (right) ----
  const dateX = W / 2 + 18
  const completedDate = new Date(testRecord.created_at).toLocaleDateString(
    lang === 'es' ? 'es-ES' : lang === 'nl' ? 'nl-NL' : lang === 'de' ? 'de-DE' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  )
  doc.roundedRect(dateX, badgeY, 90, 38, 4).lineWidth(1).stroke(NAVY)
  doc.font('Helvetica').fontSize(7).fillColor(NAVY)
    .text(t('issued', lang).toUpperCase(), dateX, badgeY + 5, { width: 90, align: 'center' })
  doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK)
    .text(completedDate, dateX, badgeY + 18, { width: 90, align: 'center' })

  // ---- Gold seal (right side) ----
  drawSeal(doc, W - 125, 432, 40)

  // ---- Signature areas ----
  const sigY = 445

  // Left signature - Management
  doc.moveTo(110, sigY).lineTo(290, sigY).lineWidth(0.5).stroke(TEXT_MED)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY)
    .text(t('management', lang), 110, sigY + 5, { width: 180, align: 'center' })
  doc.font('Helvetica').fontSize(8).fillColor(TEXT_MED)
    .text(t('director', lang), 110, sigY + 17, { width: 180, align: 'center' })

  // Center signature - Location
  doc.moveTo(360, sigY).lineTo(540, sigY).lineWidth(0.5).stroke(TEXT_MED)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY)
    .text(t('location', lang), 360, sigY + 5, { width: 180, align: 'center' })
  if (employeeRole) {
    const roleDisplay = employeeRole.charAt(0).toUpperCase() + employeeRole.slice(1)
    doc.font('Helvetica').fontSize(8).fillColor(TEXT_MED)
      .text(roleDisplay, 360, sigY + 17, { width: 180, align: 'center' })
  }

  // ---- Bottom certification bar ----
  const barY = H - 52
  doc.rect(27, barY, W - 54, 20).fill(NAVY)

  doc.font('Helvetica').fontSize(7).fillColor(GOLD_LIGHT)
    .text(`${t('certNo', lang)} ${certNumber}`, 40, barY + 5)

  doc.font('Helvetica').fontSize(6).fillColor(GOLD_LIGHT)
    .text('GrandCafe Cheers — Professional Training & Certification', 0, barY + 6, { width: W, align: 'center' })

  doc.font('Helvetica').fontSize(7).fillColor(GOLD_LIGHT)
    .text(t('location', lang), W - 200, barY + 5, { width: 160, align: 'right' })

  // Verification note (small, below bar)
  doc.font('Helvetica').fontSize(5.5).fillColor('#999')
    .text(t('verified', lang), 0, H - 28, { width: W, align: 'center' })

  doc.end()
  const pdfBuffer = await pdfPromise

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificate-${guideCode}-${lang}.pdf"`,
    },
  })
}
