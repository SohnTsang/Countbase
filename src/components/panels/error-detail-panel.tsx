'use client'

import { Fragment, useState } from 'react'
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  EyeOff,
  Copy,
  ExternalLink,
  Trash2,
  XCircle,
  AlertCircle,
  Info,
  User,
  Globe,
  Server,
  Calendar,
  Hash,
} from 'lucide-react'
import { toast } from 'sonner'
import { updateErrorStatus } from '@/lib/actions/errors'
import type { ErrorLog, ErrorStatus, ErrorSeverity } from '@/types'
import { format } from 'date-fns'

interface ErrorDetailPanelProps {
  error: ErrorLog | null
  onClose: () => void
  onStatusChange: (id: string, status: ErrorStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const SEVERITY_CONFIG: Record<ErrorSeverity, { icon: typeof AlertTriangle; color: string; bg: string; label: string }> = {
  fatal: { icon: XCircle, color: 'text-red-700', bg: 'bg-red-100', label: 'Fatal' },
  error: { icon: AlertTriangle, color: 'text-orange-700', bg: 'bg-orange-100', label: 'Error' },
  warning: { icon: AlertCircle, color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Warning' },
  info: { icon: Info, color: 'text-blue-700', bg: 'bg-blue-100', label: 'Info' },
}

const STATUS_CONFIG: Record<ErrorStatus, { icon: typeof AlertTriangle; color: string; bg: string; label: string }> = {
  open: { icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-100', label: 'Open' },
  investigating: { icon: Clock, color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Investigating' },
  resolved: { icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-100', label: 'Resolved' },
  ignored: { icon: EyeOff, color: 'text-gray-700', bg: 'bg-gray-100', label: 'Ignored' },
}

export function ErrorDetailPanel({ error, onClose, onStatusChange, onDelete }: ErrorDetailPanelProps) {
  const [resolutionNote, setResolutionNote] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  if (!error) return null

  const severityConfig = SEVERITY_CONFIG[error.severity]
  const statusConfig = STATUS_CONFIG[error.status]
  const SeverityIcon = severityConfig.icon
  const StatusIcon = statusConfig.icon

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const handleStatusUpdate = async (status: ErrorStatus) => {
    setIsUpdating(true)
    await updateErrorStatus(error.id, status, status === 'resolved' ? resolutionNote : undefined)
    setIsUpdating(false)
    onClose()
    toast.success(`Status updated to ${status}`)
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this error log?')) {
      await onDelete(error.id)
      onClose()
    }
  }

  return (
    <Transition show={!!error} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <TransitionChild
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <DialogPanel className="pointer-events-auto w-screen max-w-2xl">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                    {/* Header */}
                    <div className="border-b border-gray-200 px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`${severityConfig.bg} ${severityConfig.color} gap-1`}>
                              <SeverityIcon className="h-3 w-3" />
                              {severityConfig.label}
                            </Badge>
                            <Badge className={`${statusConfig.bg} ${statusConfig.color} gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {error.error_type}
                            </Badge>
                          </div>
                          <h2 className="text-lg font-semibold text-gray-900 break-words">
                            {error.message}
                          </h2>
                        </div>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-500"
                          onClick={onClose}
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-6 py-4 space-y-6">
                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <Hash className="h-4 w-4" />
                            Occurrence Count
                          </div>
                          <div className="text-2xl font-bold">{error.occurrence_count}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <Calendar className="h-4 w-4" />
                            Last Seen
                          </div>
                          <div className="text-sm font-medium">
                            {format(new Date(error.last_seen_at), 'PPpp')}
                          </div>
                        </div>
                      </div>

                      {/* Context */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Context</h3>

                        {error.url && (
                          <div className="flex items-start gap-3">
                            <Globe className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-500 mb-1">URL</div>
                              <div className="flex items-center gap-2">
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded truncate flex-1">
                                  {error.url}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(error.url!, 'URL')}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {error.user && (
                          <div className="flex items-start gap-3">
                            <User className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div>
                              <div className="text-xs text-gray-500 mb-1">User</div>
                              <div className="text-sm">
                                {error.user.name} ({error.user.email})
                              </div>
                            </div>
                          </div>
                        )}

                        {error.tenant && (
                          <div className="flex items-start gap-3">
                            <Server className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Tenant</div>
                              <div className="text-sm">{error.tenant.name}</div>
                            </div>
                          </div>
                        )}

                        {error.user_agent && (
                          <div className="flex items-start gap-3">
                            <Globe className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-500 mb-1">User Agent</div>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded block truncate">
                                {error.user_agent}
                              </code>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stack Trace */}
                      {error.stack_trace && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900">Stack Trace</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(error.stack_trace!, 'Stack trace')}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                            {error.stack_trace}
                          </pre>
                        </div>
                      )}

                      {/* Metadata */}
                      {error.metadata && Object.keys(error.metadata).length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold text-gray-900">Metadata</h3>
                          <pre className="text-xs bg-gray-100 p-4 rounded-lg overflow-x-auto">
                            {JSON.stringify(error.metadata, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Resolution */}
                      {error.status !== 'resolved' && error.status !== 'ignored' && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-gray-900">Resolution</h3>
                          <div>
                            <Label htmlFor="resolution-note" className="text-sm">
                              Add a note (optional)
                            </Label>
                            <Textarea
                              id="resolution-note"
                              placeholder="Describe how this was resolved..."
                              value={resolutionNote}
                              onChange={(e) => setResolutionNote(e.target.value)}
                              rows={3}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}

                      {/* Resolution Info */}
                      {(error.status === 'resolved' || error.status === 'ignored') && error.resolver && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-green-800 mb-2">Resolution Info</h3>
                          <div className="text-sm text-green-700">
                            <p>
                              <strong>Resolved by:</strong> {error.resolver.name}
                            </p>
                            {error.resolved_at && (
                              <p>
                                <strong>Resolved at:</strong> {format(new Date(error.resolved_at), 'PPpp')}
                              </p>
                            )}
                            {error.resolution_note && (
                              <p className="mt-2">
                                <strong>Note:</strong> {error.resolution_note}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="border-t pt-4 space-y-2 text-sm text-gray-500">
                        <div>
                          <strong>First seen:</strong> {format(new Date(error.first_seen_at), 'PPpp')}
                        </div>
                        <div>
                          <strong>Created:</strong> {format(new Date(error.created_at), 'PPpp')}
                        </div>
                        {error.ip_address && (
                          <div>
                            <strong>IP Address:</strong> {error.ip_address}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-gray-200 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDelete}
                          disabled={isUpdating}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                        <div className="flex gap-2">
                          {error.status !== 'open' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate('open')}
                              disabled={isUpdating}
                            >
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Reopen
                            </Button>
                          )}
                          {error.status !== 'investigating' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate('investigating')}
                              disabled={isUpdating}
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Investigating
                            </Button>
                          )}
                          {error.status !== 'resolved' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate('resolved')}
                              disabled={isUpdating}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                          )}
                          {error.status !== 'ignored' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate('ignored')}
                              disabled={isUpdating}
                            >
                              <EyeOff className="h-4 w-4 mr-1" />
                              Ignore
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
