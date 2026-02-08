'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'

interface LowStockChartProps {
  data: {
    category_name: string
    count: number
    shortage_value: number
  }[]
  currency?: string
}

const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e']

export function LowStockChart({ data, currency = 'USD' }: LowStockChartProps) {
  const { t, locale } = useTranslation()

  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: item.category_name || t('common.noCategory'),
      count: item.count,
      shortageValue: item.shortage_value,
    }))
  }, [data, t])

  const totalShortage = useMemo(() => {
    return data.reduce((sum, item) => sum + item.shortage_value, 0)
  }, [data])

  const totalCount = useMemo(() => {
    return data.reduce((sum, item) => sum + item.count, 0)
  }, [data])

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
      {/* Summary Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('reports.charts.shortageValue')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(totalShortage, currency, locale)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {totalCount} {t('reports.productsNeedReordering')}
              </p>
            </div>
            <div className="space-y-2">
              {chartData.slice(0, 5).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart - By Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('reports.charts.lowStockByCategory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="name" fontSize={12} width={80} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'count') return [value, t('reports.productsNeedReordering')]
                    return [formatCurrency(Number(value), currency, locale), t('reports.charts.shortageValue')]
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
