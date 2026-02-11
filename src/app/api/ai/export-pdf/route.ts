import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/ai/export-pdf
 * Receives HTML content and returns a simple HTML-to-print response.
 * Uses the browser's print-to-PDF workflow (window.print()).
 * For server-side PDF generation, PDFKit could be added later.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { html?: string; title?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { html, title = 'GrandCafe Cheers Document' } = body
  if (!html) {
    return NextResponse.json({ error: 'html field is required' }, { status: 400 })
  }

  // Return a print-ready HTML page that auto-triggers print dialog
  const printPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    @media print {
      body { margin: 0; }
      @page { margin: 1cm; }
    }
    body { font-family: 'Inter', system-ui, sans-serif; }
  </style>
</head>
<body>
  ${html}
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`

  return new Response(printPage, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${encodeURIComponent(title)}.html"`,
    },
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
