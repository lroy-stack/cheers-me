import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { getQuarterDateRange } from '@/lib/utils/spanish-tax'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { CompanyFiscalData } from '@/types/expenses'

/**
 * GET /api/finance/tax-form/modelo303
 * Serve pre-filled Modelo 303 HTML form
 * Query params: year (number), quarter (1-4)
 * Accessible by: admin, manager, owner
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
  const quarter = parseInt(searchParams.get('quarter') || '1', 10)

  if (quarter < 1 || quarter > 4) {
    return NextResponse.json(
      { error: 'Quarter must be between 1 and 4' },
      { status: 400 }
    )
  }

  const { start, end } = getQuarterDateRange(year, quarter)

  try {
    // Read HTML template
    const templatePath = join(process.cwd(), 'src/lib/tax-forms/modelo_303_iva.html')
    let html = readFileSync(templatePath, 'utf-8')

    // Fetch company fiscal data
    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('value')
      .eq('key', 'company_fiscal')
      .single()

    const fiscalData: CompanyFiscalData = settings?.value || {
      razon_social: 'GrandCafe Cheers S.L.',
      cif: 'B12345678',
      direccion: 'Carrer de Cartago 22, El Arenal',
      codigo_postal: '07600',
      ciudad: 'Mallorca',
      provincia: 'Illes Balears',
      pais: 'Spain',
      telefono: '',
      email: '',
    }

    // Fetch IVA Repercutido (sales)
    const { data: salesIVA } = await supabase
      .from('sales_iva_breakdown')
      .select('iva_rate, base_imponible, iva_amount')
      .gte('date', start)
      .lte('date', end)

    // Fetch IVA Soportado (deductible expenses)
    const { data: expenses } = await supabase
      .from('overhead_expenses')
      .select('iva_amount')
      .eq('is_deductible', true)
      .gte('date', start)
      .lte('date', end)

    // Calculate bases by rate
    const byRate = (salesIVA || []).reduce(
      (acc, row) => {
        const rate = row.iva_rate || 0
        const key = String(rate)
        if (!acc[key]) acc[key] = { base: 0 }
        acc[key].base += row.base_imponible || 0
        return acc
      },
      {} as Record<string, { base: number }>
    )

    const c01 = (byRate['4']?.base || 0).toFixed(2)
    const c04 = (byRate['10']?.base || 0).toFixed(2)
    const c07 = (byRate['21']?.base || 0).toFixed(2)
    const c29 = ((expenses || []).reduce((sum, row) => sum + (row.iva_amount || 0), 0)).toFixed(2)

    const periodMap: Record<number, string> = { 1: '1T', 2: '2T', 3: '3T', 4: '4T' }

    // Inject data into HTML via script at end of body
    const injectionScript = `
<script>
  // Pre-fill form fields from platform data
  document.addEventListener('DOMContentLoaded', function() {
    // Set identification fields
    var nifEl = document.getElementById('nif');
    if (nifEl) nifEl.value = ${JSON.stringify(fiscalData.cif)};
    var apellidosEl = document.getElementById('apellidos');
    if (apellidosEl) apellidosEl.value = ${JSON.stringify(fiscalData.razon_social)};

    // Set period selects
    var ejercicioEl = document.getElementById('ejercicio');
    if (ejercicioEl) ejercicioEl.value = '${year}';
    var periodoEl = document.getElementById('periodo');
    if (periodoEl) periodoEl.value = '${periodMap[quarter]}';

    // Set IVA bases (the JS in the form auto-calculates quotas)
    var c01El = document.getElementById('c01');
    if (c01El) { c01El.value = '${c01}'; c01El.dispatchEvent(new Event('input')); }
    var c04El = document.getElementById('c04');
    if (c04El) { c04El.value = '${c04}'; c04El.dispatchEvent(new Event('input')); }
    var c07El = document.getElementById('c07');
    if (c07El) { c07El.value = '${c07}'; c07El.dispatchEvent(new Event('input')); }

    // Set deductible IVA
    var c29El = document.getElementById('c29');
    if (c29El) { c29El.value = '${c29}'; c29El.dispatchEvent(new Event('input')); }

    // Trigger calculations
    if (typeof realizarCalculos === 'function') {
      realizarCalculos();
    }
  });
</script>`

    // Insert before closing </body>
    html = html.replace('</body>', injectionScript + '\n</body>')

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Modelo 303 form generation error:', message)
    return NextResponse.json(
      { error: 'Failed to generate Modelo 303 form', details: message },
      { status: 500 }
    )
  }
}
