import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { AuditLogsTable } from '@/components/tables/audit-logs-table'
import { getAuditLogs } from '@/lib/audit'
import { ACTION_LABELS, RESOURCE_TYPE_LABELS } from '@/lib/audit-utils'

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check authorization - only admin and manager can view audit logs
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
    redirect('/settings')
  }

  // Parse pagination
  const page = Number(params.page) || 1
  const limit = 25
  const offset = (page - 1) * limit

  // Get audit logs
  const { data: logs, count } = await getAuditLogs({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resourceType: params.resourceType as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    action: params.action as any,
    limit,
    offset,
  })

  const totalPages = Math.ceil((count || 0) / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">View activity history and changes</p>
        </div>
      </div>

      <AuditLogsTable
        data={logs || []}
        page={page}
        totalPages={totalPages}
        totalCount={count || 0}
        actionLabels={ACTION_LABELS}
        resourceTypeLabels={RESOURCE_TYPE_LABELS}
      />
    </div>
  )
}
