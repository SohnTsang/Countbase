'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import type { AuditLog, AuditAction, AuditResourceType } from '@/types'

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-purple-100 text-purple-800',
  logout: 'bg-gray-100 text-gray-800',
  confirm: 'bg-teal-100 text-teal-800',
  cancel: 'bg-orange-100 text-orange-800',
  receive: 'bg-emerald-100 text-emerald-800',
  ship: 'bg-indigo-100 text-indigo-800',
  transfer: 'bg-cyan-100 text-cyan-800',
  adjust: 'bg-yellow-100 text-yellow-800',
  count: 'bg-pink-100 text-pink-800',
  return: 'bg-lime-100 text-lime-800',
  approve: 'bg-violet-100 text-violet-800',
}

interface AuditLogsTableProps {
  data: AuditLog[]
  page: number
  totalPages: number
  totalCount: number
  actionLabels: Record<AuditAction, string>
  resourceTypeLabels: Record<AuditResourceType, string>
}

export function AuditLogsTable({
  data,
  page,
  totalPages,
  totalCount,
  actionLabels,
  resourceTypeLabels,
}: AuditLogsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const { t, locale } = useTranslation()

  // Map app locales to Intl locale codes
  const localeMap: Record<string, string> = {
    en: 'en-US',
    ja: 'ja-JP',
    es: 'es-ES',
    zh: 'zh-CN',
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`/settings/audit-logs?${params.toString()}`)
  }

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // Reset to page 1
    router.push(`/settings/audit-logs?${params.toString()}`)
  }

  const formatDate = (dateString: string) => {
    const intlLocale = localeMap[locale] || 'en-US'
    return new Date(dateString).toLocaleString(intlLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="w-48">
          <Select
            value={searchParams.get('action') || 'all'}
            onValueChange={(value) => handleFilterChange('action', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('auditLogs.filterByAction')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('auditLogs.allActions')}</SelectItem>
              {Object.entries(actionLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Select
            value={searchParams.get('resourceType') || 'all'}
            onValueChange={(value) => handleFilterChange('resourceType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('auditLogs.filterByType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('auditLogs.allTypes')}</SelectItem>
              {Object.entries(resourceTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('auditLogs.dateTime')}</TableHead>
              <TableHead>{t('auditLogs.user')}</TableHead>
              <TableHead>{t('auditLogs.action')}</TableHead>
              <TableHead>{t('auditLogs.resourceType')}</TableHead>
              <TableHead>{t('auditLogs.resource')}</TableHead>
              <TableHead>{t('auditLogs.notes')}</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t('auditLogs.noLogs')}
                </TableCell>
              </TableRow>
            ) : (
              data.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{log.user_name || t('common.system')}</div>
                      <div className="text-gray-500 text-xs">{log.user_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}>
                      {actionLabels[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {resourceTypeLabels[log.resource_type] || log.resource_type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{log.resource_name || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500 line-clamp-1">
                      {log.notes || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {t('pagination.showing')} {data.length} {t('pagination.of')} {totalCount} {t('pagination.entries')}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('common.previous')}
          </Button>
          <span className="text-sm text-gray-500">
            {t('pagination.page')} {page} {t('pagination.of')} {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            {t('common.next')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('auditLogs.details')}</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('auditLogs.dateTime')}</label>
                  <p className="text-sm">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('auditLogs.user')}</label>
                  <p className="text-sm">{selectedLog.user_name || t('common.system')}</p>
                  <p className="text-xs text-gray-500">{selectedLog.user_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('auditLogs.action')}</label>
                  <div className="mt-1">
                    <Badge className={ACTION_COLORS[selectedLog.action] || ''}>
                      {actionLabels[selectedLog.action] || selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('auditLogs.resource')}</label>
                  <p className="text-sm">
                    {resourceTypeLabels[selectedLog.resource_type] || selectedLog.resource_type}
                    {selectedLog.resource_name && ` - ${selectedLog.resource_name}`}
                  </p>
                </div>
              </div>

              {selectedLog.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('auditLogs.notes')}</label>
                  <p className="text-sm">{selectedLog.notes}</p>
                </div>
              )}

              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">{t('auditLogs.changes')}</label>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">{t('auditLogs.field')}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('auditLogs.oldValue')}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('auditLogs.newValue')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedLog.changes as Record<string, { old: unknown; new: unknown }>).map(([key, value]) => (
                          <tr key={key} className="border-t">
                            <td className="px-3 py-2 font-medium">{key}</td>
                            <td className="px-3 py-2 text-red-600">
                              {JSON.stringify(value.old)}
                            </td>
                            <td className="px-3 py-2 text-green-600">
                              {JSON.stringify(value.new)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedLog.old_values && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">{t('auditLogs.oldValues')}</label>
                  <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">{t('auditLogs.newValues')}</label>
                  <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
