# Finance & Reporting Module — Database Schema

## Overview

This document describes the complete database schema for the Finance & Reporting module (M9). The schema supports:

- Daily P&L calculations
- Food, beverage, and labor cost ratios
- Weekly and monthly aggregated reports
- Budget vs actual comparisons
- Cash flow tracking
- Tax-ready exports
- Financial KPI dashboard

## Tables

### Core Financial Tables

#### `daily_financials`
Primary table for daily financial metrics (defined in `001_initial_schema.sql`).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| date | DATE | Unique date for financials |
| revenue | DECIMAL(10,2) | Total daily revenue |
| cost_of_goods_sold | DECIMAL(10,2) | Total COGS |
| labor_cost | DECIMAL(10,2) | Total labor cost for the day |
| overhead_cost | DECIMAL(10,2) | Total overhead expenses |
| profit | DECIMAL(10,2) | Net profit (revenue - all costs) |
| food_cost_ratio | DECIMAL(5,2) | Food cost as % of food revenue |
| beverage_cost_ratio | DECIMAL(5,2) | Beverage cost as % of drink revenue |
| labor_cost_ratio | DECIMAL(5,2) | Labor cost as % of total revenue |

**Target Ratios:**
- Food cost ratio: < 30%
- Beverage cost ratio: < 22%
- Labor cost ratio: < 30%

#### `budget`
Budget planning and tracking (defined in `001_initial_schema.sql`).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| category | VARCHAR(100) | Budget category (revenue, cogs, labor, overhead) |
| amount | DECIMAL(10,2) | Budgeted amount |
| period_start | DATE | Start of budget period |
| period_end | DATE | End of budget period |

### New Tables (Migration 014)

#### `cash_flow_transactions`
Detailed tracking of all cash movements.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| date | DATE | Transaction date |
| transaction_type | transaction_type | ENUM: sale, purchase, labor, overhead, tax, investment, withdrawal |
| amount | DECIMAL(10,2) | Transaction amount |
| payment_method | payment_method | ENUM: cash, card, transfer, other |
| category | VARCHAR(100) | Transaction category |
| description | TEXT | Details |
| reference_id | UUID | Link to related record |
| reference_table | VARCHAR(100) | Source table name |
| created_by | UUID | FK to employees |

**Use cases:**
- Track daily cash vs card split
- Reconcile bank statements
- Monitor cash flow trends
- Identify payment method preferences

#### `tax_periods`
Tax period calculations for accountant exports.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| period_name | VARCHAR(100) | e.g., "Q1 2024" |
| period_start | DATE | Period start |
| period_end | DATE | Period end |
| total_revenue | DECIMAL(10,2) | Total revenue in period |
| taxable_revenue | DECIMAL(10,2) | Revenue subject to tax |
| tax_rate | DECIMAL(5,2) | Applicable tax rate (e.g., 21% Spanish VAT) |
| tax_amount | DECIMAL(10,2) | Calculated tax |
| deductions | DECIMAL(10,2) | Tax deductions |
| net_tax_payable | DECIMAL(10,2) | Final tax amount due |
| status | VARCHAR(50) | pending, filed, paid |
| exported_at | TIMESTAMPTZ | When exported for accountant |

#### `overhead_expenses`
Detailed overhead tracking (rent, utilities, licenses, etc.).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| date | DATE | Expense date |
| category | VARCHAR(100) | Rent, utilities, licenses, insurance, etc. |
| description | TEXT | Expense details |
| amount | DECIMAL(10,2) | Expense amount |
| is_recurring | BOOLEAN | If recurring expense |
| recurrence_frequency | VARCHAR(50) | monthly, yearly, etc. |
| vendor | VARCHAR(255) | Supplier/vendor name |
| invoice_number | VARCHAR(100) | Invoice reference |
| payment_due_date | DATE | When payment is due |
| payment_date | DATE | When actually paid |
| payment_method | payment_method | How paid |

**Common categories:**
- Rent (monthly)
- Electricity (monthly)
- Water (monthly)
- Internet/phone (monthly)
- Business license (yearly)
- Insurance (yearly)
- Equipment maintenance
- Marketing/advertising

#### `financial_targets`
Target KPIs for performance benchmarking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| period_start | DATE | Target period start |
| period_end | DATE | Target period end |
| target_food_cost_ratio | DECIMAL(5,2) | Target food cost % (default: 30%) |
| target_beverage_cost_ratio | DECIMAL(5,2) | Target beverage cost % (default: 22%) |
| target_labor_cost_ratio | DECIMAL(5,2) | Target labor cost % (default: 30%) |
| target_revenue | DECIMAL(10,2) | Revenue goal |
| target_profit_margin | DECIMAL(5,2) | Profit margin goal |

## Views

### `weekly_financials`
Aggregated weekly financial summary.

**Columns:**
- `week_start`, `week_end`: Week date range
- `total_revenue`, `total_cogs`, `total_labor`, `total_overhead`, `total_profit`: Summed values
- `avg_food_cost_ratio`, `avg_beverage_cost_ratio`, `avg_labor_cost_ratio`: Average ratios
- `days_with_data`: Number of days with financial data

**Usage:**
```sql
SELECT * FROM weekly_financials
WHERE week_start >= '2024-04-01'
ORDER BY week_start DESC;
```

### `monthly_financials`
Aggregated monthly financial summary with profit margin.

**Columns:**
- `month_start`, `month_end`, `year`, `month`: Period identifiers
- `total_revenue`, `total_cogs`, `total_labor`, `total_overhead`, `total_profit`: Summed values
- `avg_food_cost_ratio`, `avg_beverage_cost_ratio`, `avg_labor_cost_ratio`: Average ratios
- `profit_margin`: Calculated profit margin %
- `days_with_data`: Number of days

**Usage:**
```sql
SELECT
  month_start,
  total_revenue,
  total_profit,
  profit_margin,
  avg_food_cost_ratio
FROM monthly_financials
WHERE year = 2024
ORDER BY month;
```

### `budget_vs_actual`
Budget vs actual comparison with variance.

**Columns:**
- `budget_id`, `category`: Budget details
- `budget_amount`: Planned amount
- `actual_amount`: Actual spending/revenue
- `variance`: Difference (budget - actual)
- `variance_percentage`: Variance as % of budget
- `period_start`, `period_end`: Period

**Usage:**
```sql
SELECT
  category,
  budget_amount,
  actual_amount,
  variance,
  variance_percentage
FROM budget_vs_actual
WHERE period_start >= '2024-04-01'
ORDER BY ABS(variance_percentage) DESC;
```

## Functions

### `calculate_daily_financials(target_date DATE)`
Calculates and updates daily financial metrics from all data sources.

**Sources:**
- Revenue: `daily_sales` table
- COGS: `stock_movements` (out movements × cost_per_unit)
- Labor: `clock_in_out` (hours × hourly_rate)
- Overhead: `overhead_expenses`

**Usage:**
```sql
-- Calculate for a specific date
SELECT calculate_daily_financials('2024-06-15');

-- Calculate for date range (loop in application)
-- Call once per day in cron job
```

**Ratios calculated:**
- Food cost ratio = (COGS / food revenue) × 100
- Beverage cost ratio = (COGS / beverage revenue) × 100
- Labor cost ratio = (labor cost / total revenue) × 100

### `generate_tax_export(start_date DATE, end_date DATE)`
Generates tax-ready export data for accountant.

**Returns:**
- `transaction_date`: Date of transaction
- `category`: Transaction category
- `description`: Details
- `revenue`: Revenue amount
- `expenses`: Expense amount
- `tax_amount`: Calculated tax (21% Spanish VAT)

**Usage:**
```sql
-- Export Q2 2024 tax data
SELECT * FROM generate_tax_export('2024-04-01', '2024-06-30')
ORDER BY transaction_date;

-- Export for CSV download
COPY (
  SELECT * FROM generate_tax_export('2024-04-01', '2024-06-30')
) TO '/tmp/tax_export_q2_2024.csv' CSV HEADER;
```

## Enums

### `transaction_type`
- `sale`: Revenue from sales
- `purchase`: Inventory/supply purchases
- `labor`: Wage payments
- `overhead`: Operating expenses
- `tax`: Tax payments
- `investment`: Capital investment
- `withdrawal`: Owner withdrawal

### `payment_method`
- `cash`: Cash payment
- `card`: Card payment
- `transfer`: Bank transfer
- `other`: Other methods

## Row Level Security (RLS)

All finance tables have RLS enabled. Access policies:

| Table | SELECT | INSERT/UPDATE |
|-------|--------|---------------|
| `daily_financials` | admin, manager, owner | admin, manager |
| `budget` | admin, manager, owner | admin, manager |
| `cash_flow_transactions` | admin, manager, owner | admin, manager |
| `tax_periods` | admin, manager, owner | admin, manager |
| `overhead_expenses` | admin, manager, owner | admin, manager |
| `financial_targets` | admin, manager, owner | admin, manager |

**Rationale:** Financial data is sensitive and should only be visible to management and ownership.

## Indexes

Performance indexes on frequently queried columns:

- `idx_cash_flow_date`: Cash flow by date
- `idx_cash_flow_type`: Cash flow by transaction type
- `idx_cash_flow_category`: Cash flow by category
- `idx_overhead_date`: Overhead expenses by date
- `idx_overhead_category`: Overhead by category
- `idx_daily_sales_date`: Daily sales by date (from 001)

## API Integration Points

The API routes will use these tables to provide:

1. **Dashboard KPIs**
   - Today's revenue, costs, profit
   - Week-to-date comparisons
   - Month-to-date comparisons
   - Ratio alerts (when > target)

2. **Reports**
   - Daily P&L report
   - Weekly summary
   - Monthly summary
   - Budget vs actual
   - Cost ratio trends

3. **Exports**
   - CSV export for accountant (via `generate_tax_export`)
   - PDF report generation (API side)

4. **Cash Flow**
   - Daily cash flow summary
   - Payment method breakdown
   - Cash vs card trends

## Example Queries

### Daily P&L
```sql
SELECT
  date,
  revenue,
  cost_of_goods_sold,
  labor_cost,
  overhead_cost,
  profit,
  food_cost_ratio,
  beverage_cost_ratio,
  labor_cost_ratio
FROM daily_financials
WHERE date = CURRENT_DATE;
```

### Week-to-Date Performance
```sql
SELECT
  SUM(revenue) as wtd_revenue,
  SUM(profit) as wtd_profit,
  AVG(food_cost_ratio) as avg_food_cost,
  AVG(labor_cost_ratio) as avg_labor_cost
FROM daily_financials
WHERE date >= DATE_TRUNC('week', CURRENT_DATE);
```

### Month-over-Month Comparison
```sql
SELECT
  TO_CHAR(month_start, 'Mon YYYY') as month,
  total_revenue,
  total_profit,
  profit_margin,
  LAG(total_revenue) OVER (ORDER BY month_start) as prev_month_revenue,
  ((total_revenue - LAG(total_revenue) OVER (ORDER BY month_start)) /
   LAG(total_revenue) OVER (ORDER BY month_start) * 100) as revenue_growth_pct
FROM monthly_financials
WHERE year = 2024
ORDER BY month_start;
```

### Cost Ratio Alerts
```sql
SELECT
  df.date,
  df.food_cost_ratio,
  ft.target_food_cost_ratio,
  df.food_cost_ratio - ft.target_food_cost_ratio as variance
FROM daily_financials df
CROSS JOIN financial_targets ft
WHERE df.date BETWEEN ft.period_start AND ft.period_end
  AND df.food_cost_ratio > ft.target_food_cost_ratio
ORDER BY df.date DESC;
```

### Cash Flow Summary
```sql
SELECT
  date,
  transaction_type,
  SUM(CASE WHEN transaction_type = 'sale' THEN amount ELSE 0 END) as inflow,
  SUM(CASE WHEN transaction_type IN ('purchase', 'labor', 'overhead', 'tax') THEN amount ELSE 0 END) as outflow,
  SUM(CASE WHEN transaction_type = 'sale' THEN amount ELSE -amount END) as net_cash_flow
FROM cash_flow_transactions
WHERE date BETWEEN '2024-06-01' AND '2024-06-30'
GROUP BY date, transaction_type
ORDER BY date DESC;
```

## Automated Workflows

### Daily Financial Calculation (Cron Job)
Run at 03:00 daily to calculate previous day's financials:

```typescript
// src/lib/cron/calculate-financials.ts
import { createClient } from '@/lib/supabase/server'

export async function calculateYesterdayFinancials() {
  const supabase = await createClient()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().split('T')[0]

  const { error } = await supabase.rpc('calculate_daily_financials', {
    target_date: dateStr
  })

  if (error) {
    console.error('Failed to calculate financials:', error)
  }
}
```

### Overhead Recurring Expenses
Auto-create monthly recurring expenses:

```sql
-- Run on 1st of each month
INSERT INTO overhead_expenses (date, category, description, amount, is_recurring, vendor, payment_due_date)
SELECT
  DATE_TRUNC('month', CURRENT_DATE)::DATE,
  category,
  description,
  amount,
  true,
  vendor,
  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
FROM overhead_expenses
WHERE is_recurring = true
  AND recurrence_frequency = 'monthly'
  AND date = (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
```

## Migration Checklist

- [x] Core financial tables exist (001_initial_schema.sql)
- [x] Cash flow tracking table created
- [x] Tax periods table created
- [x] Overhead expenses table created
- [x] Financial targets table created
- [x] Weekly aggregation view created
- [x] Monthly aggregation view created
- [x] Budget vs actual view created
- [x] Daily financials calculation function created
- [x] Tax export function created
- [x] RLS policies applied
- [x] Indexes created
- [x] Triggers for updated_at created
- [x] Default targets seeded

## Next Steps

1. **API Routes** (next task):
   - GET /api/finance/dashboard (daily KPIs)
   - GET /api/finance/reports/daily (P&L)
   - GET /api/finance/reports/weekly
   - GET /api/finance/reports/monthly
   - GET /api/finance/budget-vs-actual
   - GET /api/finance/cash-flow
   - POST /api/finance/calculate (trigger calculation)
   - GET /api/finance/export/tax (CSV download)

2. **UI Components**:
   - Financial dashboard with KPI cards
   - Cost ratio gauges with targets
   - Revenue/profit trend charts
   - Budget vs actual table
   - Report filters (date range, category)
   - Export buttons (CSV/PDF)

3. **Testing**:
   - Unit tests for calculation logic
   - Integration tests for API routes
   - E2E test: View financial dashboard → Export report
