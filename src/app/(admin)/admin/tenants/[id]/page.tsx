import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTenantDetails } from '@/lib/actions/tenants'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Building2,
  Users,
  Clock,
  Edit,
  UserPlus,
  Mail,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { TenantInviteForm } from '@/components/forms/tenant-invite-form'
import { TenantInvitationActions } from '@/components/admin/tenant-invitation-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  staff: 'bg-green-100 text-green-800',
  readonly: 'bg-gray-100 text-gray-800',
}

export default async function TenantDetailPage({ params }: PageProps) {
  const { id } = await params
  const { tenant, users, invitations, error } = await getTenantDetails(id)

  if (error || !tenant) {
    notFound()
  }

  const activeUsers = users.filter((u) => u.active)
  const pendingInvitations = invitations.filter(
    (i) => !i.accepted_at && new Date(i.expires_at) > new Date()
  )
  const usagePercent = Math.round(
    ((activeUsers.length + pendingInvitations.length) / tenant.max_users) * 100
  )
  const isNearLimit = usagePercent >= 80
  const canInviteMore = activeUsers.length + pendingInvitations.length < tenant.max_users

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/tenants">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Building2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-sm text-gray-500">ID: {tenant.id}</p>
            </div>
          </div>
        </div>
        <Link href={`/admin/tenants/${tenant.id}/edit`}>
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Users</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Invites</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvitations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Max Users</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant.max_users}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isNearLimit ? 'text-orange-600' : ''}`}>
              {usagePercent}%
            </div>
            <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isNearLimit ? 'bg-orange-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite New User */}
      {canInviteMore && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invite New User</CardTitle>
            <CardDescription>
              Send an invitation to add a new user to this organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TenantInviteForm tenantId={tenant.id} />
          </CardContent>
        </Card>
      )}

      {!canInviteMore && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-4">
            <p className="text-orange-800">
              This organization has reached its user limit ({tenant.max_users}).
              Edit the organization to increase the limit.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {invitation.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleColors[invitation.role]}>
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {invitation.invited_by_name || 'System'}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <TenantInvitationActions
                        invitationId={invitation.id}
                        tenantId={tenant.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No users yet. Invite the first admin above.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-gray-500">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role]}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.active ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <XCircle className="h-4 w-4" />
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
