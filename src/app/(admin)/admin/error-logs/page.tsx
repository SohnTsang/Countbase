import { Suspense } from 'react'
import { getErrorLogs, getErrorStats } from '@/lib/actions/errors'
import { ErrorLogsTable } from '@/components/tables/error-logs-table'
import { ErrorLogsFilters } from '@/components/filters/error-logs-filters'
import { ErrorStats } from '@/components/stats/error-stats'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorLogFilters, ErrorStatus, ErrorSeverity, ErrorType } from '@/types'

interface PageProps {
  searchParams: Promise<{
    status?: string
    severity?: string
    type?: string
    search?: string
    page?: string
  }>
}

async function ErrorLogsContent({ searchParams }: PageProps) {
  const params = await searchParams

  const filters: ErrorLogFilters = {
    status: (params.status as ErrorStatus | 'all') || 'all',
    severity: (params.severity as ErrorSeverity | 'all') || 'all',
    error_type: (params.type as ErrorType | 'all') || 'all',
    search: params.search,
  }

  const page = parseInt(params.page || '1', 10)
  const pageSize = 25

  const [{ data: errors, total }, { data: stats }] = await Promise.all([
    getErrorLogs(filters, page, pageSize),
    getErrorStats(),
  ])

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && <ErrorStats stats={stats} />}

      {/* Filters */}
      <ErrorLogsFilters currentFilters={filters} />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ErrorLogsTable
            errors={errors}
            total={total}
            page={page}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters skeleton */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Table skeleton */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function ErrorLogsPage(props: PageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Error Logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor and manage application errors across all tenants
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <ErrorLogsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  )
}
