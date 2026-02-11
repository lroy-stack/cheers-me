/**
 * Document Generator Sub-Agent
 * Generates PDFs/HTML with GrandCafe Cheers branding.
 * Types: menu_card, financial_report, employee_schedule, invoice, compliance, marketing
 */

import { anthropic, Anthropic } from '../claude'
import type { SubAgentResult, ProgressCallback } from './types'

const SYSTEM_PROMPT = `You are a document generation specialist for GrandCafe Cheers, a beachfront restaurant in El Arenal, Mallorca.

Your task is to generate professional documents with the restaurant's branding:
- Brand: GrandCafe Cheers
- Address: Carrer de Cartago 22, El Arenal (Platja de Palma), Mallorca 07600
- Colors: Primary #2563eb, Accent #f97316
- Style: Professional yet warm, Mediterranean feel

Output documents as well-formatted HTML that can be converted to PDF.
Include proper CSS for print layout (A4 paper size).
Use tables for data, proper headers, and the brand name prominently.

Always respond with a complete HTML document wrapped in an artifact block:
\`\`\`artifact:html
<html>...</html>
\`\`\`

Document types you handle:
- menu_card: Restaurant menu with categories, prices, allergens
- financial_report: P&L, revenue breakdown, cost analysis
- employee_schedule: Weekly/monthly shift schedule table
- invoice: Customer or supplier invoice
- compliance: Spanish labor law compliance documents
- marketing: Marketing materials, event flyers`

export async function executeDocumentGenerator(
  params: Record<string, unknown>,
  progress: ProgressCallback
): Promise<SubAgentResult> {
  const startTime = Date.now()

  const docType = (params.document_type || params.type || 'general') as string
  const context = (params.context || params.data || '') as string
  const title = (params.title || `${docType} Document`) as string

  progress(`Generating ${docType}...`)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a ${docType} document with title "${title}".
${context ? `\nData/Context:\n${context}` : ''}
\nOutput as a complete, print-ready HTML document.`,
        },
      ],
    })

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    )
    const content = textBlocks.map(b => b.text).join('\n')

    progress('Document ready')

    return {
      success: true,
      content,
      artifacts: [{
        id: crypto.randomUUID(),
        type: 'html',
        title,
        content: extractHTMLFromArtifact(content),
      }],
      tokenUsage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Document generation failed',
      durationMs: Date.now() - startTime,
    }
  }
}

function extractHTMLFromArtifact(content: string): string {
  const match = content.match(/```artifact:html\r?\n([\s\S]*?)```/)
  if (match) return match[1].trim()

  // Try to find raw HTML
  const htmlMatch = content.match(/<html[\s\S]*<\/html>/i)
  if (htmlMatch) return htmlMatch[0]

  return content
}
