/**
 * Cocktail Recipe PDF Generator
 * Generates A4 portrait recipe cards with branding, ingredients, steps, and flavor profiles.
 * Pattern: coupon-pdf-generator.ts
 */

import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

// A4 Portrait dimensions (points)
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 50
const CONTENT_W = PAGE_W - MARGIN * 2

const BRAND = {
  primary: '#722F37',  // burgundy/wine
  secondary: '#c9a84c', // gold
  text: '#1a1a2e',
  muted: '#6b7280',
  bg: '#fafaf8',
}

interface RecipeIngredient {
  name: string
  quantity: number
  unit: string
  cost_per_unit?: number
  is_garnish?: boolean
  is_optional?: boolean
}

interface RecipeStep {
  step_number: number
  instruction_en: string
  duration_seconds?: number
  tip?: string
}

interface RecipeData {
  name: string
  description?: string
  glass_type?: string
  preparation_method?: string
  difficulty_level?: string
  base_spirit?: string
  garnish?: string
  flavor_profiles?: string[]
  is_signature?: boolean
  price?: number
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  showCosts?: boolean
}

export async function generateRecipePdf(recipe: RecipeData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
  })

  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  const promise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  // Load logo if available
  let logoPath: string | null = null
  const possibleLogo = path.join(process.cwd(), 'public', 'logo.png')
  if (fs.existsSync(possibleLogo)) {
    logoPath = possibleLogo
  }

  // ═══════════════ HEADER ═══════════════
  doc.rect(0, 0, PAGE_W, 100).fill(BRAND.primary)

  if (logoPath) {
    doc.image(logoPath, MARGIN, 20, { width: 60 })
  }

  doc.font('Helvetica-Bold')
    .fontSize(28)
    .fillColor('#ffffff')
    .text('COCKTAIL RECIPE', logoPath ? MARGIN + 70 : MARGIN, 25, { characterSpacing: 3 })

  doc.font('Helvetica')
    .fontSize(11)
    .fillColor(BRAND.secondary)
    .text('GrandCafe Cheers — El Arenal, Mallorca', logoPath ? MARGIN + 70 : MARGIN, 60)

  // ═══════════════ TITLE ═══════════════
  let y = 120

  doc.font('Helvetica-Bold')
    .fontSize(24)
    .fillColor(BRAND.text)
    .text(recipe.name, MARGIN, y)
  y += 35

  if (recipe.is_signature) {
    doc.font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#ffffff')
    const badgeW = 70
    doc.roundedRect(MARGIN, y - 5, badgeW, 18, 3).fill(BRAND.primary)
    doc.fillColor('#ffffff').text('SIGNATURE', MARGIN + 8, y - 1)
    y += 20
  }

  if (recipe.description) {
    doc.font('Helvetica')
      .fontSize(11)
      .fillColor(BRAND.muted)
      .text(recipe.description, MARGIN, y, { width: CONTENT_W })
    y += doc.heightOfString(recipe.description, { width: CONTENT_W }) + 10
  }

  // ═══════════════ METADATA ═══════════════
  y += 5
  const metaItems: string[] = []
  if (recipe.base_spirit) metaItems.push(`Spirit: ${recipe.base_spirit}`)
  if (recipe.glass_type) metaItems.push(`Glass: ${recipe.glass_type}`)
  if (recipe.preparation_method) metaItems.push(`Method: ${recipe.preparation_method}`)
  if (recipe.difficulty_level) metaItems.push(`Difficulty: ${recipe.difficulty_level}`)
  if (recipe.garnish) metaItems.push(`Garnish: ${recipe.garnish}`)

  if (metaItems.length > 0) {
    doc.font('Helvetica').fontSize(10).fillColor(BRAND.text)
    const metaText = metaItems.join('  |  ')
    doc.text(metaText, MARGIN, y, { width: CONTENT_W })
    y += 20
  }

  if (recipe.flavor_profiles && recipe.flavor_profiles.length > 0) {
    doc.font('Helvetica').fontSize(9).fillColor(BRAND.muted)
    doc.text(`Flavors: ${recipe.flavor_profiles.join(', ')}`, MARGIN, y)
    y += 15
  }

  // Divider
  y += 5
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).lineWidth(0.5).strokeColor(BRAND.secondary).stroke()
  y += 15

  // ═══════════════ INGREDIENTS ═══════════════
  doc.font('Helvetica-Bold').fontSize(14).fillColor(BRAND.primary)
    .text('INGREDIENTS', MARGIN, y, { characterSpacing: 2 })
  y += 25

  let totalCost = 0

  for (const ing of recipe.ingredients) {
    const label = `${ing.quantity} ${ing.unit}`
    const tags: string[] = []
    if (ing.is_garnish) tags.push('garnish')
    if (ing.is_optional) tags.push('optional')
    const suffix = tags.length > 0 ? ` (${tags.join(', ')})` : ''

    doc.font('Helvetica').fontSize(10).fillColor(BRAND.text)
    doc.text(`${label}`, MARGIN, y, { continued: true, width: 80 })
    doc.font('Helvetica-Bold').text(`  ${ing.name}${suffix}`, { continued: false })

    if (recipe.showCosts && ing.cost_per_unit) {
      const subtotal = ing.quantity * ing.cost_per_unit
      totalCost += subtotal
      doc.font('Helvetica').fontSize(9).fillColor(BRAND.muted)
        .text(`€${subtotal.toFixed(2)}`, PAGE_W - MARGIN - 60, y, { width: 60, align: 'right' })
    }

    y += 18

    if (y > PAGE_H - 100) {
      doc.addPage()
      y = MARGIN
    }
  }

  if (recipe.showCosts && totalCost > 0) {
    y += 5
    doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).lineWidth(0.3).strokeColor(BRAND.muted).stroke()
    y += 8
    doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND.text)
      .text(`Total Cost: €${totalCost.toFixed(2)}`, MARGIN, y)
    if (recipe.price) {
      const margin = ((recipe.price - totalCost) / recipe.price) * 100
      doc.text(`Selling Price: €${recipe.price.toFixed(2)}  |  Margin: ${margin.toFixed(1)}%`, MARGIN, y + 15)
    }
    y += 35
  }

  // Divider
  y += 10
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).lineWidth(0.5).strokeColor(BRAND.secondary).stroke()
  y += 15

  // ═══════════════ STEPS ═══════════════
  doc.font('Helvetica-Bold').fontSize(14).fillColor(BRAND.primary)
    .text('PREPARATION', MARGIN, y, { characterSpacing: 2 })
  y += 25

  for (const step of recipe.steps) {
    if (y > PAGE_H - 80) {
      doc.addPage()
      y = MARGIN
    }

    // Step number circle
    doc.circle(MARGIN + 10, y + 6, 10).fill(BRAND.primary)
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
      .text(String(step.step_number), MARGIN + 4, y + 1, { width: 12, align: 'center' })

    // Instruction
    doc.font('Helvetica').fontSize(10).fillColor(BRAND.text)
      .text(step.instruction_en, MARGIN + 28, y, { width: CONTENT_W - 28 })
    const instrHeight = doc.heightOfString(step.instruction_en, { width: CONTENT_W - 28 })
    y += Math.max(instrHeight, 14) + 3

    if (step.duration_seconds) {
      doc.font('Helvetica').fontSize(8).fillColor(BRAND.muted)
        .text(`~${step.duration_seconds}s`, MARGIN + 28, y)
      y += 12
    }

    if (step.tip) {
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(BRAND.secondary)
        .text(`Tip: ${step.tip}`, MARGIN + 28, y, { width: CONTENT_W - 28 })
      y += doc.heightOfString(`Tip: ${step.tip}`, { width: CONTENT_W - 28 }) + 5
    }

    y += 8
  }

  // ═══════════════ FOOTER ═══════════════
  const footerY = PAGE_H - 40
  doc.moveTo(MARGIN, footerY - 10).lineTo(PAGE_W - MARGIN, footerY - 10)
    .lineWidth(0.5).strokeColor(BRAND.secondary).stroke()

  doc.font('Helvetica').fontSize(8).fillColor(BRAND.muted)
    .text('GrandCafe Cheers — Carrer de la Platja de Palma, El Arenal, Mallorca', MARGIN, footerY, {
      width: CONTENT_W,
      align: 'center',
    })

  if (recipe.price) {
    doc.font('Helvetica-Bold').fontSize(16).fillColor(BRAND.primary)
      .text(`€${recipe.price.toFixed(2)}`, PAGE_W - MARGIN - 80, footerY - 25, {
        width: 80,
        align: 'right',
      })
  }

  doc.end()
  return promise
}
