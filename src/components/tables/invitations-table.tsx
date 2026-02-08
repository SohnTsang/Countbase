'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { MoreHorizontal, RefreshCw, Trash2, Mail, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { resendInvitation, cancelInvitation } from '@/lib/actions/invitations'
import { useTranslation } from '@/lib/i18n'
import type { UserInvitation, UserRole } from '@/types'

interface InvitationsTableProps {
  data: UserInvitation[]
}

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  staff: 'bg-green-100 text-green-800',
  readonly: 'bg-gray-100 text-gray-800',
}

export function InvitationsTable({ data }: InvitationsTableProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const roleLabels: Record<UserRole, string> = {
    admin: t('users.roleDescAdmin'),
    manager: t('users.roleDescManager'),
    staff: t('users.roleDescStaff'),
    readonly: t('users.roleDescReadonly'),
  }

  const handleResend = async (id: string) => {
    setLoadingId(id)
    try {
      const result = await resendInvitation(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(t('toast.invitationResent'))
        router.refresh()
      }
    } finally {
      setLoadingId(null)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm(t('users.confirmCancelInvitation'))) return

    setLoadingId(id)
    try {
      const result = await cancelInvitation(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(t('toast.invitationCancelled'))
        router.refresh()
      }
    } finally {
      setLoadingId(null)
    }
  }

  if (data.length === 0) {
    return null
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('users.email')}</TableHead>
            <TableHead>{t('users.role')}</TableHead>
            <TableHead>{t('users.invitedBy')}</TableHead>
            <TableHead>{t('users.expires')}</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((invitation) => {
            const isExpired = new Date(invitation.expires_at) < new Date()
            const isLoading = loadingId === invitation.id

            return (
              <TableRow key={invitation.id} className={isExpired ? 'opacity-50' : ''}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{invitation.email}</span>
                    {isExpired && (
                      <Badge variant="outline" className="text-red-600 border-red-200">
                        {t('users.expired')}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={roleColors[invitation.role]}>
                    {roleLabels[invitation.role]}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-500">
                  {invitation.invited_by_name || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={isLoading}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleResend(invitation.id)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('users.resendInvitation')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCancel(invitation.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('users.cancelInvitation')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
