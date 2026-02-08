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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
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
import { formatCurrency } from '@/lib/utils'

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

interface LowStockClientProps {
  data: LowStockData[]
  categories: { id: string; name: string }[]
  currency?: string
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

export function LowStockClient({ data, categories, currency = 'USD' }: LowStockClientProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { t, locale } = useTranslation()

  // Filter data based on all filters
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

    if (globalFilter) {
      const search = globalFilter.toLowerCase()
      result = result.filter(
        (item) =>
          item.sku?.toLowerCase().includes(search) ||
          item.name?.toLowerCase().includes(search) ||
          item.category_name?.toLowerCase().includes(search)
      )
    }

    return result
  }, [data, categoryFilter, statusFilter, globalFilter])

  // Chart data from filtered data
  const chartData = useMemo(() => {
    const categoryStats = new Map<string, { count: number; shortage_value: number }>()

    filteredData.forEach((item) => {
      const categoryName = item.category_name || t('common.noCategory')
      const current = categoryStats.get(categoryName) || { count: 0, shortage_value: 0 }
      const shortageValue = (item.reorder_point - item.total_on_hand) * item.current_cost
      categoryStats.set(categoryName, {
        count: current.count + 1,
        shortage_value: current.shortage_value + shortageValue,
      })
    })

    return Array.from(categoryStats.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        shortage_value: stats.shortage_value,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [filteredData, t])

  // Summary stats from filtered data
  const { totalShortageValue, outOfStockCount } = useMemo(() => ({
    totalShortageValue: filteredData.reduce(
      (sum, item) => sum + (item.reorder_point - item.total_on_hand) * item.current_cost,
      0
    ),
    outOfStockCount: filteredData.filter((item) => item.total_on_hand === 0).length,
  }), [filteredData])

  // Tooltip formatter
  const tooltipFormatter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (value: any, name: any) => {
      if (name === 'count') return [value, t('reports.productsNeedReordering')]
      return [formatCurrency(Number(value), currency, locale), t('reports.charts.shortageValue')]
    },
    [currency, locale, t]
  )

  // Table columns
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
    state: { sorting },
    initialState: {
      pagination: { pageSize: 15 },
    },
  })

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              {t('reports.productsNeedReordering')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{filteredData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              {t('reports.outOfStock')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{outOfStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              {t('reports.charts.shortageValue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalShortageValue, currency, locale)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {filteredData.length > 0 && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reports.charts.lowStockByCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" fontSize={12} allowDecimals={false} />
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
                    dataKey="count"
                    name={t('reports.charts.itemCount')}
                    radius={[0, 4, 4, 0]}
                    activeBar={{ opacity: 0.7 }}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>{`${filteredData.length} ${t('reports.productsNeedReordering')}`}</CardTitle>
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
        </CardContent>
      </Card>
    </div>
  )
}
