'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  EyeOff,
  MoreHorizontal,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  XCircle,
  AlertCircle,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { updateErrorStatus, bulkUpdateErrorStatus, deleteErrorLog, bulkDeleteErrorLogs } from '@/lib/actions/errors'
import { ErrorDetailPanel } from '@/components/panels/error-detail-panel'
import type { ErrorLog, ErrorStatus, ErrorSeverity } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface ErrorLogsTableProps {
  errors: ErrorLog[]
  total: number
  page: number
  pageSize: number
}

const SEVERITY_CONFIG: Record<ErrorSeverity, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  fatal: { icon: XCircle, color: 'text-red-700', bg: 'bg-red-100' },
  error: { icon: AlertTriangle, color: 'text-orange-700', bg: 'bg-orange-100' },
  warning: { icon: AlertCircle, color: 'text-yellow-700', bg: 'bg-yellow-100' },
  info: { icon: Info, color: 'text-blue-700', bg: 'bg-blue-100' },
}

const STATUS_CONFIG: Record<ErrorStatus, { icon: typeof AlertTriangle; color: string; label: string }> = {
  open: { icon: AlertTriangle, color: 'text-red-600', label: 'Open' },
  investigating: { icon: Clock, color: 'text-yellow-600', label: 'Investigating' },
  resolved: { icon: CheckCircle, color: 'text-green-600', label: 'Resolved' },
  ignored: { icon: EyeOff, color: 'text-gray-500', label: 'Ignored' },
}

export function ErrorLogsTable({ errors, total, page, pageSize }: ErrorLogsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const totalPages = Math.ceil(total / pageSize)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/admin/error-logs?${params.toString()}`)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(errors.map((e) => e.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedIds(newSet)
  }

  const handleStatusChange = async (id: string, status: ErrorStatus) => {
    setIsLoading(true)
    const result = await updateErrorStatus(id, status)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Status updated to ${status}`)
      router.refresh()
    }
  }

  const handleBulkStatusChange = async (status: ErrorStatus) => {
    if (selectedIds.size === 0) return

    setIsLoading(true)
    const result = await bulkUpdateErrorStatus(Array.from(selectedIds), status)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${selectedIds.size} errors updated to ${status}`)
      setSelectedIds(new Set())
      router.refresh()
    }
  }

  const handleDelete = async (id: string) => {
    setIsLoading(true)
    const result = await deleteErrorLog(id)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Error deleted')
      router.refresh()
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    setIsLoading(true)
    const result = await bulkDeleteErrorLogs(Array.from(selectedIds))
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${selectedIds.size} errors deleted`)
      setSelectedIds(new Set())
      router.refresh()
    }
  }

  if (errors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No errors found</h3>
        <p className="text-sm text-gray-500 mt-1">
          Your application is running smoothly!
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedIds.size} selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusChange('resolved')}
                disabled={isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Resolve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusChange('ignored')}
                disabled={isLoading}
              >
                <EyeOff className="h-4 w-4 mr-1" />
                Ignore
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusChange('investigating')}
                disabled={isLoading}
              >
                <Clock className="h-4 w-4 mr-1" />
                Investigating
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.size === errors.length && errors.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead className="w-24">Severity</TableHead>
            <TableHead>Message</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-20">Count</TableHead>
            <TableHead className="w-32">Last Seen</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {errors.map((error) => {
            const severityConfig = SEVERITY_CONFIG[error.severity]
            const statusConfig = STATUS_CONFIG[error.status]
            const SeverityIcon = severityConfig.icon
            const StatusIcon = statusConfig.icon

            return (
              <TableRow
                key={error.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedError(error)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(error.id)}
                    onCheckedChange={(checked) => handleSelectOne(error.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <Badge className={`${severityConfig.bg} ${severityConfig.color} gap-1`}>
                    <SeverityIcon className="h-3 w-3" />
                    {error.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="max-w-md truncate font-mono text-sm">
                    {error.message}
                  </div>
                  {error.url && (
                    <div className="text-xs text-gray-500 truncate max-w-md">
                      {error.url}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {error.error_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{error.occurrence_count}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(error.last_seen_at), { addSuffix: true })}
                  </span>
                </TableCell>
                <TableCell>
                  <div className={`flex items-center gap-1 ${statusConfig.color}`}>
                    <StatusIcon className="h-4 w-4" />
                    <span className="text-sm">{statusConfig.label}</span>
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedError(error)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleStatusChange(error.id, 'open')}>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Mark as Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(error.id, 'investigating')}>
                        <Clock className="h-4 w-4 mr-2" />
                        Mark as Investigating
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(error.id, 'resolved')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Resolved
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(error.id, 'ignored')}>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Mark as Ignored
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(error.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
        <div className="text-sm text-gray-500">
          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Detail Panel */}
      <ErrorDetailPanel
        error={selectedError}
        onClose={() => setSelectedError(null)}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />
    </>
  )
}
