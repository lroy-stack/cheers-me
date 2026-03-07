import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ALLERGEN_LIST, type AllergenType } from '@/lib/constants/allergens'

export const dynamic = 'force-dynamic'

/**
 * GET /api/menu/allergens/export-pdf
 * Export allergen matrix as an HTML page suitable for print/PDF
 * Returns an HTML document that browsers can print as PDF
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const langParam = searchParams.get('lang') || searchParams.get('language') || 'en'
    const lang = (['en', 'nl', 'es', 'de'].includes(langParam) ? langParam : 'en') as 'en' | 'nl' | 'es' | 'de'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all menu items with allergens
    const { data: items, error } = await supabase
      .from('v_menu_items_with_allergens')
      .select('*')
      .eq('available', true)
      .order('category_name_en, sort_order')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 })
    }

    const menuItems = items || []

    // Build allergen matrix HTML
    const allergenCols = ALLERGEN_LIST

    const labelMap: Record<string, Record<string, string>> = {
      en: { title: 'Allergen Information', restaurant: 'GrandCafe Cheers Mallorca', compliance: 'EU Regulation 1169/2011', dish: 'Dish', date: 'Date' },
      nl: { title: 'Allergeneninformatie', restaurant: 'GrandCafe Cheers Mallorca', compliance: 'EU-verordening 1169/2011', dish: 'Gerecht', date: 'Datum' },
      es: { title: 'Información de Alérgenos', restaurant: 'GrandCafe Cheers Mallorca', compliance: 'Reglamento UE 1169/2011', dish: 'Plato', date: 'Fecha' },
      de: { title: 'Allergeninformation', restaurant: 'GrandCafe Cheers Mallorca', compliance: 'EU-Verordnung 1169/2011', dish: 'Gericht', date: 'Datum' },
    }
    const labels = labelMap[lang]

    const headerCells = allergenCols
      .map((a) => `<th class="allergen-header"><span class="rotate">${a[`name_${lang}`]}</span></th>`)
      .join('')

    const itemRows = menuItems
      .map((item) => {
        const name = item[`name_${lang}`] || item.name_en
        const allergens = (item.allergens || []) as AllergenType[]
        const cells = allergenCols
          .map((a) => `<td class="allergen-cell">${allergens.includes(a.id) ? '●' : ''}</td>`)
          .join('')
        return `<tr><td class="item-name">${name}</td>${cells}</tr>`
      })
      .join('')

    const timestamp = new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : lang === 'nl' ? 'nl-NL' : lang === 'es' ? 'es-ES' : 'en-GB')

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${labels.title} — ${labels.restaurant}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10px; margin: 10mm; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 10px; margin-bottom: 12px; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    th, td { border: 1px solid #ccc; padding: 2px 3px; text-align: center; vertical-align: middle; }
    .item-name { text-align: left; width: 160px; word-break: break-word; }
    .allergen-header { width: 28px; padding: 2px; vertical-align: bottom; height: 70px; }
    .rotate { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 9px; display: block; white-space: nowrap; }
    .allergen-cell { font-size: 12px; }
    tr:nth-child(even) { background: #f9f9f9; }
    @media print { body { margin: 5mm; } }
  </style>
</head>
<body>
  <h1>${labels.title}</h1>
  <p class="subtitle">${labels.restaurant} — ${labels.compliance} — ${labels.date}: ${timestamp}</p>
  <table>
    <thead>
      <tr>
        <th class="item-name">${labels.dish}</th>
        ${headerCells}
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="${allergenCols.length + 1}">No items</td></tr>'}
    </tbody>
  </table>
</body>
</html>`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Allergen-Export': 'matrix',
      },
    })
  } catch (error) {
    console.error('Error generating allergen PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
