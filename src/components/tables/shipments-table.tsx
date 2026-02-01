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
import { MoreHorizontal, Eye, CheckCircle, Truck, XCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { confirmShipment, shipShipment, cancelShipment, deleteShipment } from '@/lib/actions/shipments'
import { formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { Shipment } from '@/types'

interface ShipmentsTableProps {
  data: Shipment[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export function ShipmentsTable({ data }: ShipmentsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const { t } = useTranslation()

  const statusLabels: Record<string, string> = {
    draft: t('common.draft'),
    confirmed: t('common.confirmed'),
    completed: t('common.completed'),
    cancelled: t('common.cancelled'),
  }

  const columns: ColumnDef<Shipment>[] = [
    {
      accessorKey: 'shipment_number',
      header: t('shipments.shipmentNumber'),
      cell: ({ row }) => (
        <Link
          href={`/shipments/${row.original.id}`}
          className="font-mono text-blue-600 hover:underline"
        >
          {row.getValue('shipment_number')}
        </Link>
      ),
    },
    {
      id: 'customer',
      header: t('shipments.customer'),
      cell: ({ row }) => {
        const shipment = row.original
        return shipment.customer?.name || shipment.customer_name || '-'
      },
    },
    {
      accessorKey: 'location.name',
      header: t('shipments.shipFromLocation'),
      cell: ({ row }) => row.original.location?.name,
    },
    {
      accessorKey: 'ship_date',
      header: t('shipments.shipDate'),
      cell: ({ row }) => {
        const date = row.getValue('ship_date') as string | null
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
        const shipment = row.original

        const handleConfirm = async () => {
          const result = await confirmShipment(shipment.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.shipmentConfirmed'))
          }
        }

        const handleShip = async () => {
          if (!confirm(t('shipments.confirmShip'))) return
          const result = await shipShipment(shipment.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.shipmentCompleted'))
          }
        }

        const handleCancel = async () => {
          if (!confirm(t('shipments.confirmCancel'))) return
          const result = await cancelShipment(shipment.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.shipmentCancelled'))
          }
        }

        const handleDelete = async () => {
          if (!confirm(t('shipments.confirmDelete'))) return
          const result = await deleteShipment(shipment.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.shipmentDeleted'))
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
                <Link href={`/shipments/${shipment.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('common.view')}
                </Link>
              </DropdownMenuItem>
              {shipment.status === 'draft' && (
                <DropdownMenuItem onClick={handleConfirm}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('common.confirm')}
                </DropdownMenuItem>
              )}
              {shipment.status === 'confirmed' && (
                <DropdownMenuItem onClick={handleShip}>
                  <Truck className="mr-2 h-4 w-4" />
                  {t('shipments.ship')}
                </DropdownMenuItem>
              )}
              {(shipment.status === 'draft' || shipment.status === 'confirmed') && (
                <DropdownMenuItem onClick={handleCancel} className="text-orange-600">
                  <XCircle className="mr-2 h-4 w-4" />
                  {t('common.cancel')}
                </DropdownMenuItem>
              )}
              {shipment.status === 'draft' && (
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
        placeholder={t('shipments.searchShipments')}
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
                  {t('shipments.noShipments')}
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
