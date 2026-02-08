'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { MoreHorizontal, RefreshCw, Trash2, Link } from 'lucide-react'
import { resendTenantInvitation, cancelTenantInvitation } from '@/lib/actions/tenants'

interface TenantInvitationActionsProps {
  invitationId: string
  tenantId: string
  token: string
}

export function TenantInvitationActions({
  invitationId,
  tenantId,
  token,
}: TenantInvitationActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/invite/accept?token=${token}`
    await navigator.clipboard.writeText(link)
    toast.success('Invite link copied to clipboard')
  }

  const handleResend = async () => {
    setIsLoading(true)
    try {
      const result = await resendTenantInvitation(invitationId, tenantId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Invitation resent successfully')
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return

    setIsLoading(true)
    try {
      const result = await cancelTenantInvitation(invitationId, tenantId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Invitation cancelled')
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isLoading}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyLink}>
          <Link className="mr-2 h-4 w-4" />
          Copy Invite Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleResend}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Resend Invitation
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCancel} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Cancel Invitation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
