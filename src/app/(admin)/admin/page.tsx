import { getErrorStats } from '@/lib/actions/errors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  AlertCircle,
  XCircle,
  Info,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const { data: stats } = await getErrorStats()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform-wide monitoring and error tracking
        </p>
      </div>

      {/* Error Status Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Open Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.open || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Investigating</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.investigating || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Being looked at</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.resolved || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Fixed issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Severity Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Fatal</span>
                </div>
                <span className="text-sm font-bold text-red-600">
                  {stats?.bySeverity?.fatal || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Error</span>
                </div>
                <span className="text-sm font-bold text-orange-500">
                  {stats?.bySeverity?.error || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Warning</span>
                </div>
                <span className="text-sm font-bold text-yellow-500">
                  {stats?.bySeverity?.warning || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Info</span>
                </div>
                <span className="text-sm font-bold text-blue-500">
                  {stats?.bySeverity?.info || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.byType && Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${stats.total ? (count / stats.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 7-Day Trend */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Error Trend (Last 7 Days)</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between h-32 gap-2">
            {stats?.trend?.map((day) => {
              const maxCount = Math.max(...(stats.trend?.map((d) => d.count) || [1]), 1)
              const height = (day.count / maxCount) * 100
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-xs font-medium text-gray-600">{day.count}</span>
                  <div
                    className="w-full bg-emerald-500 rounded-t transition-all"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-gray-500">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/admin/error-logs"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
            >
              <Eye className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium">View All Errors</p>
                <p className="text-sm text-gray-500">Browse and manage error logs</p>
              </div>
            </Link>
            <Link
              href="/admin/error-logs?status=open"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-red-500 hover:bg-red-50 transition-colors"
            >
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium">Open Issues</p>
                <p className="text-sm text-gray-500">{stats?.open || 0} errors need attention</p>
              </div>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <CheckCircle className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium">Back to Dashboard</p>
                <p className="text-sm text-gray-500">Return to main application</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
