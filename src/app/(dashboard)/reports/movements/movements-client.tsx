'use client'

import { useState, useMemo, useCallback } from 'react'
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
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
import type { MovementType } from '@/types'

export interface MovementData {
  id: string
  created_at: string
  movement_type: MovementType
  qty: number
  unit_cost: number | null
  lot_number: string | null
  expiry_date: string | null
  reason: string | null
  notes: string | null
  reference_type: string | null
  reference_id: string | null
  document_number: string | null
  from_location_name: string | null
  to_location_name: string | null
  product: {
    id: string
    sku: string
    name: string
    base_uom: string
  } | null
  location: {
    id: string
    name: string
  } | null
}

interface MovementsClientProps {
  data: MovementData[]
  locations: { id: string; name: string }[]
  currency?: string
}

const referenceTypeToPath: Record<string, string> = {
  po: '/purchase-orders',
  shipment: '/shipments',
  transfer: '/transfers',
  adjustment: '/adjustments',
  cycle_count: '/cycle-counts',
  return: '/returns',
}

const MOVEMENT_COLORS: Record<string, string> = {
  receive: '#10b981',
  ship: '#ef4444',
  transfer_out: '#f59e0b',
  transfer_in: '#3b82f6',
  adjustment: '#8b5cf6',
  count_variance: '#ec4899',
  return_in: '#06b6d4',
  return_out: '#f97316',
  void: '#6b7280',
}

export function MovementsClient({ data, locations, currency = 'USD' }: MovementsClientProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const { t, locale } = useTranslation()

  const movementLabels: Record<string, string> = useMemo(() => ({
    receive: t('movementTypes.receive'),
    ship: t('movementTypes.ship'),
    transfer_out: t('movementTypes.transfer_out'),
    transfer_in: t('movementTypes.transfer_in'),
    adjustment: t('movementTypes.adjustment'),
    count_variance: t('movementTypes.count_variance'),
    return_in: t('movementTypes.return_in'),
    return_out: t('movementTypes.return_out'),
    void: t('movementTypes.void'),
  }), [t])

  // Filter data based on all filters
  const filteredData = useMemo(() => {
    let result = data

    if (typeFilter !== 'all') {
      result = result.filter((m) => m.movement_type === typeFilter)
    }

    if (locationFilter !== 'all') {
      result = result.filter((m) => m.location?.id === locationFilter)
    }

    if (globalFilter) {
      const search = globalFilter.toLowerCase()
      result = result.filter(
        (m) =>
          m.product?.sku?.toLowerCase().includes(search) ||
          m.product?.name?.toLowerCase().includes(search) ||
          m.location?.name?.toLowerCase().includes(search) ||
          m.document_number?.toLowerCase().includes(search)
      )
    }

    return result
  }, [data, typeFilter, locationFilter, globalFilter])

  // Trend chart data from filtered data
  const trendData = useMemo(() => {
    const groupedByDate = new Map<string, number>()

    // Get last 30 days
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      groupedByDate.set(dateStr, 0)
    }

    filteredData.forEach((item) => {
      const dateStr = item.created_at.split('T')[0]
      if (groupedByDate.has(dateStr)) {
        groupedByDate.set(dateStr, (groupedByDate.get(dateStr) || 0) + 1)
      }
    })

    // Format dates using locale
    return Array.from(groupedByDate.entries()).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
      rawDate: date,
      count,
    }))
  }, [filteredData, locale])

  // Type distribution chart data from filtered data
  const typeData = useMemo(() => {
    const groupedByType = new Map<string, number>()

    filteredData.forEach((item) => {
      const current = groupedByType.get(item.movement_type) || 0
      groupedByType.set(item.movement_type, current + 1)
    })

    return Array.from(groupedByType.entries())
      .map(([type, count]) => ({
        type,
        label: movementLabels[type] || type,
        count,
        color: MOVEMENT_COLORS[type] || '#6b7280',
      }))
      .sort((a, b) => b.count - a.count)
  }, [filteredData, movementLabels])

  // Tooltip formatters
  const trendTooltipFormatter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (value: any) => [value, t('reports.charts.movementCount')],
    [t]
  )

  const typeTooltipFormatter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (value: any) => [value, t('reports.charts.movementCount')],
    [t]
  )

  // Table columns
  const columns: ColumnDef<MovementData>[] = useMemo(
    () => [
      {
        accessorKey: 'created_at',
        header: t('common.date'),
        cell: ({ row }) => formatDate(row.original.created_at, locale),
      },
      {
        accessorKey: 'movement_type',
        header: t('locations.type'),
        cell: ({ row }) => (
          <Badge variant="outline">
            {movementLabels[row.original.movement_type] || row.original.movement_type}
          </Badge>
        ),
      },
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
        cell: ({ row }) => {
          const m = row.original
          if (m.movement_type === 'transfer_out' && m.to_location_name) {
            return (
              <span>
                {m.location?.name} <span className="text-muted-foreground">→</span> {m.to_location_name}
              </span>
            )
          }
          if (m.movement_type === 'transfer_in' && m.from_location_name) {
            return (
              <span>
                {m.from_location_name} <span className="text-muted-foreground">→</span> {m.location?.name}
              </span>
            )
          }
          return m.location?.name
        },
      },
      {
        accessorKey: 'qty',
        header: t('common.quantity'),
        cell: ({ row }) => {
          const m = row.original
          return (
            <span className={m.qty > 0 ? 'text-green-600' : 'text-red-600'}>
              {m.qty > 0 ? '+' : ''}
              {m.qty} {t(`uom.${m.product?.base_uom}`)}
            </span>
          )
        },
      },
      {
        accessorKey: 'unit_cost',
        header: t('reports.cost'),
        cell: ({ row }) =>
          row.original.unit_cost
            ? formatCurrency(row.original.unit_cost, currency, locale)
            : '-',
      },
      {
        accessorKey: 'document_number',
        header: t('reports.documentNumber'),
        cell: ({ row }) => {
          const m = row.original
          if (!m.reference_type || !m.reference_id) return '-'

          const path = referenceTypeToPath[m.reference_type]
          const displayText = m.document_number || `${m.reference_type}/${m.reference_id.slice(0, 8)}`

          if (path) {
            return (
              <Link
                href={`${path}/${m.reference_id}`}
                className="text-blue-600 hover:underline font-mono text-sm"
              >
                {displayText}
              </Link>
            )
          }

          return <span className="font-mono text-sm">{displayText}</span>
        },
      },
    ],
    [t, locale, currency, movementLabels]
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

  const movementTypes = [
    'receive', 'ship', 'transfer_out', 'transfer_in',
    'adjustment', 'count_variance', 'return_in', 'return_out',
  ]

  return (
    <div className="space-y-6">
      {/* Charts */}
      {filteredData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Line Chart - Trends over time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('reports.charts.movementTrends')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} tickMargin={8} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip
                      formatter={trendTooltipFormatter}
                      labelFormatter={(label) => label}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name={t('reports.charts.movementCount')}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart - By Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('reports.charts.movementsByType')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" fontSize={12} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" fontSize={12} width={100} />
                    <Tooltip
                      formatter={typeTooltipFormatter}
                      cursor={false}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name={t('reports.charts.movementCount')}
                      radius={[0, 4, 4, 0]}
                      activeBar={{ opacity: 0.7 }}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.movementHistory')}</CardTitle>
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
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('reports.filterByType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('reports.allTypes')}</SelectItem>
                  {movementTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {movementLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                        {t('reports.noMovements')}
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
