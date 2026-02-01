import Link from 'next/link'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, AlertTriangle, Clock, BarChart3 } from 'lucide-react'
import { getTranslator } from '@/lib/i18n/server'

export default async function ReportsPage() {
  const t = await getTranslator()

  const reports = [
    {
      title: t('reports.movements'),
      description: t('reports.movementsDesc'),
      href: '/reports/movements',
      icon: FileText,
    },
    {
      title: t('reports.valuation'),
      description: t('reports.valuationDesc'),
      href: '/reports/valuation',
      icon: BarChart3,
    },
    {
      title: t('reports.lowStock'),
      description: t('reports.lowStockDesc'),
      href: '/reports/low-stock',
      icon: AlertTriangle,
    },
    {
      title: t('reports.expiring'),
      description: t('reports.expiringDesc'),
      href: '/reports/expiring',
      icon: Clock,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        <p className="text-gray-600">{t('reports.subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="hover:border-gray-400 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <report.icon className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
