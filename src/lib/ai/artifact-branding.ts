/**
 * Artifact Branding
 * Wraps HTML artifacts with GrandCafe Cheers branding (logo, colors, fonts, footer).
 */

export type BrandedDocType = 'menu' | 'report' | 'schedule' | 'invoice' | 'post' | 'general'

const BRAND = {
  name: 'GrandCafe Cheers',
  address: 'Carrer de Cartago 22, El Arenal (Platja de Palma), Mallorca 07600',
  phone: '+34 871 234 567',
  email: 'info@grandcafecheers.com',
  web: 'grandcafecheers.com',
  logo: '/icons/logoheader.png',
  colors: {
    primary: 'oklch(0.3800 0.1523 18.6219)',
    accent: 'oklch(0.4490 0.1606 17.6053)',
    background: '#faf9f7',
    text: '#1a1a1a',
    muted: '#6b7280',
    border: '#e5e7eb',
  },
  fonts: {
    sans: "'Inter', system-ui, sans-serif",
    serif: "'Lora', Georgia, serif",
  },
} as const

const BRAND_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: ${BRAND.fonts.sans};
    color: ${BRAND.colors.text};
    background: ${BRAND.colors.background};
    line-height: 1.6;
    padding: 0;
  }
  .brand-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px 32px;
    border-bottom: 2px solid ${BRAND.colors.primary};
    background: white;
  }
  .brand-header img {
    height: 48px;
    width: auto;
  }
  .brand-header h1 {
    font-family: ${BRAND.fonts.serif};
    font-size: 20px;
    font-weight: 700;
    color: ${BRAND.colors.primary};
  }
  .brand-header .subtitle {
    font-size: 12px;
    color: ${BRAND.colors.muted};
  }
  .brand-content {
    padding: 32px;
  }
  .brand-footer {
    padding: 16px 32px;
    border-top: 1px solid ${BRAND.colors.border};
    font-size: 11px;
    color: ${BRAND.colors.muted};
    text-align: center;
    background: white;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
  }
  th, td {
    padding: 8px 12px;
    border: 1px solid ${BRAND.colors.border};
    text-align: left;
    font-size: 13px;
  }
  th {
    background: ${BRAND.colors.primary};
    color: white;
    font-weight: 600;
  }
  tr:nth-child(even) { background: #f9fafb; }
  h2 { font-family: ${BRAND.fonts.serif}; font-size: 18px; margin: 24px 0 12px; color: ${BRAND.colors.primary}; }
  h3 { font-size: 15px; margin: 16px 0 8px; }
  p { margin: 8px 0; font-size: 14px; }
  @media print {
    body { padding: 0; }
    .brand-header, .brand-footer { page-break-inside: avoid; }
  }
`

const DOC_TYPE_SUBTITLES: Record<BrandedDocType, string> = {
  menu: 'Menu Card',
  report: 'Financial Report',
  schedule: 'Staff Schedule',
  invoice: 'Invoice',
  post: 'Marketing Material',
  general: 'Document',
}

export function wrapWithBranding(content: string, type: BrandedDocType = 'general'): string {
  const subtitle = DOC_TYPE_SUBTITLES[type]
  const now = new Date().toLocaleDateString('en-GB', { timeZone: 'Europe/Madrid' })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${BRAND.name} — ${subtitle}</title>
  <style>${BRAND_CSS}</style>
</head>
<body>
  <div class="brand-header">
    <img src="${BRAND.logo}" alt="${BRAND.name}" />
    <div>
      <h1>${BRAND.name}</h1>
      <div class="subtitle">${subtitle} — ${now}</div>
    </div>
  </div>
  <div class="brand-content">
    ${content}
  </div>
  <div class="brand-footer">
    ${BRAND.name} · ${BRAND.address} · ${BRAND.phone} · ${BRAND.web}
  </div>
</body>
</html>`
}

export function getIframeSrcDoc(content: string): string {
  // Ensure HTML has charset + viewport meta and safe defaults
  if (content.includes('<html') || content.includes('<!DOCTYPE')) {
    // Already a full document — inject meta if missing
    if (!content.includes('charset')) {
      content = content.replace(/<head>/i, '<head>\n<meta charset="utf-8">')
    }
    if (!content.includes('viewport')) {
      content = content.replace(/<head>/i, '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1">')
    }
    return content
  }

  // Fragment — wrap in minimal document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: ${BRAND.fonts.sans}; color: ${BRAND.colors.text}; padding: 16px; line-height: 1.6; margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; border: 1px solid ${BRAND.colors.border}; font-size: 13px; }
    th { background: #f3f4f6; font-weight: 600; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${content}
  <script>
    // Communicate height to parent for auto-resize
    function reportHeight() {
      const h = document.body.scrollHeight;
      window.parent.postMessage({ type: 'artifact-height', height: h }, '*');
    }
    reportHeight();
    new ResizeObserver(reportHeight).observe(document.body);
  </script>
</body>
</html>`
}

export { BRAND }
