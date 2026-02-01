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
import { MoreHorizontal, Eye, Package, XCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { confirmPurchaseOrder, cancelPurchaseOrder, deletePurchaseOrder } from '@/lib/actions/purchase-orders'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { PurchaseOrder } from '@/types'

interface PurchaseOrdersTableProps {
  data: PurchaseOrder[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export function PurchaseOrdersTable({ data }: PurchaseOrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const { t } = useTranslation()

  const statusLabels: Record<string, string> = {
    draft: t('common.draft'),
    confirmed: t('common.confirmed'),
    partial: t('common.partial'),
    completed: t('common.completed'),
    cancelled: t('common.cancelled'),
  }

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: 'po_number',
      header: t('purchaseOrders.poNumber'),
      cell: ({ row }) => (
        <Link
          href={`/purchase-orders/${row.original.id}`}
          className="font-mono text-blue-600 hover:underline"
        >
          {row.getValue('po_number')}
        </Link>
      ),
    },
    {
      accessorKey: 'supplier.name',
      header: t('purchaseOrders.supplier'),
      cell: ({ row }) => row.original.supplier?.name,
    },
    {
      accessorKey: 'location.name',
      header: t('stock.location'),
      cell: ({ row }) => row.original.location?.name,
    },
    {
      accessorKey: 'order_date',
      header: t('purchaseOrders.orderDate'),
      cell: ({ row }) => formatDate(row.getValue('order_date')),
    },
    {
      accessorKey: 'expected_date',
      header: t('purchaseOrders.expectedDate'),
      cell: ({ row }) => {
        const date = row.getValue('expected_date') as string | null
        return date ? formatDate(date) : '-'
      },
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
        const po = row.original

        const handleConfirm = async () => {
          const result = await confirmPurchaseOrder(po.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.poConfirmed'))
          }
        }

        const handleCancel = async () => {
          if (!confirm(t('purchaseOrders.confirmCancel'))) return
          const result = await cancelPurchaseOrder(po.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.poCancelled'))
          }
        }

        const handleDelete = async () => {
          if (!confirm(t('purchaseOrders.confirmDelete'))) return
          const result = await deletePurchaseOrder(po.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.poDeleted'))
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
                <Link href={`/purchase-orders/${po.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('common.view')}
                </Link>
              </DropdownMenuItem>
              {po.status === 'draft' && (
                <DropdownMenuItem onClick={handleConfirm}>
                  <Package className="mr-2 h-4 w-4" />
                  {t('common.confirm')}
                </DropdownMenuItem>
              )}
              {(po.status === 'confirmed' || po.status === 'partial') && (
                <DropdownMenuItem asChild>
                  <Link href={`/purchase-orders/${po.id}/receive`}>
                    <Package className="mr-2 h-4 w-4" />
                    {t('purchaseOrders.receive')}
                  </Link>
                </DropdownMenuItem>
              )}
              {(po.status === 'draft' || po.status === 'confirmed') && (
                <DropdownMenuItem onClick={handleCancel} className="text-orange-600">
                  <XCircle className="mr-2 h-4 w-4" />
                  {t('common.cancel')}
                </DropdownMenuItem>
              )}
              {po.status === 'draft' && (
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('common.delete')}
                </DropdownMenuItem>
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
        placeholder={t('purchaseOrders.searchPOs')}
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
                  {t('purchaseOrders.noPOs')}
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
