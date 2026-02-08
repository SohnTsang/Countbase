'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteTenant } from '@/lib/actions/tenants'

interface DeleteTenantButtonProps {
  tenantId: string
  tenantName: string
}

export function DeleteTenantButton({ tenantId, tenantName }: DeleteTenantButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmStep, setConfirmStep] = useState(1)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleClose = () => {
    setOpen(false)
    setConfirmStep(1)
    setConfirmText('')
  }

  const handleFirstConfirm = () => {
    setConfirmStep(2)
  }

  const handleDelete = async () => {
    if (confirmText !== tenantName) return

    setIsDeleting(true)
    try {
      const result = await deleteTenant(tenantId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Organization "${tenantName}" has been deleted`)
        router.push('/admin/tenants')
      }
    } finally {
      setIsDeleting(false)
      handleClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Remove Organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        {confirmStep === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Remove Organization</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove <strong>{tenantName}</strong>? This will permanently delete the organization, all its users, and all associated data. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleFirstConfirm}>
                Yes, I want to remove it
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Final Confirmation</DialogTitle>
              <DialogDescription>
                To confirm deletion, type the organization name below:
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Type <strong className="text-red-600">{tenantName}</strong> to confirm
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={tenantName}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={confirmText !== tenantName || isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
