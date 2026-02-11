# Financial Data Export Functionality

## Overview

The GrandCafe Cheers platform now supports comprehensive financial data export in both CSV and PDF formats. This enables easy sharing with accountants, bookkeepers, and for tax compliance.

## Features

### 1. General Financial Reports Export

**Location:** `/finance/reports` → Export Tab

**Report Types:**
- **Daily Report:** Single day P&L with detailed breakdown
- **Weekly Report:** 7-day aggregated financial summary
- **Monthly Report:** Full month summary with profit margins
- **Custom Range:** Choose any date range for analysis

**Export Formats:**
- **CSV:** Excel-compatible format with UTF-8 BOM for international characters
- **PDF:** Professional report with GrandCafe Cheers branding

**Data Included:**
- Total revenue by day
- Cost of goods sold (COGS)
- Labor costs
- Overhead expenses
- Net profit
- Food cost percentage
- Beverage cost percentage
- Labor cost percentage
- Profit margins

### 2. Tax Export

**Location:** `/finance/export/tax`

**Features:**
- Year and quarter selection
- IVA (Spanish VAT) calculations at 21%
- Revenue and expense breakdown
- Tax amount calculations
- Compliance-ready format

**Export Formats:**
- CSV for Excel processing
- PDF for accountant review

## API Endpoints

### `/api/finance/export` (GET)

Generate financial reports in CSV or PDF format.

**Query Parameters:**
- `report_type`: `daily` | `weekly` | `monthly` | `custom` (required)
- `format`: `csv` | `pdf` (required)
- `date`: ISO date string (for daily/weekly/monthly)
- `start_date`: ISO date string (for custom range)
- `end_date`: ISO date string (for custom range)

**Access:** Admin, Manager, Owner roles only

**Example Usage:**
```typescript
// Daily report as CSV
GET /api/finance/export?report_type=daily&format=csv&date=2024-01-15

// Weekly report as PDF
GET /api/finance/export?report_type=weekly&format=pdf&date=2024-01-15

// Custom range as CSV
GET /api/finance/export?report_type=custom&format=csv&start_date=2024-01-01&end_date=2024-01-31
```

**Response:**
- Success: Binary file download (CSV or PDF)
- Error: JSON with error message

### `/api/finance/export/tax` (GET)

Generate tax export data for accountants.

**Query Parameters:**
- `start_date`: ISO date string (required)
- `end_date`: ISO date string (required)
- `format`: `csv` | `pdf` | `json` (default: csv)

**Access:** Admin, Manager, Owner roles only

**Example Usage:**
```typescript
// Q1 2024 tax export as PDF
GET /api/finance/export/tax?start_date=2024-01-01&end_date=2024-03-31&format=pdf

// Full year as CSV
GET /api/finance/export/tax?start_date=2024-01-01&end_date=2024-12-31&format=csv
```

**Response:**
- Success: Binary file download (CSV or PDF) or JSON data
- Error: JSON with error message

## Components

### `<FinancialReportExport />`

General financial report export component with:
- Report type selector (daily/weekly/monthly/custom)
- Date picker or date range selector
- Format toggle (CSV/PDF)
- Quick export presets (Today, Yesterday, This Week, This Month)
- Export status feedback

**Usage:**
```tsx
import { FinancialReportExport } from '@/components/finance/export'

export default function ReportsPage() {
  return <FinancialReportExport />
}
```

### `<TaxExportTool />`

Tax-specific export component with:
- Year selector
- Quarter selector (Q1-Q4 or Full Year)
- Format toggle (CSV/PDF)
- Information about what's included
- Compliance notes

**Usage:**
```tsx
import { TaxExportTool } from '@/components/finance/export'

export default function TaxExportPage() {
  return <TaxExportTool />
}
```

## Utility Libraries

### CSV Utilities (`@/lib/utils/csv`)

**Functions:**
- `generateCSV(columns, data, options)`: Generate CSV string from data
- `formatCSVCurrency(amount)`: Format currency for CSV (no symbols)
- `formatCSVPercentage(value)`: Format percentage for CSV
- `formatCSVDate(dateString)`: Format date for CSV (ISO format)

**Example:**
```typescript
import { generateCSV, formatCSVCurrency } from '@/lib/utils/csv'

const columns = [
  { header: 'Date', dataKey: 'date' },
  { header: 'Revenue', dataKey: 'revenue', format: formatCSVCurrency },
]

const data = [
  { date: '2024-01-01', revenue: 1500.50 },
  { date: '2024-01-02', revenue: 1800.75 },
]

const csvContent = generateCSV(columns, data)
```

### PDF Utilities (`@/lib/utils/pdf`)

**Functions:**
- `createPDFDocument()`: Create new PDF with A4 size and margins
- `addPDFHeader(doc, options)`: Add branded header to PDF
- `addPDFSection(doc, section)`: Add key-value section
- `addPDFTable(doc, columns, data)`: Add table with data
- `addPDFFooter(doc)`: Add page numbers and branding
- `formatCurrency(amount)`: Format EUR currency
- `formatPercentage(value)`: Format percentage

**Example:**
```typescript
import {
  createPDFDocument,
  addPDFHeader,
  addPDFTable,
  addPDFFooter,
  formatCurrency,
} from '@/lib/utils/pdf'

const doc = createPDFDocument()

// Add header
addPDFHeader(doc, {
  title: 'Financial Report',
  subtitle: 'Monthly Summary',
  period: { start: '2024-01-01', end: '2024-01-31' },
})

// Add table
const columns = [
  { header: 'Date', dataKey: 'date', width: 80 },
  {
    header: 'Revenue',
    dataKey: 'revenue',
    width: 100,
    align: 'right',
    format: formatCurrency,
  },
]

addPDFTable(doc, columns, data)

// Add footer
addPDFFooter(doc)

// Finalize
doc.end()
```

## Database Functions

### `generate_tax_export(start_date, end_date)`

PostgreSQL function that generates tax-ready data.

**Returns:** Table with columns:
- `transaction_date`: Date of transaction
- `category`: Revenue or expense category
- `description`: Transaction description
- `revenue`: Revenue amount
- `expenses`: Expense amount
- `tax_amount`: Calculated IVA (21%)

**Usage:**
```sql
SELECT * FROM generate_tax_export('2024-01-01', '2024-12-31');
```

## Security

- All export endpoints require authentication
- Access restricted to Admin, Manager, and Owner roles
- Row Level Security (RLS) enforced on all financial data
- No sensitive data exposed in error messages

## Testing

Run unit tests:
```bash
pnpm test tests/unit/export-utils.test.ts
```

Test coverage includes:
- CSV generation with various data types
- CSV value escaping (commas, quotes, newlines)
- Currency formatting
- Percentage formatting
- Date formatting

## Performance Considerations

- Large date ranges (>90 days) may take longer to generate
- PDF generation is CPU-intensive; use CSV for large datasets
- Consider adding pagination for very large exports in future

## Future Enhancements

Potential improvements:
- Excel (.xlsx) format support
- Batch export scheduling
- Email delivery of reports
- Chart/graph inclusion in PDF reports
- Multi-currency support
- Custom report templates
- Audit trail for exports

## Compliance Notes

### Spanish Tax Regulations

The export functionality is designed for Spanish tax compliance:
- IVA (VAT) calculated at 21% standard rate
- Date format: DD/MM/YYYY or ISO 8601
- Currency: EUR (€)
- Records must be kept for 7 years per Spanish law

**Important:** Always consult with a qualified tax advisor or accountant before filing. This export is provided as a convenience and may require additional processing for official submission.

## Troubleshooting

### CSV opens with garbled characters

**Solution:** The CSV includes UTF-8 BOM for Excel compatibility. If using other software, ensure UTF-8 encoding is selected.

### PDF fails to generate

**Solution:** Check server logs for PDFKit errors. Ensure sufficient memory is available. Large datasets may require streaming approach.

### Export times out

**Solution:** Reduce date range or use CSV format instead of PDF. Consider implementing pagination for very large exports.

### Missing data in export

**Solution:** Verify that daily_financials table has data for the requested period. Run `calculate_daily_financials()` function if needed.

## Support

For issues or questions about export functionality:
1. Check server logs for detailed error messages
2. Verify RLS policies allow access to financial data
3. Ensure user has correct role (admin/manager/owner)
4. Test with smaller date ranges first
