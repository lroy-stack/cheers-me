import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ALLERGENS, type AllergenType } from '@/lib/constants/allergens'

export const dynamic = 'force-dynamic'

/**
 * GET /api/menu/allergens/export
 * Export allergen information in CSV or JSON format
 * Query params:
 *   - format: 'csv' | 'json' (default: 'json')
 *   - language: 'en' | 'nl' | 'es' (default: 'en')
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const language = (searchParams.get('language') || 'en') as 'en' | 'nl' | 'es'

    const supabase = await createClient()

    // Get user role
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
      console.error('Error fetching menu items:', error)
      return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 })
    }

    // Transform data
    const exportData = (items || []).map((item) => {
      const allergenNames = (item.allergens || [])
        .map((allergenId: AllergenType) => {
          const allergen = ALLERGENS[allergenId]
          return allergen ? allergen[`name_${language}`] : allergenId
        })
        .join(', ')

      return {
        category: item[`category_name_${language}`] || item.category_name_en,
        name: item[`name_${language}`] || item.name_en,
        description: item[`description_${language}`] || item.description_en || '',
        price: item.price,
        allergens: allergenNames || 'None',
        allergen_count: (item.allergens || []).length,
      }
    })

    // Export as CSV
    if (format === 'csv') {
      const headers = ['Category', 'Item Name', 'Description', 'Price (€)', 'Allergens', 'Allergen Count']
      const csvRows = [
        headers.join(','),
        ...exportData.map((item) =>
          [
            `"${item.category}"`,
            `"${item.name}"`,
            `"${item.description.replace(/"/g, '""')}"`,
            item.price.toFixed(2),
            `"${item.allergens}"`,
            item.allergen_count,
          ].join(',')
        ),
      ]

      const csv = csvRows.join('\n')
      const timestamp = new Date().toISOString().split('T')[0]

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="allergen-information-${timestamp}.csv"`,
        },
      })
    }

    // Export as JSON (default)
    return NextResponse.json(
      {
        export_date: new Date().toISOString(),
        language,
        restaurant: 'GrandCafe Cheers Mallorca',
        compliance: 'EU Regulation 1169/2011',
        total_items: exportData.length,
        items: exportData,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error exporting allergen data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
