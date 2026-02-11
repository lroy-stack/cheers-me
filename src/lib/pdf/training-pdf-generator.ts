import PDFDocument from 'pdfkit'
import type { GuideContent } from '@/types'
import type { GuideMetadata } from '@/lib/data/resource-guides'
import fs from 'fs'
import path from 'path'

interface PdfOptions {
  guide: GuideMetadata
  content: GuideContent
  lang: string
  categoryLabel: string
}

const LABELS: Record<string, Record<string, string>> = {
  tableOfContents: { en: 'Table of Contents', es: 'Índice', nl: 'Inhoudsopgave', de: 'Inhaltsverzeichnis' },
  legalBasis: { en: 'Legal Basis', es: 'Base Legal', nl: 'Wettelijke grondslag', de: 'Rechtsgrundlage' },
  summary: { en: 'Summary', es: 'Resumen', nl: 'Samenvatting', de: 'Zusammenfassung' },
  keyPoints: { en: 'Key Points', es: 'Puntos Clave', nl: 'Kernpunten', de: 'Kernpunkte' },
  checklists: { en: 'Checklists', es: 'Listas de Verificación', nl: 'Checklists', de: 'Checklisten' },
  bestPractices: { en: 'Best Practices', es: 'Mejores Prácticas', nl: 'Beste Praktijken', de: 'Beste Praktiken' },
  glossary: { en: 'Glossary', es: 'Glosario', nl: 'Woordenlijst', de: 'Glossar' },
  footer: { en: 'GrandCafe Cheers — Professional Training', es: 'GrandCafe Cheers — Formación Profesional', nl: 'GrandCafe Cheers — Professionele Training', de: 'GrandCafe Cheers — Professionelle Schulung' },
  generated: { en: 'Generated', es: 'Generado', nl: 'Gegenereerd', de: 'Erstellt' },
  page: { en: 'Page', es: 'Página', nl: 'Pagina', de: 'Seite' },
}

function label(key: string, lang: string): string {
  return LABELS[key]?.[lang] || LABELS[key]?.en || key
}

// Colors
const NAVY = '#1a1a2e'
const GOLD = '#c9a84c'
const GOLD_LIGHT = '#e8d5a0'
const ACCENT = '#e94560'
const TEXT = '#333333'
const TEXT_LIGHT = '#666666'

// Page geometry
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 55
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_Y = PAGE_H - 45
const CONTENT_BOTTOM = FOOTER_Y - 20

export function generateTrainingPdf(options: PdfOptions): Promise<Buffer> {
  const { guide, content, lang, categoryLabel } = options

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: 60, left: MARGIN, right: MARGIN },
    bufferPages: true,
  })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  const promise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  // Load logo
  const logoPath = path.join(process.cwd(), 'public', 'icons', 'logoheader.png')
  let logoBuffer: Buffer | null = null
  try {
    logoBuffer = fs.readFileSync(logoPath)
  } catch {
    // Logo not available
  }

  // Helper: ensure enough vertical space, add new page if needed
  function ensureSpace(needed: number) {
    if (doc.y > CONTENT_BOTTOM - needed) {
      doc.addPage()
    }
  }

  // Helper: draw section heading with gold underline
  function sectionHeading(text: string, fontSize = 15) {
    doc.font('Helvetica-Bold').fontSize(fontSize).fillColor(NAVY)
      .text(text, MARGIN, doc.y, { width: CONTENT_W })
    const lineY = doc.y + 3
    doc.moveTo(MARGIN, lineY).lineTo(MARGIN + 55, lineY).lineWidth(2).stroke(GOLD)
    doc.y = lineY + 10
  }

  // Helper: draw sub-heading
  function subHeading(text: string) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#2c2c3e')
      .text(text, MARGIN + 8, doc.y, { width: CONTENT_W - 16 })
    doc.moveDown(0.3)
  }

  // Helper: draw body text
  function bodyText(text: string, indent = 0) {
    doc.font('Helvetica').fontSize(9.5).fillColor(TEXT)
      .text(text, MARGIN + indent, doc.y, { width: CONTENT_W - indent, lineGap: 3 })
  }

  // Helper: draw section divider
  function sectionDivider() {
    doc.moveDown(0.5)
    const y = doc.y
    doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).lineWidth(0.5).stroke('#e0e0e0')
    doc.y = y + 12
  }

  // ==========================================
  // PAGE 1: Cover
  // ==========================================
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(NAVY)

  // Logo
  if (logoBuffer) {
    doc.image(logoBuffer, PAGE_W / 2 - 45, 150, { width: 90, height: 90 })
  }

  // Organization name
  doc.font('Helvetica').fontSize(10).fillColor(GOLD)
    .text('GRANDCAFE CHEERS MALLORCA', MARGIN, 260, { width: CONTENT_W, align: 'center' })

  // Accent divider
  const coverDivY = 282
  doc.moveTo(PAGE_W / 2 - 40, coverDivY).lineTo(PAGE_W / 2 + 40, coverDivY).lineWidth(2).stroke(ACCENT)

  // Category
  doc.font('Helvetica').fontSize(11).fillColor(ACCENT)
    .text(categoryLabel.toUpperCase(), MARGIN, 300, { width: CONTENT_W, align: 'center' })

  // Title
  doc.font('Helvetica-Bold').fontSize(24).fillColor('#ffffff')
    .text(content.title, MARGIN + 10, 336, { width: CONTENT_W - 20, align: 'center' })

  // Guide code
  doc.font('Helvetica').fontSize(12).fillColor('#888888')
    .text(guide.code, MARGIN, doc.y + 18, { width: CONTENT_W, align: 'center' })

  // Legal basis box
  const legalBoxY = 500
  const legalText = content.legalBasis.length > 250
    ? content.legalBasis.substring(0, 250) + '...'
    : content.legalBasis
  doc.roundedRect(MARGIN + 25, legalBoxY, CONTENT_W - 50, 75, 3).lineWidth(0.5).stroke('#555555')
  doc.font('Helvetica-Bold').fontSize(7).fillColor(GOLD)
    .text(label('legalBasis', lang).toUpperCase(), MARGIN + 35, legalBoxY + 10, { width: CONTENT_W - 70 })
  doc.font('Helvetica').fontSize(8).fillColor('#999999')
    .text(legalText, MARGIN + 35, legalBoxY + 22, { width: CONTENT_W - 70, lineGap: 2 })

  // Date at bottom — block addPage since y exceeds margin bottom
  const dateStr = new Date().toLocaleDateString(
    lang === 'es' ? 'es-ES' : lang === 'nl' ? 'nl-NL' : lang === 'de' ? 'de-DE' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  )
  const _coverAddPage = doc.addPage
  doc.addPage = () => doc
  doc.font('Helvetica').fontSize(9).fillColor('#777777')
    .text(`${label('generated', lang)}: ${dateStr}`, MARGIN, PAGE_H - 75, { width: CONTENT_W, align: 'center', lineBreak: false })

  // Footer branding on cover
  doc.font('Helvetica').fontSize(7).fillColor('#555555')
    .text(label('footer', lang), MARGIN, PAGE_H - 30, { width: CONTENT_W, align: 'center', lineBreak: false })
  doc.addPage = _coverAddPage

  // ==========================================
  // PAGE 2: Table of Contents
  // ==========================================
  doc.addPage()

  sectionHeading(label('tableOfContents', lang), 18)
  doc.moveDown(0.5)

  let tocNum = 1

  // Summary entry
  doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT)
    .text(`${tocNum}. ${label('summary', lang)}`, MARGIN + 10, doc.y, { width: CONTENT_W - 20 })
  doc.moveDown(0.4)
  tocNum++

  // Section entries
  content.sections.forEach((section) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT)
      .text(`${tocNum}. ${section.heading}`, MARGIN + 10, doc.y, { width: CONTENT_W - 20 })
    doc.moveDown(0.15)

    if (section.subsections) {
      section.subsections.forEach((sub) => {
        doc.font('Helvetica').fontSize(9).fillColor(TEXT_LIGHT)
          .text(`     ${sub.heading}`, MARGIN + 20, doc.y, { width: CONTENT_W - 30 })
        doc.moveDown(0.1)
      })
    }

    tocNum++
    doc.moveDown(0.2)
  })

  // Appendix entries
  if (content.checklists.length > 0) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT)
      .text(`${tocNum}. ${label('checklists', lang)}`, MARGIN + 10, doc.y)
    tocNum++
    doc.moveDown(0.3)
  }
  if (content.bestPractices.length > 0) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT)
      .text(`${tocNum}. ${label('bestPractices', lang)}`, MARGIN + 10, doc.y)
    tocNum++
    doc.moveDown(0.3)
  }
  if (Object.keys(content.glossary).length > 0) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT)
      .text(`${tocNum}. ${label('glossary', lang)}`, MARGIN + 10, doc.y)
    doc.moveDown(0.3)
  }

  // ==========================================
  // CONTENT: Summary + Key Points
  // ==========================================
  doc.addPage()
  sectionHeading(label('summary', lang))
  doc.moveDown(0.3)

  bodyText(content.summary)
  doc.moveDown(0.8)

  if (content.keyPoints.length > 0) {
    ensureSpace(50)
    doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY)
      .text(label('keyPoints', lang), MARGIN, doc.y)
    doc.moveDown(0.4)

    content.keyPoints.forEach((point, idx) => {
      ensureSpace(25)
      const bulletY = doc.y
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT)
        .text(`${idx + 1}.`, MARGIN + 5, bulletY, { lineBreak: false })
      doc.font('Helvetica').fontSize(9.5).fillColor(TEXT)
        .text(point, MARGIN + 23, bulletY, { width: CONTENT_W - 28, lineGap: 2 })
      doc.moveDown(0.2)
    })
  }

  // ==========================================
  // SECTIONS: Continuous flow without forced page breaks
  // ==========================================
  content.sections.forEach((section) => {
    // Ensure space for heading + at least some content
    ensureSpace(90)

    // Visual divider between sections
    if (doc.y > MARGIN + 30) {
      sectionDivider()
    }

    // Section heading
    sectionHeading(section.heading, 14)

    // Section content
    if (section.content && section.content.trim()) {
      bodyText(section.content)
      doc.moveDown(0.5)
    }

    // Subsections
    if (section.subsections) {
      section.subsections.forEach((sub) => {
        ensureSpace(55)
        doc.moveDown(0.3)
        subHeading(sub.heading)
        if (sub.content && sub.content.trim()) {
          doc.font('Helvetica').fontSize(9.5).fillColor(TEXT)
            .text(sub.content, MARGIN + 8, doc.y, { width: CONTENT_W - 16, lineGap: 3 })
          doc.moveDown(0.3)
        }
      })
    }
  })

  // ==========================================
  // CHECKLISTS
  // ==========================================
  if (content.checklists.length > 0) {
    ensureSpace(90)
    sectionDivider()
    sectionHeading(label('checklists', lang), 14)

    content.checklists.forEach((checklist) => {
      ensureSpace(40)
      doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT)
        .text(checklist.title, MARGIN + 5, doc.y, { width: CONTENT_W - 10 })
      doc.moveDown(0.3)

      checklist.items.forEach((item) => {
        ensureSpace(20)
        const y = doc.y
        // Checkbox
        doc.rect(MARGIN + 8, y + 1, 8, 8).lineWidth(0.5).stroke('#999')
        doc.font('Helvetica').fontSize(9.5).fillColor(TEXT)
          .text(item, MARGIN + 22, y, { width: CONTENT_W - 30, lineGap: 2 })
        doc.moveDown(0.25)
      })

      doc.moveDown(0.5)
    })
  }

  // ==========================================
  // BEST PRACTICES
  // ==========================================
  if (content.bestPractices.length > 0) {
    ensureSpace(90)
    sectionDivider()
    sectionHeading(label('bestPractices', lang), 14)

    content.bestPractices.forEach((practice, idx) => {
      ensureSpace(25)
      const practiceY = doc.y
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT)
        .text(`${idx + 1}.`, MARGIN + 5, practiceY, { lineBreak: false })
      doc.font('Helvetica').fontSize(9.5).fillColor(TEXT)
        .text(practice, MARGIN + 23, practiceY, { width: CONTENT_W - 28, lineGap: 2 })
      doc.moveDown(0.25)
    })
  }

  // ==========================================
  // GLOSSARY
  // ==========================================
  const glossaryEntries = Object.entries(content.glossary)
  if (glossaryEntries.length > 0) {
    ensureSpace(90)
    sectionDivider()
    sectionHeading(label('glossary', lang), 14)

    for (const [term, definition] of glossaryEntries) {
      ensureSpace(25)
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(NAVY)
        .text(term, MARGIN + 8, doc.y, { continued: true })
      doc.font('Helvetica').fontSize(9.5).fillColor(TEXT_LIGHT)
        .text(` — ${definition}`, { width: CONTENT_W - 16, lineGap: 2 })
      doc.moveDown(0.2)
    }
  }

  // ==========================================
  // ADD FOOTERS TO ALL PAGES (buffered)
  // ==========================================
  const range = doc.bufferedPageRange()
  const totalPages = range.start + range.count

  // Block addPage during footer rendering — PDFKit tries to create new pages
  // when text y-position exceeds margin bottom, which inserts blank pages
  // between existing content pages when using switchToPage().
  const _origAddPage = doc.addPage
  doc.addPage = () => doc

  for (let i = range.start; i < totalPages; i++) {
    doc.switchToPage(i)

    if (i === 0) {
      // Cover page - just page number in light color
      doc.font('Helvetica').fontSize(7).fillColor('#555555')
        .text(`${label('page', lang)} 1 / ${totalPages}`, PAGE_W - MARGIN - 60, PAGE_H - 30, { width: 60, align: 'right', lineBreak: false })
    } else {
      // Content pages - full footer with line
      doc.save()
      doc.moveTo(MARGIN, FOOTER_Y).lineTo(PAGE_W - MARGIN, FOOTER_Y).lineWidth(0.5).stroke('#dddddd')

      doc.font('Helvetica').fontSize(7).fillColor('#999999')
        .text(guide.code, MARGIN, FOOTER_Y + 5, { lineBreak: false })

      doc.font('Helvetica').fontSize(7).fillColor('#999999')
        .text(label('footer', lang), 0, FOOTER_Y + 5, { width: PAGE_W, align: 'center', lineBreak: false })

      doc.font('Helvetica').fontSize(7).fillColor('#999999')
        .text(`${label('page', lang)} ${i + 1} / ${totalPages}`, PAGE_W - MARGIN - 60, FOOTER_Y + 5, { width: 60, align: 'right', lineBreak: false })

      // Gold accent line under footer
      doc.moveTo(MARGIN, FOOTER_Y + 16).lineTo(MARGIN + 30, FOOTER_Y + 16).lineWidth(1).stroke(GOLD_LIGHT)
      doc.restore()
    }
  }

  // Restore addPage before finalizing
  doc.addPage = _origAddPage

  doc.end()
  return promise
}
