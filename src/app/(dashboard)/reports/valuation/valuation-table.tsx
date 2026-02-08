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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'

export interface ValuationData {
  id: string
  product_id: string
  location_id: string
  qty_on_hand: number
  avg_cost: number
  inventory_value: number
  lot_number: string | null
  expiry_date: string | null
  product: {
    sku: string
    name: string
    base_uom: string
    category_id: string | null
  } | null
  location: {
    name: string
  } | null
}

interface ValuationTableProps {
  data: ValuationData[]
  locations: { id: string; name: string }[]
  currency?: string
}

export function ValuationTable({ data, locations, currency = 'USD' }: ValuationTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const { t, locale } = useTranslation()

  const filteredData = useMemo(() => {
    if (locationFilter === 'all') return data
    return data.filter((item) => item.location_id === locationFilter)
  }, [data, locationFilter])

  const columns: ColumnDef<ValuationData>[] = useMemo(
    () => [
      {
        accessorKey: 'product.sku',
        header: t('products.sku'),
        cell: ({ row }) => (
          <span className="font-mono">{row.original.product?.sku}</span>
        ),
      },
      {
        accessorKey: 'product.name',
        header: t('products.product'),
        cell: ({ row }) => row.original.product?.name,
      },
      {
        accessorKey: 'location.name',
        header: t('stock.location'),
        cell: ({ row }) => row.original.location?.name,
      },
      {
        accessorKey: 'qty_on_hand',
        header: t('common.quantity'),
        cell: ({ row }) => (
          <span>
            {row.original.qty_on_hand} {t(`uom.${row.original.product?.base_uom}`)}
          </span>
        ),
      },
      {
        accessorKey: 'avg_cost',
        header: t('reports.avgCost'),
        cell: ({ row }) => formatCurrency(row.original.avg_cost, currency, locale),
      },
      {
        accessorKey: 'inventory_value',
        header: t('reports.totalValue'),
        cell: ({ row }) => (
          <span className="font-medium">
            {formatCurrency(row.original.inventory_value, currency, locale)}
          </span>
        ),
      },
    ],
    [t, locale, currency]
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
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('reports.filterByLocation')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('reports.allLocations')}</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
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
                  {t('reports.noInventory')}
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
