'use client'

import { useState } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { InventoryBalance, Location } from '@/types'

interface StockTableProps {
  data: InventoryBalance[]
  locations: Pick<Location, 'id' | 'name'>[]
}

export function StockTable({ data, locations }: StockTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const { t } = useTranslation()

  const filteredData = locationFilter === 'all'
    ? data
    : data.filter(item => item.location_id === locationFilter)

  const columns: ColumnDef<InventoryBalance>[] = [
    {
      accessorKey: 'product.sku',
      header: t('products.sku'),
      cell: ({ row }) => (
        <span className="font-mono">{row.original.product?.sku}</span>
      ),
    },
    {
      accessorKey: 'product.name',
      header: t('stock.product'),
      cell: ({ row }) => row.original.product?.name,
    },
    {
      accessorKey: 'location.name',
      header: t('stock.location'),
      cell: ({ row }) => row.original.location?.name,
    },
    {
      accessorKey: 'lot_number',
      header: t('stock.lotNumber'),
      cell: ({ row }) => row.getValue('lot_number') || '-',
    },
    {
      accessorKey: 'expiry_date',
      header: t('stock.expiryDate'),
      cell: ({ row }) => {
        const expiry = row.getValue('expiry_date') as string | null
        if (!expiry) return '-'

        const expiryDate = new Date(expiry)
        const today = new Date()
        const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        return (
          <div className="flex items-center gap-2">
            <span>{formatDate(expiry)}</span>
            {daysLeft <= 0 && (
              <Badge variant="destructive">{t('stock.expired')}</Badge>
            )}
            {daysLeft > 0 && daysLeft <= 30 && (
              <Badge variant="secondary">{daysLeft}d</Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'qty_on_hand',
      header: t('stock.qtyOnHand'),
      cell: ({ row }) => {
        const qty = row.getValue('qty_on_hand') as number
        const product = row.original.product
        const isLowStock = product?.reorder_point && qty <= product.reorder_point

        return (
          <div className="flex items-center gap-2">
            <span className={isLowStock ? 'text-orange-600 font-medium' : ''}>
              {qty.toLocaleString()} {product?.base_uom}
            </span>
            {isLowStock && (
              <Badge variant="secondary">{t('stock.lowStock')}</Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'avg_cost',
      header: t('stock.avgCost'),
      cell: ({ row }) => formatCurrency(row.getValue('avg_cost')),
    },
    {
      accessorKey: 'inventory_value',
      header: t('stock.inventoryValue'),
      cell: ({ row }) => formatCurrency(row.getValue('inventory_value')),
    },
  ]

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
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Input
          placeholder={t('stock.searchStock')}
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('stock.allLocations')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('stock.allLocations')}</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                  {t('stock.noStock')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('table.showing')} {table.getRowModel().rows.length} {t('table.of')} {filteredData.length} {t('table.entries')}
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
