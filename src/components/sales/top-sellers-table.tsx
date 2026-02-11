'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trophy, TrendingUp } from 'lucide-react'

interface TopSeller {
  item_name: string
  category: string
  quantity_sold: number
  total_revenue: number
  sale_date?: string
}

interface TopSellersTableProps {
  items: TopSeller[]
  period?: string
}

const categoryColors: Record<string, string> = {
  food: 'bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary',
  drinks: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  cocktails: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  desserts: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  other: 'bg-muted text-foreground dark:bg-card/30 dark:text-muted-foreground',
}

export function TopSellersTable({ items, period = 'today' }: TopSellersTableProps) {
  const t = useTranslations('sales')
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}.`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle>{t('overview.topItems')}</CardTitle>
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardDescription>
          Best performing items {period === 'today' ? 'today' : `this ${period}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No sales data available yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.slice(0, 10).map((item, index) => (
                    <TableRow key={`${item.item_name}-${index}`}>
                      <TableCell className="font-medium text-lg">
                        {getMedalEmoji(index)}
                      </TableCell>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={categoryColors[item.category] || categoryColors.other}
                        >
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity_sold}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.total_revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {items.slice(0, 10).map((item, index) => (
                <div
                  key={`${item.item_name}-${index}`}
                  className="p-4 rounded-lg border bg-card space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-medium">{getMedalEmoji(index)}</span>
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        <Badge
                          variant="secondary"
                          className={`mt-1 text-xs ${categoryColors[item.category] || categoryColors.other}`}
                        >
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t text-sm">
                    <span className="text-muted-foreground">Sold: {item.quantity_sold}</span>
                    <span className="font-semibold">{formatCurrency(item.total_revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
