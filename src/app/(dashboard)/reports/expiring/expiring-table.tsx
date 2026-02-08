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
import { formatDate } from '@/lib/utils'

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

interface ExpiringTableProps {
  data: ExpiringData[]
  locations: { id: string; name: string }[]
}

export function ExpiringTable({ data, locations }: ExpiringTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all')
  const { t, locale } = useTranslation()

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

    return result
  }, [data, locationFilter, urgencyFilter])

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
  )
}
