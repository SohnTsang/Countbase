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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { StockHistorySheet } from '@/components/stock-history-sheet'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { InventoryBalance, Location } from '@/types'

interface StockTableProps {
  data: InventoryBalance[]
  depletedData?: InventoryBalance[]
  locations: Pick<Location, 'id' | 'name'>[]
  currency?: string
}

export function StockTable({ data, depletedData = [], locations, currency = 'USD' }: StockTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [selectedStock, setSelectedStock] = useState<InventoryBalance | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('current')
  const { t, locale } = useTranslation()

  const filteredData = locationFilter === 'all'
    ? data
    : data.filter(item => item.location_id === locationFilter)

  const filteredDepletedData = locationFilter === 'all'
    ? depletedData
    : depletedData.filter(item => item.location_id === locationFilter)

  const handleSkuClick = (item: InventoryBalance) => {
    setSelectedStock(item)
    setSheetOpen(true)
  }

  const columns: ColumnDef<InventoryBalance>[] = useMemo(() => [
    {
      accessorKey: 'product.sku',
      header: t('products.sku'),
      cell: ({ row }) => (
        <button
          onClick={() => handleSkuClick(row.original)}
          className="font-mono text-blue-600 hover:underline hover:text-blue-800 text-left"
          title={t('stock.clickToViewHistory')}
        >
          {row.original.product?.sku}
        </button>
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
            <span>{formatDate(expiry, locale)}</span>
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
        const isLowStock = product?.reorder_point && qty <= product.reorder_point && qty > 0

        return (
          <div className="flex items-center gap-2">
            <span className={isLowStock ? 'text-orange-600 font-medium' : qty === 0 ? 'text-muted-foreground' : ''}>
              {qty.toLocaleString()} {t(`uom.${product?.base_uom}`)}
            </span>
            {isLowStock && (
              <Badge variant="secondary">{t('stock.lowStock')}</Badge>
            )}
            {qty === 0 && (
              <Badge variant="outline">{t('stock.stockCleared')}</Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'avg_cost',
      header: t('stock.avgCost'),
      cell: ({ row }) => formatCurrency(row.getValue('avg_cost'), currency, locale),
    },
    {
      accessorKey: 'inventory_value',
      header: t('stock.inventoryValue'),
      cell: ({ row }) => formatCurrency(row.getValue('inventory_value'), currency, locale),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, currency, locale])

  const currentTable = useReactTable({
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

  const depletedTable = useReactTable({
    data: filteredDepletedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
  })

  const renderTable = (table: typeof currentTable, tableData: InventoryBalance[], emptyMessage: string) => (
    <>
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
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('table.showing')} {table.getRowModel().rows.length} {t('table.of')} {tableData.length} {t('table.entries')}
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
    </>
  )

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="current">
            {t('stock.currentStock')}
            <Badge variant="secondary" className="ml-2">
              {filteredData.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="historical">
            {t('stock.historicalStock')}
            <Badge variant="outline" className="ml-2">
              {filteredDepletedData.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4 mt-4">
          {renderTable(currentTable, filteredData, t('stock.noStock'))}
        </TabsContent>

        <TabsContent value="historical" className="space-y-4 mt-4">
          {renderTable(depletedTable, filteredDepletedData, t('stock.noStock'))}
        </TabsContent>
      </Tabs>

      <StockHistorySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        stockItem={selectedStock}
        currency={currency}
      />
    </div>
  )
}
