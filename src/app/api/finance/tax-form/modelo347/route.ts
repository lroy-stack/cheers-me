import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { MODELO_347_THRESHOLD } from '@/lib/utils/spanish-tax'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { CompanyFiscalData } from '@/types/expenses'

/**
 * GET /api/finance/tax-form/modelo347
 * Serve pre-filled Modelo 347 HTML form
 * Query params: year (number)
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

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  try {
    // Read HTML template
    const templatePath = join(process.cwd(), 'src/lib/tax-forms/modelo_347_operaciones.html')
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

    // Fetch overhead expenses grouped by supplier for the year, including quarterly breakdown
    const { data: expenses } = await supabase
      .from('overhead_expenses')
      .select('supplier_nif, vendor, amount, date')
      .gte('date', startDate)
      .lte('date', endDate)
      .not('supplier_nif', 'is', null)

    // Group by supplier and calculate quarterly amounts
    const supplierData = (expenses || []).reduce(
      (acc, expense) => {
        const nif = expense.supplier_nif
        if (!nif) return acc

        if (!acc[nif]) {
          acc[nif] = {
            nif,
            name: expense.vendor || 'Unknown',
            total: 0,
            q1: 0, q2: 0, q3: 0, q4: 0,
          }
        }

        const month = new Date(expense.date).getMonth()
        const amount = expense.amount || 0
        acc[nif].total += amount

        if (month < 3) acc[nif].q1 += amount
        else if (month < 6) acc[nif].q2 += amount
        else if (month < 9) acc[nif].q3 += amount
        else acc[nif].q4 += amount

        return acc
      },
      {} as Record<string, { nif: string; name: string; total: number; q1: number; q2: number; q3: number; q4: number }>
    )

    // Filter suppliers above threshold
    const suppliers = Object.values(supplierData)
      .filter(s => s.total > MODELO_347_THRESHOLD)
      .sort((a, b) => b.total - a.total)

    // Build injection script that calls addDeclarado() for each supplier
    const supplierInjections = suppliers.map((s, idx) => `
      // Supplier ${idx + 1}: ${s.name}
      if (typeof addDeclarado === 'function') {
        addDeclarado();
        var rows = document.querySelectorAll('.declarado-row');
        var lastRow = rows[rows.length - 1];
        if (lastRow) {
          var nifInput = lastRow.querySelector('input[name*="nif"]');
          if (nifInput) nifInput.value = ${JSON.stringify(s.nif)};
          var nombreInput = lastRow.querySelector('input[name*="nombre"], input[name*="razon"]');
          if (nombreInput) nombreInput.value = ${JSON.stringify(s.name)};
          var claveInput = lastRow.querySelector('select[name*="clave"]');
          if (claveInput) claveInput.value = 'A';
          var q1Input = lastRow.querySelector('input[name*="1t"], input[name*="q1"]');
          if (q1Input) q1Input.value = '${s.q1.toFixed(2)}';
          var q2Input = lastRow.querySelector('input[name*="2t"], input[name*="q2"]');
          if (q2Input) q2Input.value = '${s.q2.toFixed(2)}';
          var q3Input = lastRow.querySelector('input[name*="3t"], input[name*="q3"]');
          if (q3Input) q3Input.value = '${s.q3.toFixed(2)}';
          var q4Input = lastRow.querySelector('input[name*="4t"], input[name*="q4"]');
          if (q4Input) q4Input.value = '${s.q4.toFixed(2)}';
          var totalInput = lastRow.querySelector('input[name*="total"], input[name*="importe_anual"]');
          if (totalInput) totalInput.value = '${s.total.toFixed(2)}';
        }
      }
    `).join('\n')

    const injectionScript = `
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Set declarant identification
    var nifEl = document.getElementById('nif_declarante');
    if (nifEl) nifEl.value = ${JSON.stringify(fiscalData.cif)};
    var razonEl = document.getElementById('razon_social');
    if (razonEl) razonEl.value = ${JSON.stringify(fiscalData.razon_social)};
    var telEl = document.getElementById('telefono');
    if (telEl) telEl.value = ${JSON.stringify(fiscalData.telefono || '')};

    // Set ejercicio
    var ejercicioEl = document.getElementById('ejercicio');
    if (ejercicioEl) {
      if (ejercicioEl.tagName === 'SELECT') {
        ejercicioEl.value = '${year}';
      } else {
        ejercicioEl.value = '${year}';
      }
    }

    // Add each supplier above threshold
    ${supplierInjections}

    // Update summary totals
    if (typeof updateSummary === 'function') {
      updateSummary();
    }
  });
</script>`

    html = html.replace('</body>', injectionScript + '\n</body>')

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Modelo 347 form generation error:', message)
    return NextResponse.json(
      { error: 'Failed to generate Modelo 347 form', details: message },
      { status: 500 }
    )
  }
}
