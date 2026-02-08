'use client'

import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'

interface InventoryValueChartProps {
  data: {
    category_name: string
    total_value: number
  }[]
  topProducts: {
    name: string
    value: number
  }[]
  currency?: string
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
]

export function InventoryValueChart({
  data,
  topProducts,
  currency = 'USD',
}: InventoryValueChartProps) {
  const { t, locale } = useTranslation()

  const pieData = useMemo(() => {
    return data.map((item, index) => ({
      name: item.category_name || t('common.noCategory'),
      value: item.total_value,
      color: COLORS[index % COLORS.length],
    }))
  }, [data, t])

  const barData = useMemo(() => {
    return topProducts.slice(0, 10).map((item) => ({
      name: item.name.length > 20 ? item.name.slice(0, 20) + '...' : item.name,
      value: item.value,
    }))
  }, [topProducts])

  const totalValue = useMemo(() => {
    return data.reduce((sum, item) => sum + item.total_value, 0)
  }, [data])

  if (data.length === 0 && topProducts.length === 0) {
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
      {/* Pie Chart - Value by Category */}
      {data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reports.charts.stockByCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      (percent ?? 0) > 0.05 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value), currency, locale)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-2">
              <span className="text-sm text-muted-foreground">{t('reports.totalValue')}: </span>
              <span className="font-semibold">{formatCurrency(totalValue, currency, locale)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bar Chart - Top Products */}
      {topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reports.charts.topProducts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCurrency(value, currency, locale)}
                    fontSize={12}
                  />
                  <YAxis type="category" dataKey="name" fontSize={12} width={80} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value), currency, locale)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
