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
import { MoreHorizontal, Eye, Send, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { sendTransfer, receiveTransfer, cancelTransfer } from '@/lib/actions/transfers'
import { formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { Transfer } from '@/types'

const STATUS_COLORS = {
  draft: 'secondary',
  confirmed: 'default',
  completed: 'default',
  cancelled: 'destructive',
} as const

interface TransfersTableProps {
  data: (Transfer & {
    from_location?: { id: string; name: string }
    to_location?: { id: string; name: string }
  })[]
}

export function TransfersTable({ data }: TransfersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const { t } = useTranslation()

  const columns: ColumnDef<TransfersTableProps['data'][0]>[] = [
    {
      accessorKey: 'transfer_number',
      header: t('transfers.transferNumber'),
      cell: ({ row }) => (
        <Link href={`/transfers/${row.original.id}`} className="font-mono text-blue-600 hover:underline">
          {row.getValue('transfer_number')}
        </Link>
      ),
    },
    {
      accessorKey: 'from_location',
      header: t('transfers.fromLocation'),
      cell: ({ row }) => row.original.from_location?.name || '-',
    },
    {
      accessorKey: 'to_location',
      header: t('transfers.toLocation'),
      cell: ({ row }) => row.original.to_location?.name || '-',
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const statusLabels: Record<string, string> = {
          draft: t('common.draft'),
          confirmed: t('common.confirmed'),
          completed: t('common.completed'),
          cancelled: t('common.cancelled'),
        }
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
      cell: ({ row }) => formatDate(row.getValue('created_at')),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const transfer = row.original

        const handleSend = async () => {
          if (!confirm(t('transfers.confirmSend'))) return
          const result = await sendTransfer(transfer.id)
          if (result.error) toast.error(result.error)
          else toast.success(t('toast.transferSent'))
        }

        const handleReceive = async () => {
          if (!confirm(t('transfers.confirmReceive'))) return
          const result = await receiveTransfer(transfer.id)
          if (result.error) toast.error(result.error)
          else toast.success(t('toast.transferReceived'))
        }

        const handleCancel = async () => {
          if (!confirm(t('dialog.cancelMessage'))) return
          const result = await cancelTransfer(transfer.id)
          if (result.error) toast.error(result.error)
          else toast.success(t('transfers.transferCancelled'))
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
                <Link href={`/transfers/${transfer.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('common.view')}
                </Link>
              </DropdownMenuItem>
              {transfer.status === 'draft' && (
                <>
                  <DropdownMenuItem onClick={handleSend}>
                    <Send className="mr-2 h-4 w-4" />
                    {t('transfers.send')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCancel} className="text-red-600">
                    <XCircle className="mr-2 h-4 w-4" />
                    {t('common.cancel')}
                  </DropdownMenuItem>
                </>
              )}
              {transfer.status === 'confirmed' && (
                <DropdownMenuItem onClick={handleReceive}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('transfers.receive')}
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
        placeholder={t('transfers.searchTransfers')}
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
                  {t('transfers.noTransfers')}
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
