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
import { MoreHorizontal, Eye, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { processReturn, cancelReturn, deleteReturn } from '@/lib/actions/returns'
import { formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { Return } from '@/types'

interface ReturnsTableProps {
  data: Return[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const typeColors: Record<string, string> = {
  customer: 'bg-blue-100 text-blue-800',
  supplier: 'bg-purple-100 text-purple-800',
}

export function ReturnsTable({ data }: ReturnsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const { t, locale } = useTranslation()

  const statusLabels: Record<string, string> = {
    draft: t('common.draft'),
    completed: t('common.completed'),
    cancelled: t('common.cancelled'),
  }

  const typeLabels: Record<string, string> = {
    customer: t('returns.fromCustomer'),
    supplier: t('returns.toSupplier'),
  }

  const columns: ColumnDef<Return>[] = [
    {
      accessorKey: 'return_number',
      header: t('returns.returnNumber'),
      cell: ({ row }) => (
        <Link
          href={`/returns/${row.original.id}`}
          className="font-mono text-blue-600 hover:underline"
        >
          {row.getValue('return_number')}
        </Link>
      ),
    },
    {
      accessorKey: 'return_type',
      header: t('returns.returnType'),
      cell: ({ row }) => {
        const type = row.getValue('return_type') as string
        return (
          <Badge className={typeColors[type] || ''}>
            {typeLabels[type] || type}
          </Badge>
        )
      },
    },
    {
      id: 'partner',
      header: t('returns.partner'),
      cell: ({ row }) => row.original.partner_name || '-',
    },
    {
      accessorKey: 'location.name',
      header: t('stock.location'),
      cell: ({ row }) => row.original.location?.name,
    },
    {
      id: 'totalQty',
      header: t('returns.totalQty'),
      cell: ({ row }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lines = (row.original as any).lines as { qty: number }[] | undefined
        const totalQty = lines?.reduce((sum, line) => sum + (line.qty || 0), 0) || 0
        return totalQty
      },
    },
    {
      accessorKey: 'reason',
      header: t('returns.reason'),
      cell: ({ row }) => row.getValue('reason') || '-',
    },
    {
      accessorKey: 'created_at',
      header: t('common.createdAt'),
      cell: ({ row }) => formatDate(row.getValue('created_at'), locale),
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <Badge className={statusColors[status] || ''}>
            {statusLabels[status] || status}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => {
        const returnDoc = row.original

        const handleProcess = async () => {
          if (!confirm(t('returns.confirmProcess'))) return
          const result = await processReturn(returnDoc.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.returnProcessed'))
          }
        }

        const handleCancel = async () => {
          if (!confirm(t('returns.confirmCancel'))) return
          const result = await cancelReturn(returnDoc.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.returnCancelled'))
          }
        }

        const handleDelete = async () => {
          if (!confirm(t('returns.confirmDelete'))) return
          const result = await deleteReturn(returnDoc.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.returnDeleted'))
          }
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
                <Link href={`/returns/${returnDoc.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('common.view')}
                </Link>
              </DropdownMenuItem>
              {returnDoc.status === 'draft' && (
                <>
                  <DropdownMenuItem onClick={handleProcess}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('returns.process')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCancel} className="text-orange-600">
                    <XCircle className="mr-2 h-4 w-4" />
                    {t('common.cancel')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('common.delete')}
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
        placeholder={t('returns.searchReturns')}
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
                  {t('returns.noReturns')}
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
