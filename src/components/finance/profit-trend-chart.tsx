'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProfitTrendTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-semibold">&euro;{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

interface ProfitTrendData {
  date: string
  revenue: number
  cost_of_goods_sold: number
  labor_cost: number
  overhead_cost: number
  profit: number
}

interface ProfitTrendChartProps {
  data: ProfitTrendData[]
}

export function ProfitTrendChart({ data }: ProfitTrendChartProps) {
  const t = useTranslations('finance')

  // Format data for chart
  const chartData = data.map((day) => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Revenue: day.revenue,
    COGS: day.cost_of_goods_sold,
    Labor: day.labor_cost,
    Overhead: day.overhead_cost,
    Profit: day.profit,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('trend.title')}</CardTitle>
        <CardDescription>{t('trend.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                className="text-xs text-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                className="text-xs text-muted-foreground"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `\u20AC${value / 1000}k`}
              />
              <Tooltip content={<ProfitTrendTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="Revenue"
                stroke="oklch(var(--chart-1))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
              <Area
                type="monotone"
                dataKey="Profit"
                stroke="oklch(var(--chart-2))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorProfit)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>{t('trend.noData')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
