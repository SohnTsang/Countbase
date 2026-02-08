'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/lib/i18n'

interface MovementTrendsChartProps {
  data: {
    created_at: string
    movement_type: string
    qty: number
  }[]
}

const MOVEMENT_COLORS: Record<string, string> = {
  receive: '#10b981', // green
  ship: '#ef4444', // red
  transfer_out: '#f59e0b', // amber
  transfer_in: '#3b82f6', // blue
  adjustment: '#8b5cf6', // violet
  count_variance: '#ec4899', // pink
  return_in: '#06b6d4', // cyan
  return_out: '#f97316', // orange
  void: '#6b7280', // gray
}

export function MovementTrendsChart({ data }: MovementTrendsChartProps) {
  const { t } = useTranslation()

  // Group by date for trend line
  const trendData = useMemo(() => {
    const groupedByDate = new Map<string, number>()

    // Get last 30 days
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      groupedByDate.set(dateStr, 0)
    }

    data.forEach((item) => {
      const dateStr = item.created_at.split('T')[0]
      if (groupedByDate.has(dateStr)) {
        groupedByDate.set(dateStr, (groupedByDate.get(dateStr) || 0) + 1)
      }
    })

    return Array.from(groupedByDate.entries()).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count,
    }))
  }, [data])

  // Group by movement type for bar chart
  const typeData = useMemo(() => {
    const groupedByType = new Map<string, number>()

    data.forEach((item) => {
      const current = groupedByType.get(item.movement_type) || 0
      groupedByType.set(item.movement_type, current + 1)
    })

    return Array.from(groupedByType.entries())
      .map(([type, count]) => ({
        type,
        label: t(`movementTypes.${type}`),
        count,
        color: MOVEMENT_COLORS[type] || '#6b7280',
      }))
      .sort((a, b) => b.count - a.count)
  }, [data, t])

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            {t('reports.charts.noChartData')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Line Chart - Trends over time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('reports.charts.movementTrends')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} tickMargin={8} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart - By Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('reports.charts.movementsByType')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="label" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
