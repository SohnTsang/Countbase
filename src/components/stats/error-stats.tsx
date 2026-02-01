'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  EyeOff,
} from 'lucide-react'
import type { ErrorStats as ErrorStatsType } from '@/types'

interface ErrorStatsProps {
  stats: ErrorStatsType
}

export function ErrorStats({ stats }: ErrorStatsProps) {
  const statCards = [
    {
      label: 'Open',
      value: stats.open,
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      valueColor: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Investigating',
      value: stats.investigating,
      icon: Clock,
      iconColor: 'text-yellow-500',
      valueColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      label: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle,
      iconColor: 'text-green-500',
      valueColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Ignored',
      value: stats.ignored,
      icon: EyeOff,
      iconColor: 'text-gray-500',
      valueColor: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.label} className={stat.bgColor}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.label}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.valueColor}`}>
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
