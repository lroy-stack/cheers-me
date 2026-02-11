'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface CostBreakdownChartProps {
  revenue: number
  cogs: number
  labor: number
  overhead: number
  profit: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CostBreakdownTooltip({ active, payload, revenue }: any) {
  if (active && payload && payload.length) {
    const item = payload[0]
    const percentage = revenue > 0 ? ((item.value / revenue) * 100).toFixed(1) : '0.0'
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium" style={{ color: item.payload.color }}>
          {item.name}
        </p>
        <p className="text-sm mt-1">
          <span className="font-semibold">&euro;{item.value.toLocaleString()}</span>
          <span className="text-muted-foreground ml-2">({percentage}%)</span>
        </p>
      </div>
    )
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CostBreakdownLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function CostBreakdownChart({ revenue, cogs, labor, overhead, profit }: CostBreakdownChartProps) {
  const t = useTranslations('finance')

  const data = [
    { name: t('charts.costOfGoods'), value: cogs, color: '#f97316' },
    { name: t('charts.laborCost'), value: labor, color: '#3b82f6' },
    { name: t('charts.overhead'), value: overhead, color: '#8b5cf6' },
    { name: t('charts.profit'), value: profit, color: '#10b981' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('charts.plBreakdown')}</CardTitle>
        <CardDescription>{t('charts.plBreakdownDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {revenue > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={CostBreakdownLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CostBreakdownTooltip revenue={revenue} />} />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value, _entry: any) => {
                  const item = data.find((d) => d.name === value)
                  return `${value}: \u20AC${item?.value.toLocaleString()}`
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>{t('charts.noRevenueData')}</p>
          </div>
        )}

        {/* Summary Table */}
        {revenue > 0 && (
          <div className="mt-6 space-y-2 border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('charts.totalRevenue')}</span>
              <span className="font-semibold">&euro;{revenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('charts.totalCosts')}</span>
              <span className="font-semibold text-red-600">
                -&euro;{(cogs + labor + overhead).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="font-medium">{t('charts.netProfit')}</span>
              <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                &euro;{profit.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
