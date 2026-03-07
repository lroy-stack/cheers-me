'use client'

import { Euro } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

interface Ingredient {
  name: string
  quantity: number
  unit: string
  cost_per_unit?: number
  is_garnish?: boolean
  is_optional?: boolean
}

interface CostBreakdownProps {
  ingredients: Ingredient[]
  sellingPrice: number
}

export function CostBreakdown({ ingredients, sellingPrice }: CostBreakdownProps) {
  const rows = ingredients.map(ing => ({
    name: ing.name,
    qty: `${ing.quantity} ${ing.unit}`,
    unitCost: ing.cost_per_unit || 0,
    subtotal: ing.quantity * (ing.cost_per_unit || 0),
    isGarnish: ing.is_garnish,
  }))

  const totalCost = rows.reduce((sum, r) => sum + r.subtotal, 0)
  const margin = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0

  const marginColor = margin >= 60 ? 'text-success' : margin >= 40 ? 'text-amber-600' : 'text-destructive'
  const marginBg = margin >= 60 ? 'bg-success/15 dark:bg-success/15' : margin >= 40 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-destructive/15 dark:bg-destructive/15'

  return (
    <div className="space-y-3">
      <div className="rounded-lg border overflow-hidden">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="bg-muted/50 text-left">
              <TableHead className="px-3 py-2 font-medium">Ingredient</TableHead>
              <TableHead className="px-3 py-2 font-medium text-right">Qty</TableHead>
              <TableHead className="px-3 py-2 font-medium text-right">Unit Cost</TableHead>
              <TableHead className="px-3 py-2 font-medium text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx} className="border-t">
                <TableCell className={`px-3 py-1.5 ${row.isGarnish ? 'italic text-muted-foreground' : ''}`}>
                  {row.name}
                </TableCell>
                <TableCell className="px-3 py-1.5 text-right text-muted-foreground">{row.qty}</TableCell>
                <TableCell className="px-3 py-1.5 text-right text-muted-foreground">
                  {row.unitCost > 0 ? `€${row.unitCost.toFixed(2)}` : '—'}
                </TableCell>
                <TableCell className="px-3 py-1.5 text-right font-medium">
                  {row.subtotal > 0 ? `€${row.subtotal.toFixed(2)}` : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className={`rounded-lg p-3 ${marginBg}`}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Cost</span>
          <span className="font-semibold flex items-center gap-1">
            <Euro className="h-3.5 w-3.5" />
            {totalCost.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-muted-foreground">Selling Price</span>
          <span className="font-semibold flex items-center gap-1">
            <Euro className="h-3.5 w-3.5" />
            {sellingPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-current/10">
          <span className="text-muted-foreground">Margin</span>
          <span className={`font-bold ${marginColor}`}>
            {margin.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}
