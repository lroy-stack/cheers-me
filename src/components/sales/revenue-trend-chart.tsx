'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'

interface TrendData {
  date: string
  total_revenue: number
  ticket_count?: number
}

interface RevenueTrendChartProps {
  data: TrendData[]
  title?: string
  description?: string
}

export function RevenueTrendChart({
  data,
  title,
  description,
}: RevenueTrendChartProps) {
  const t = useTranslations('sales')
  const resolvedTitle = title ?? t('overview.revenueByDay')
  const resolvedDescription = description ?? t('overview.subtitle')
  // Format data for chart
  const chartData = data.map((item) => ({
    date: format(parseISO(item.date), 'MMM dd'),
    revenue: item.total_revenue,
    tickets: item.ticket_count || 0,
  }))

  const formatCurrency = (value: number) => {
    return `€${(value / 1000).toFixed(1)}k`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{resolvedTitle}</CardTitle>
        <CardDescription>{resolvedDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: 'oklch(var(--muted-foreground))' }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                className="text-xs"
                tick={{ fill: 'oklch(var(--muted-foreground))' }}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'revenue') {
                    return [new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(value), 'Revenue']
                  }
                  return [value, 'Tickets']
                }}
                contentStyle={{
                  backgroundColor: 'oklch(var(--card))',
                  border: '1px solid oklch(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'oklch(var(--foreground))' }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: '20px',
                  fontSize: '12px'
                }}
                formatter={(value) => value === 'revenue' ? 'Revenue' : 'Tickets'}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="oklch(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'oklch(var(--primary))', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="tickets"
                stroke="oklch(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'oklch(var(--muted-foreground))', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
