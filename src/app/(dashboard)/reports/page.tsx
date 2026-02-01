import Link from 'next/link'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, AlertTriangle, Clock, BarChart3 } from 'lucide-react'

const reports = [
  {
    title: 'Stock Movements',
    description: 'All inventory movements history',
    href: '/reports/movements',
    icon: FileText,
  },
  {
    title: 'Inventory Valuation',
    description: 'Current value by product and location',
    href: '/reports/valuation',
    icon: BarChart3,
  },
  {
    title: 'Low Stock',
    description: 'Products below reorder point',
    href: '/reports/low-stock',
    icon: AlertTriangle,
  },
  {
    title: 'Expiring Soon',
    description: 'Products expiring in 30 days',
    href: '/reports/expiring',
    icon: Clock,
  },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600">Inventory analysis and insights</p>
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
