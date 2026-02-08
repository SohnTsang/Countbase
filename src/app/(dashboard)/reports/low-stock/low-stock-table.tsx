'use client'

import { useState, useMemo } from 'react'
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
import { useTranslation } from '@/lib/i18n'

export interface LowStockData {
  id: string
  sku: string
  name: string
  base_uom: string
  reorder_point: number
  reorder_qty: number
  current_cost: number
  category_id: string | null
  category_name: string | null
  total_on_hand: number
}

interface LowStockTableProps {
  data: LowStockData[]
  categories: { id: string; name: string }[]
}

export function LowStockTable({ data, categories }: LowStockTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { t } = useTranslation()

  const filteredData = useMemo(() => {
    let result = data

    if (categoryFilter !== 'all') {
      result = result.filter((item) => item.category_id === categoryFilter)
    }

    if (statusFilter === 'out_of_stock') {
      result = result.filter((item) => item.total_on_hand === 0)
    } else if (statusFilter === 'low') {
      result = result.filter((item) => item.total_on_hand > 0)
    }

    return result
  }, [data, categoryFilter, statusFilter])

  const columns: ColumnDef<LowStockData>[] = useMemo(
    () => [
      {
        accessorKey: 'sku',
        header: t('products.sku'),
        cell: ({ row }) => <span className="font-mono">{row.original.sku}</span>,
      },
      {
        accessorKey: 'name',
        header: t('products.product'),
      },
      {
        accessorKey: 'category_name',
        header: t('products.category'),
        cell: ({ row }) => row.original.category_name || '-',
      },
      {
        accessorKey: 'base_uom',
        header: t('reports.unit'),
        cell: ({ row }) => t(`uom.${row.original.base_uom}`),
      },
      {
        accessorKey: 'total_on_hand',
        header: t('reports.onHand'),
        cell: ({ row }) => row.original.total_on_hand,
      },
      {
        accessorKey: 'reorder_point',
        header: t('reports.reorderPoint'),
      },
      {
        accessorKey: 'reorder_qty',
        header: t('reports.reorderQty'),
      },
      {
        id: 'status',
        header: t('common.status'),
        cell: ({ row }) => {
          const item = row.original
          const shortage = item.reorder_point - item.total_on_hand

          return (
            <Badge variant={item.total_on_hand === 0 ? 'destructive' : 'default'}>
              {item.total_on_hand === 0
                ? t('reports.outOfStock')
                : `${t('reports.short')} ${shortage}`}
            </Badge>
          )
        },
      },
    ],
    [t]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
    initialState: {
      pagination: { pageSize: 15 },
    },
  })

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder={t('reports.search')}
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('reports.filterByCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('reports.allCategories')}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('common.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('reports.allStatus')}</SelectItem>
            <SelectItem value="out_of_stock">{t('reports.statusOutOfStock')}</SelectItem>
            <SelectItem value="low">{t('reports.statusLow')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
                  {t('reports.allProductsAboveReorderPoint')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('table.showing')} {table.getRowModel().rows.length} {t('table.of')}{' '}
          {filteredData.length} {t('table.entries')}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t('common.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('table.page')} {table.getState().pagination.pageIndex + 1} {t('table.of')}{' '}
            {table.getPageCount() || 1}
          </span>
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
    </div>
  )
}
