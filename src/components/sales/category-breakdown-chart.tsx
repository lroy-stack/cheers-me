'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface CategoryData {
  food: number
  drinks: number
  cocktails: number
  desserts: number
  other: number
}

interface CategoryBreakdownChartProps {
  data: CategoryData
  percentages?: CategoryData
}

// Category colors matching the design system
const COLORS = {
  food: '#f59e0b',      // amber-500 (primary)
  drinks: '#3b82f6',    // blue-500
  cocktails: '#a855f7', // violet-500
  desserts: '#ec4899',  // pink-500
  other: '#64748b',     // slate-500
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  const t = useTranslations('sales')
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Transform data for pie chart
  const chartData = [
    { name: t('categories.food'), value: data.food, color: COLORS.food },
    { name: t('categories.drinks'), value: data.drinks, color: COLORS.drinks },
    { name: t('categories.cocktails'), value: data.cocktails, color: COLORS.cocktails },
    { name: t('categories.desserts'), value: data.desserts, color: COLORS.desserts },
    { name: t('categories.other'), value: data.other, color: COLORS.other },
  ].filter(item => item.value > 0) // Only show categories with sales

  const total = data.food + data.drinks + data.cocktails + data.desserts + data.other

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('overview.revenueByCategory')}</CardTitle>
        <CardDescription>{t('overview.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={(entry) => `${((entry.value / total) * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'oklch(var(--card))',
                    border: '1px solid oklch(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Details */}
          <div className="space-y-4">
            {chartData.map((category) => {
              const percentage = ((category.value / total) * 100).toFixed(1)
              return (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatCurrency(category.value)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Total */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('overview.totalRevenue')}</span>
            <span className="text-xl font-bold">{formatCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
