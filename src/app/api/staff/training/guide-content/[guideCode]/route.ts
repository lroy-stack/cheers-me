import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { GUIDES } from '@/lib/data/resource-guides'

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

  // Validate guide exists
  const guide = GUIDES.find((g) => g.code === guideCode)
  if (!guide) {
    return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
  }

  // Normalize guide code for file lookup (G-FS-001 → G-FS-001)
  const fileName = guideCode

  try {
    const content = await import(`@/i18n/messages/${lang}/guides/${fileName}.json`)
    return NextResponse.json(content.default || content)
  } catch {
    // Guide content file not yet generated — return minimal fallback
    try {
      const messages = await import(`@/i18n/messages/${lang}/resources.json`)
      const guideKeyPrefix = guide.titleKey.replace('.title', '')
      const data = messages.default || messages

      // Navigate to the guide data
      const parts = guideKeyPrefix.split('.')
      let guideData: Record<string, unknown> = data
      for (const part of parts) {
        guideData = (guideData?.[part] as Record<string, unknown>) || {}
      }

      return NextResponse.json({
        title: (guideData.title as string) || guideCode,
        legalBasis: (guideData.legalBasis as string) || '',
        summary: (guideData.summary as string) || '',
        keyPoints: (guideData.keyPoints as string[]) || [],
        sections: [],
        checklists: [],
        bestPractices: [],
        glossary: {},
      })
    } catch {
      return NextResponse.json({ error: 'Content not available' }, { status: 404 })
    }
  }
}
