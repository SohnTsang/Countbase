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
import { MoreHorizontal, Pencil, Trash2, Power } from 'lucide-react'
import { toast } from 'sonner'
import { deleteProduct, toggleProductActive } from '@/lib/actions/products'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { Product } from '@/types'

interface ProductsTableProps {
  data: Product[]
  currency?: string
}

export function ProductsTable({ data, currency = 'USD' }: ProductsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const { t, locale } = useTranslation()

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'sku',
      header: t('products.sku'),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('sku')}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: t('products.name'),
    },
    {
      accessorKey: 'category',
      header: t('products.category'),
      cell: ({ row }) => {
        const category = row.original.category
        return category?.name || '-'
      },
    },
    {
      accessorKey: 'base_uom',
      header: t('products.baseUom'),
      cell: ({ row }) => {
        const uom = row.getValue('base_uom') as string
        const packName = row.original.pack_uom_name
        const packQty = row.original.pack_qty_in_base
        const localizedUom = t(`uom.${uom}`)
        return packName ? `${localizedUom} (${packQty}/${packName})` : localizedUom
      },
    },
    {
      accessorKey: 'current_cost',
      header: t('products.currentCost'),
      cell: ({ row }) => formatCurrency(row.getValue('current_cost'), currency, locale),
    },
    {
      accessorKey: 'reorder_point',
      header: t('products.reorderPoint'),
      cell: ({ row }) => {
        const value = row.getValue('reorder_point') as number | null
        return value ?? '-'
      },
    },
    {
      accessorKey: 'reorder_qty',
      header: t('products.reorderQty'),
      cell: ({ row }) => {
        const value = row.getValue('reorder_qty') as number | null
        return value ?? '-'
      },
    },
    {
      accessorKey: 'track_expiry',
      header: t('table.tracking'),
      cell: ({ row }) => {
        const expiry = row.original.track_expiry
        const lot = row.original.track_lot
        return (
          <div className="flex gap-1">
            {expiry && <Badge variant="outline">{t('table.expiry')}</Badge>}
            {lot && <Badge variant="outline">{t('table.lot')}</Badge>}
            {!expiry && !lot && '-'}
          </div>
        )
      },
    },
    {
      accessorKey: 'active',
      header: t('common.status'),
      cell: ({ row }) => (
        <Badge variant={row.getValue('active') ? 'default' : 'secondary'}>
          {row.getValue('active') ? t('common.active') : t('common.inactive')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const product = row.original

        const handleDelete = async () => {
          if (!confirm(t('dialog.deleteMessage'))) return

          const result = await deleteProduct(product.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.productDeleted'))
          }
        }

        const handleToggleActive = async () => {
          const result = await toggleProductActive(product.id, !product.active)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(product.active ? t('toast.productDeactivated') : t('toast.productActivated'))
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
                <Link href={`/products/${product.id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('common.edit')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleActive}>
                <Power className="mr-2 h-4 w-4" />
                {product.active ? t('actions.deactivate') : t('actions.activate')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common.delete')}
              </DropdownMenuItem>
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
        placeholder={t('table.searchProducts')}
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
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                  {t('products.noProducts')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {table.getFilteredRowModel().rows.length} {t('table.items')}
        </p>
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
