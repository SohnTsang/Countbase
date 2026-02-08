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

interface ExpiringChartProps {
  data: {
    days_until_expiry: number
    inventory_value: number
    qty: number
  }[]
  currency?: string
}

const URGENCY_COLORS = {
  expired: '#dc2626', // red-600
  critical: '#f97316', // orange-500
  warning: '#eab308', // yellow-500
}

export function ExpiringChart({ data, currency = 'USD' }: ExpiringChartProps) {
  const { t, locale } = useTranslation()

  // Group by urgency
  const urgencyData = useMemo(() => {
    const groups = {
      expired: { count: 0, value: 0 },
      critical: { count: 0, value: 0 }, // 0-7 days
      warning: { count: 0, value: 0 }, // 8-30 days
    }

    data.forEach((item) => {
      if (item.days_until_expiry <= 0) {
        groups.expired.count += 1
        groups.expired.value += item.inventory_value
      } else if (item.days_until_expiry <= 7) {
        groups.critical.count += 1
        groups.critical.value += item.inventory_value
      } else {
        groups.warning.count += 1
        groups.warning.value += item.inventory_value
      }
    })

    return [
      {
        name: t('reports.urgencyExpired'),
        count: groups.expired.count,
        value: groups.expired.value,
        color: URGENCY_COLORS.expired,
      },
      {
        name: t('reports.urgency7Days'),
        count: groups.critical.count,
        value: groups.critical.value,
        color: URGENCY_COLORS.critical,
      },
      {
        name: t('reports.urgency30Days'),
        count: groups.warning.count,
        value: groups.warning.value,
        color: URGENCY_COLORS.warning,
      },
    ].filter((item) => item.count > 0)
  }, [data, t])

  const totalValue = useMemo(() => {
    return data.reduce((sum, item) => sum + item.inventory_value, 0)
  }, [data])

  const totalCount = useMemo(() => {
    return data.length
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
      {/* Donut Chart - By Urgency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('reports.charts.expiringByUrgency')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={urgencyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {urgencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => {
                    const item = props.payload
                    return [
                      `${value} items (${formatCurrency(item.value, currency, locale)})`,
                      name,
                    ]
                  }}
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
            <span className="text-sm text-muted-foreground">{t('reports.totalItems')}: </span>
            <span className="font-semibold">{totalCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart - Value at Risk */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('reports.charts.valueAtRisk')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={urgencyData} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value, currency, locale)}
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value), currency, locale)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {urgencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2">
            <span className="text-sm text-muted-foreground">{t('reports.totalValue')}: </span>
            <span className="font-semibold text-red-600">
              {formatCurrency(totalValue, currency, locale)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
