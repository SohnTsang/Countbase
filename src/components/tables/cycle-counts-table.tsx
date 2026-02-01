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
import { postCycleCount, cancelCycleCount, deleteCycleCount } from '@/lib/actions/cycle-counts'
import { formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { CycleCount } from '@/types'

interface CycleCountsTableProps {
  data: CycleCount[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export function CycleCountsTable({ data }: CycleCountsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const { t } = useTranslation()

  const statusLabels: Record<string, string> = {
    draft: t('common.draft'),
    completed: t('common.completed'),
    cancelled: t('common.cancelled'),
  }

  const columns: ColumnDef<CycleCount>[] = [
    {
      accessorKey: 'count_number',
      header: t('cycleCounts.countNumber'),
      cell: ({ row }) => (
        <Link
          href={`/cycle-counts/${row.original.id}`}
          className="font-mono text-blue-600 hover:underline"
        >
          {row.getValue('count_number')}
        </Link>
      ),
    },
    {
      accessorKey: 'location.name',
      header: t('stock.location'),
      cell: ({ row }) => row.original.location?.name,
    },
    {
      accessorKey: 'count_date',
      header: t('cycleCounts.countDate'),
      cell: ({ row }) => formatDate(row.getValue('count_date')),
    },
    {
      id: 'lines_count',
      header: t('cycleCounts.items'),
      cell: ({ row }) => row.original.lines?.length || 0,
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
        const count = row.original

        const handlePost = async () => {
          if (!confirm(t('cycleCounts.confirmPost'))) return
          const result = await postCycleCount(count.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.cycleCountPosted'))
          }
        }

        const handleCancel = async () => {
          if (!confirm(t('cycleCounts.confirmCancel'))) return
          const result = await cancelCycleCount(count.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.cycleCountCancelled'))
          }
        }

        const handleDelete = async () => {
          if (!confirm(t('cycleCounts.confirmDelete'))) return
          const result = await deleteCycleCount(count.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.cycleCountDeleted'))
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
                <Link href={`/cycle-counts/${count.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('cycleCounts.viewCount')}
                </Link>
              </DropdownMenuItem>
              {count.status === 'draft' && (
                <>
                  <DropdownMenuItem onClick={handlePost}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('cycleCounts.post')}
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
        placeholder={t('cycleCounts.searchCounts')}
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
                  {t('cycleCounts.noCycleCounts')}
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
