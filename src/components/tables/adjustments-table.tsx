'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { postAdjustment, cancelAdjustment } from '@/lib/actions/adjustments'
import { formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { Adjustment } from '@/types'

const STATUS_COLORS = {
  draft: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
} as const

interface AdjustmentsTableProps {
  data: (Adjustment & {
    location?: { id: string; name: string }
  })[]
}

export function AdjustmentsTable({ data }: AdjustmentsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const { t, locale } = useTranslation()

  const REASON_LABELS: Record<string, string> = {
    damage: t('adjustments.damage'),
    shrinkage: t('adjustments.shrinkage'),
    expiry: t('adjustments.expiry'),
    correction: t('adjustments.correction'),
    sample: t('adjustments.sample'),
    count_variance: t('adjustments.countVariance'),
    other: t('adjustments.other'),
  }

  const statusLabels: Record<string, string> = {
    draft: t('common.draft'),
    completed: t('common.completed'),
    cancelled: t('common.cancelled'),
  }

  const columns: ColumnDef<AdjustmentsTableProps['data'][0]>[] = [
    {
      accessorKey: 'adjustment_number',
      header: t('adjustments.adjustmentNumber'),
      cell: ({ row }) => (
        <Link href={`/adjustments/${row.original.id}`} className="font-mono text-blue-600 hover:underline">
          {row.getValue('adjustment_number')}
        </Link>
      ),
    },
    {
      accessorKey: 'location',
      header: t('stock.location'),
      cell: ({ row }) => row.original.location?.name || '-',
    },
    {
      accessorKey: 'reason',
      header: t('adjustments.reason'),
      cell: ({ row }) => {
        const reason = row.getValue('reason') as string
        return REASON_LABELS[reason] || reason
      },
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <Badge variant={STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'secondary'}>
            {statusLabels[status] || status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: t('common.createdAt'),
      cell: ({ row }) => formatDate(row.getValue('created_at'), locale),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const adjustment = row.original

        const handlePost = async () => {
          if (!confirm(t('adjustments.confirmPost'))) return
          const result = await postAdjustment(adjustment.id)
          if (result.error) toast.error(result.error)
          else toast.success(t('toast.adjustmentPosted'))
        }

        const handleCancel = async () => {
          if (!confirm(t('dialog.cancelMessage'))) return
          const result = await cancelAdjustment(adjustment.id)
          if (result.error) toast.error(result.error)
          else toast.success(t('toast.adjustmentCancelled'))
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/adjustments/${adjustment.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('common.view')}
                </Link>
              </DropdownMenuItem>
              {adjustment.status === 'draft' && (
                <>
                  <DropdownMenuItem onClick={handlePost}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('adjustments.post')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCancel} className="text-red-600">
                    <XCircle className="mr-2 h-4 w-4" />
                    {t('common.cancel')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
  })

  return (
    <div className="space-y-4">
      <Input
        placeholder={t('adjustments.searchAdjustments')}
        value={globalFilter ?? ''}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t('adjustments.noAdjustments')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {t('common.previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}
