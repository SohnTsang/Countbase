import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UsersTable } from '@/components/tables/users-table'
import { InvitationsTable } from '@/components/tables/invitations-table'
import { InviteUserForm } from '@/components/forms/invite-user-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getTranslator } from '@/lib/i18n/server'
import { getTenantUserStats, getPendingInvitations } from '@/lib/actions/invitations'
import { getAssignableRoles } from '@/lib/actions/users'
import { Users, UserPlus, Clock, AlertTriangle } from 'lucide-react'
import type { UserRole } from '@/types'

export default async function UsersPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  // Get current user and check if admin or manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role, tenant_id')
    .eq('id', user.id)
    .single()

  // Only admins and managers can access this page
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
    redirect('/')
  }

  // Fetch all data in parallel
  const [usersRes, stats, pendingInvitations, assignableRoles] = await Promise.all([
    supabase.from('users').select('*').order('name'),
    getTenantUserStats(),
    getPendingInvitations(),
    getAssignableRoles(),
  ])

  const users = usersRes.data || []
  const canInvite = stats ? (stats.current_users + stats.pending_invitations) < stats.max_users : false
  const usagePercent = stats ? Math.round(((stats.current_users + stats.pending_invitations) / stats.max_users) * 100) : 0
  const isNearLimit = usagePercent >= 80

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
          <p className="text-gray-600">{t('users.subtitle')}</p>
        </div>

        {/* User Count Stats */}
        {stats && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6 rounded-lg border bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500" />
                <div>
                  <div className="text-xs text-gray-500">{t('users.activeUsers')}</div>
                  <div className="font-semibold">{stats.current_users}</div>
                </div>
              </div>

              {stats.pending_invitations > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <div>
                    <div className="text-xs text-gray-500">{t('users.pendingInvites')}</div>
                    <div className="font-semibold">{stats.pending_invitations}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-xs text-gray-500">{t('users.maxUsers')}</div>
                  <div className={`font-semibold ${isNearLimit ? 'text-orange-600' : ''}`}>
                    {stats.current_users + stats.pending_invitations}/{stats.max_users}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="hidden sm:block w-20">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isNearLimit ? 'bg-orange-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Limit Warning */}
      {stats && !canInvite && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <p className="text-orange-800">
              {t('users.limitReached', { max: stats.max_users })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Invite User Form */}
      {canInvite && assignableRoles.length > 0 && (
        <InviteUserForm assignableRoles={assignableRoles as UserRole[]} />
      )}

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              {t('users.pendingInvitations')} ({pendingInvitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InvitationsTable data={pendingInvitations} />
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            {t('users.currentUsers')} ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable
            data={users}
            currentUserId={currentUser.id}
            currentUserRole={currentUser.role as UserRole}
          />
        </CardContent>
      </Card>
    </div>
  )
}
