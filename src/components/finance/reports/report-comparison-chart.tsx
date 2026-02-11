'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ComparisonTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-2">{label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {`\u20AC${entry.value.toLocaleString()}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

interface ReportComparisonChartProps {
  data: Array<{
    period: string
    revenue: number
    profit: number
    cogs: number
    labor: number
  }>
  title?: string
  description?: string
  chartType?: 'line' | 'bar'
}

export function ReportComparisonChart({
  data,
  title,
  description,
  chartType = 'line',
}: ReportComparisonChartProps) {
  const t = useTranslations('finance')

  const displayTitle = title || t('reports.financialTrends')
  const displayDescription = description || t('reports.financialTrendsDesc')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          {displayTitle}
        </CardTitle>
        <CardDescription>{displayDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="period"
                  className="text-xs text-muted-foreground"
                />
                <YAxis
                  className="text-xs text-muted-foreground"
                  tickFormatter={(value) => `\u20AC${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ComparisonTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="cogs"
                  name="COGS"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="labor"
                  name="Labor"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="period"
                  className="text-xs text-muted-foreground"
                />
                <YAxis
                  className="text-xs text-muted-foreground"
                  tickFormatter={(value) => `\u20AC${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ComparisonTooltip />} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" />
                <Bar dataKey="profit" name="Profit" fill="#3b82f6" />
                <Bar dataKey="cogs" name="COGS" fill="#f59e0b" />
                <Bar dataKey="labor" name="Labor" fill="#8b5cf6" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
