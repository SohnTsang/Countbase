'use client'

import { useState, useMemo, useCallback } from 'react'
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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface ValuationClientProps {
  data: ValuationData[]
  locations: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  currency?: string
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

export function ValuationClient({
  data,
  locations,
  categories,
  currency = 'USD',
}: ValuationClientProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const { t, locale } = useTranslation()

  // Create categories map for lookup
  const categoriesMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  )

  // Filter data based on all filters
  const filteredData = useMemo(() => {
    let result = data

    if (locationFilter !== 'all') {
      result = result.filter((item) => item.location_id === locationFilter)
    }

    if (categoryFilter !== 'all') {
      result = result.filter((item) => item.product?.category_id === categoryFilter)
    }

    if (globalFilter) {
      const search = globalFilter.toLowerCase()
      result = result.filter(
        (item) =>
          item.product?.sku?.toLowerCase().includes(search) ||
          item.product?.name?.toLowerCase().includes(search) ||
          item.location?.name?.toLowerCase().includes(search)
      )
    }

    return result
  }, [data, locationFilter, categoryFilter, globalFilter])

  // Chart data calculated from filtered data
  const chartData = useMemo(() => {
    const valueByCategory = new Map<string, number>()

    filteredData.forEach((b) => {
      const categoryName = b.product?.category_id
        ? categoriesMap.get(b.product.category_id) || t('common.noCategory')
        : t('common.noCategory')
      const current = valueByCategory.get(categoryName) || 0
      valueByCategory.set(categoryName, current + (b.inventory_value || 0))
    })

    return Array.from(valueByCategory.entries())
      .map(([category_name, total_value], index) => ({
        name: category_name,
        value: total_value,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [filteredData, categoriesMap, t])

  // Top products from filtered data
  const topProducts = useMemo(() => {
    // Aggregate by product
    const productValues = new Map<string, { name: string; value: number }>()

    filteredData.forEach((b) => {
      const productId = b.product_id
      const current = productValues.get(productId)
      if (current) {
        current.value += b.inventory_value || 0
      } else {
        productValues.set(productId, {
          name: b.product?.name || 'Unknown',
          value: b.inventory_value || 0,
        })
      }
    })

    return Array.from(productValues.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((item) => ({
        name: item.name.length > 20 ? item.name.slice(0, 20) + '...' : item.name,
        value: item.value,
      }))
  }, [filteredData])

  // Summary stats from filtered data
  const { totalValue, totalItems } = useMemo(() => ({
    totalValue: filteredData.reduce((sum, b) => sum + (b.inventory_value || 0), 0),
    totalItems: filteredData.reduce((sum, b) => sum + (b.qty_on_hand || 0), 0),
  }), [filteredData])

  // Table columns
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
    state: { sorting },
    initialState: {
      pagination: { pageSize: 15 },
    },
  })

  // Tooltip formatter with translation
  const tooltipFormatter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (value: any) => [formatCurrency(Number(value), currency, locale), t('reports.totalValue')],
    [currency, locale, t]
  )

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">{t('reports.totalValue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalValue, currency, locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">{t('reports.totalItems')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalItems.toLocaleString(locale)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {filteredData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Pie Chart - Value by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('reports.charts.stockByCategory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        (percent ?? 0) > 0.05 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ''
                      }
                      labelLine={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={tooltipFormatter}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart - Top Products */}
          {topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('reports.charts.topProducts')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => formatCurrency(value, currency, locale)}
                        fontSize={12}
                      />
                      <YAxis type="category" dataKey="name" fontSize={12} width={80} />
                      <Tooltip
                        formatter={tooltipFormatter}
                        cursor={false}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                      <Bar
                        dataKey="value"
                        fill="#3b82f6"
                        radius={[0, 4, 4, 0]}
                        activeBar={{ fill: '#60a5fa' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.inventoryByProductLocation')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters Row */}
            <div className="flex flex-wrap gap-4">
              <Input
                placeholder={t('reports.search')}
                value={globalFilter}
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
        </CardContent>
      </Card>
    </div>
  )
}
