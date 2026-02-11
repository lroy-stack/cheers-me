import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { CompanyFiscalData } from '@/types/expenses'

/**
 * GET /api/finance/tax-form/modelo111
 * Serve pre-filled Modelo 111 HTML form
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

  try {
    // Read HTML template
    const templatePath = join(process.cwd(), 'src/lib/tax-forms/modelo_111_irpf.html')
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

    // Fetch employees with IRPF retention
    const { data: employees } = await supabase
      .from('employees')
      .select('gross_salary, irpf_retention')
      .gt('irpf_retention', 0)
      .gt('gross_salary', 0)

    const MONTHS_IN_QUARTER = 3
    const employeeCount = (employees || []).length
    const totalGross = (employees || []).reduce(
      (sum, emp) => sum + (emp.gross_salary || 0) * MONTHS_IN_QUARTER, 0
    )
    const totalIrpf = (employees || []).reduce(
      (sum, emp) => sum + (emp.gross_salary || 0) * ((emp.irpf_retention || 0) / 100) * MONTHS_IN_QUARTER, 0
    )

    const periodMap: Record<number, string> = { 1: '1T', 2: '2T', 3: '3T', 4: '4T' }

    // Inject data into HTML via script at end of body
    const injectionScript = `
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Set identification fields
    var nifEl = document.getElementById('nif');
    if (nifEl) nifEl.value = ${JSON.stringify(fiscalData.cif)};
    var nombreEl = document.getElementById('nombre');
    if (nombreEl) nombreEl.value = ${JSON.stringify(fiscalData.razon_social)};

    // Set period and year
    var ejercicioEl = document.getElementById('ejercicio');
    if (ejercicioEl) ejercicioEl.value = '${year}';
    var periodoEl = document.getElementById('periodo');
    if (periodoEl) periodoEl.value = '${periodMap[quarter]}';

    // Set Section I: Rendimientos del trabajo
    var campo01El = document.getElementById('campo_01');
    if (campo01El) { campo01El.value = '${employeeCount}'; campo01El.dispatchEvent(new Event('input')); }
    var campo02El = document.getElementById('campo_02');
    if (campo02El) { campo02El.value = '${totalGross.toFixed(2)}'; campo02El.dispatchEvent(new Event('input')); }
    var campo03El = document.getElementById('campo_03');
    if (campo03El) { campo03El.value = '${totalIrpf.toFixed(2)}'; campo03El.dispatchEvent(new Event('input')); }

    // Trigger calculations
    if (typeof calcularCasilla28 === 'function') calcularCasilla28();
    if (typeof calcularCasilla30 === 'function') calcularCasilla30();
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
    console.error('Modelo 111 form generation error:', message)
    return NextResponse.json(
      { error: 'Failed to generate Modelo 111 form', details: message },
      { status: 500 }
    )
  }
}
