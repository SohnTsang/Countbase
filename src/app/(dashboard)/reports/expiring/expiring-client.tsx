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
import { formatCurrency, formatDate } from '@/lib/utils'

export interface ExpiringData {
  id: string
  qty_on_hand: number
  lot_number: string | null
  expiry_date: string
  days_until_expiry: number
  avg_cost: number
  inventory_value: number
  location_id: string
  product: {
    sku: string
    name: string
    base_uom: string
  } | null
  location: {
    name: string
  } | null
}

interface ExpiringClientProps {
  data: ExpiringData[]
  locations: { id: string; name: string }[]
  currency?: string
}

const URGENCY_COLORS = {
  expired: '#dc2626',
  critical: '#f97316',
  warning: '#eab308',
}

export function ExpiringClient({ data, locations, currency = 'USD' }: ExpiringClientProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all')
  const { t, locale } = useTranslation()

  // Filter data based on all filters
  const filteredData = useMemo(() => {
    let result = data

    if (locationFilter !== 'all') {
      result = result.filter((item) => item.location_id === locationFilter)
    }

    if (urgencyFilter === 'expired') {
      result = result.filter((item) => item.days_until_expiry <= 0)
    } else if (urgencyFilter === '7days') {
      result = result.filter((item) => item.days_until_expiry > 0 && item.days_until_expiry <= 7)
    } else if (urgencyFilter === '30days') {
      result = result.filter((item) => item.days_until_expiry > 7)
    }

    if (globalFilter) {
      const search = globalFilter.toLowerCase()
      result = result.filter(
        (item) =>
          item.product?.sku?.toLowerCase().includes(search) ||
          item.product?.name?.toLowerCase().includes(search) ||
          item.location?.name?.toLowerCase().includes(search) ||
          item.lot_number?.toLowerCase().includes(search)
      )
    }

    return result
  }, [data, locationFilter, urgencyFilter, globalFilter])

  // Chart data - urgency distribution
  const urgencyData = useMemo(() => {
    const groups = {
      expired: { count: 0, value: 0 },
      critical: { count: 0, value: 0 },
      warning: { count: 0, value: 0 },
    }

    filteredData.forEach((item) => {
      if (item.days_until_expiry <= 0) {
        groups.expired.count += 1
        groups.expired.value += item.inventory_value
      } else if (item.days_until_expiry <= 7) {
        groups.critical.count += 1
        groups.critical.value += item.inventory_value
      } else {
        groups.warning.count += 1
        groups.warning.value += item.inventory_value
      }
    })

    return [
      {
        name: t('reports.urgencyExpired'),
        count: groups.expired.count,
        value: groups.expired.value,
        color: URGENCY_COLORS.expired,
      },
      {
        name: t('reports.urgency7Days'),
        count: groups.critical.count,
        value: groups.critical.value,
        color: URGENCY_COLORS.critical,
      },
      {
        name: t('reports.urgency30Days'),
        count: groups.warning.count,
        value: groups.warning.value,
        color: URGENCY_COLORS.warning,
      },
    ].filter((item) => item.count > 0)
  }, [filteredData, t])

  // Summary stats
  const { totalValue, totalCount } = useMemo(() => ({
    totalValue: filteredData.reduce((sum, item) => sum + item.inventory_value, 0),
    totalCount: filteredData.length,
  }), [filteredData])

  // Tooltip formatters
  const pieTooltipFormatter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (value: any, name: any, props: any) => {
      const item = props.payload
      return [`${value} ${t('reports.charts.itemCount')} (${formatCurrency(item.value, currency, locale)})`, name]
    },
    [currency, locale, t]
  )

  const barTooltipFormatter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (value: any) => [formatCurrency(Number(value), currency, locale), t('reports.totalValue')],
    [currency, locale, t]
  )

  // Table columns
  const columns: ColumnDef<ExpiringData>[] = useMemo(
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
        accessorKey: 'lot_number',
        header: t('stock.lotNumber'),
        cell: ({ row }) => row.original.lot_number || '-',
      },
      {
        accessorKey: 'expiry_date',
        header: t('table.expiry'),
        cell: ({ row }) => formatDate(row.original.expiry_date, locale),
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
        accessorKey: 'days_until_expiry',
        header: t('reports.daysLeft'),
        cell: ({ row }) => {
          const days = row.original.days_until_expiry

          return (
            <Badge variant={days <= 7 ? 'destructive' : 'default'}>
              {days <= 0 ? t('reports.expired') : `${days}d`}
            </Badge>
          )
        },
      },
    ],
    [t, locale]
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
      {/* Charts */}
      {filteredData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Donut Chart - By Urgency */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('reports.charts.expiringByUrgency')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={urgencyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="count"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {urgencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={pieTooltipFormatter}
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
              <div className="text-center mt-2">
                <span className="text-sm text-muted-foreground">{t('reports.totalItems')}: </span>
                <span className="font-semibold">{totalCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart - Value at Risk */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('reports.charts.valueAtRisk')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={urgencyData} margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value, currency, locale)}
                      fontSize={12}
                    />
                    <Tooltip
                      formatter={barTooltipFormatter}
                      cursor={false}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar
                      dataKey="value"
                      name={t('reports.totalValue')}
                      radius={[4, 4, 0, 0]}
                      activeBar={{ opacity: 0.7 }}
                    >
                      {urgencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-2">
                <span className="text-sm text-muted-foreground">{t('reports.totalValue')}: </span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(totalValue, currency, locale)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>{`${filteredData.length} ${t('reports.itemsExpiringSoon')}`}</CardTitle>
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
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('reports.filterByUrgency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('reports.allUrgency')}</SelectItem>
                  <SelectItem value="expired">{t('reports.urgencyExpired')}</SelectItem>
                  <SelectItem value="7days">{t('reports.urgency7Days')}</SelectItem>
                  <SelectItem value="30days">{t('reports.urgency30Days')}</SelectItem>
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
                        {t('reports.noProductsExpiring')}
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
