import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { GUIDES } from '@/lib/data/resource-guides'
import { generateTrainingPdf } from '@/lib/pdf/training-pdf-generator'
import type { GuideContent } from '@/types'

const categoryLabels: Record<string, Record<string, string>> = {
  food_safety: { en: 'Food Safety', es: 'Seguridad Alimentaria', nl: 'Voedselveiligheid', de: 'Lebensmittelsicherheit' },
  occupational_health: { en: 'Occupational Health', es: 'Salud Laboral', nl: 'Arbeidsgezondheid', de: 'Arbeitsschutz' },
  labor_regulations: { en: 'Labor Regulations', es: 'Regulaciones Laborales', nl: 'Arbeidsregels', de: 'Arbeitsrecht' },
  role_specific: { en: 'Role Specific', es: 'Especifico del Rol', nl: 'Rolspecifiek', de: 'Rollenspezifisch' },
  required_docs: { en: 'Documentation', es: 'Documentacion', nl: 'Documentatie', de: 'Dokumentation' },
  environmental: { en: 'Environmental', es: 'Medioambiental', nl: 'Milieu', de: 'Umwelt' },
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

  // Try loading deep content from guide JSON files
  let content: GuideContent
  try {
    const guideModule = await import(`@/i18n/messages/${lang}/guides/${guideCode}.json`)
    content = guideModule.default || guideModule
  } catch {
    // Fallback to resources.json summary content
    try {
      const messages = await import(`@/i18n/messages/${lang}/resources.json`)
      const data = messages.default || messages
      const guideKeyPrefix = guide.titleKey.replace('.title', '')

      function getNestedValue(obj: Record<string, unknown>, path: string): string {
        const parts = path.split('.')
        let current: unknown = obj
        for (const part of parts) {
          if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
            current = (current as Record<string, unknown>)[part]
          } else {
            return path
          }
        }
        return typeof current === 'string' ? current : Array.isArray(current) ? (current as string[]).join(', ') : path
      }

      function getNestedArray(obj: Record<string, unknown>, path: string): string[] {
        const parts = path.split('.')
        let current: unknown = obj
        for (const part of parts) {
          if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
            current = (current as Record<string, unknown>)[part]
          } else {
            return []
          }
        }
        return Array.isArray(current) ? current as string[] : []
      }

      content = {
        title: getNestedValue(data, guide.titleKey),
        legalBasis: getNestedValue(data, guide.legalBasisKey),
        summary: getNestedValue(data, `${guideKeyPrefix}.summary`),
        keyPoints: getNestedArray(data, `${guideKeyPrefix}.keyPoints`),
        sections: [],
        checklists: [],
        bestPractices: [],
        glossary: {},
      }
    } catch {
      return NextResponse.json({ error: `Language '${lang}' not supported` }, { status: 400 })
    }
  }

  // Record download
  const supabase = await createClient()
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', authResult.data.user.id)
    .single()

  if (employee) {
    await supabase.from('training_records').insert({
      employee_id: employee.id,
      guide_code: guideCode,
      action: 'downloaded',
      language: lang,
    })
  }

  const catLabel = categoryLabels[guide.category]?.[lang] || guide.category

  const pdfBuffer = await generateTrainingPdf({
    guide,
    content,
    lang,
    categoryLabel: catLabel,
  })

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${guideCode}-${lang}.pdf"`,
    },
  })
}
