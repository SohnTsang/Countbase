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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteCustomer } from '@/lib/actions/customers'
import { useTranslation } from '@/lib/i18n'
import type { Customer } from '@/types'

interface CustomersTableProps {
  data: Customer[]
}

export function CustomersTable({ data }: CustomersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const { t } = useTranslation()

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'code',
      header: t('customers.customerCode'),
      cell: ({ row }) => row.getValue('code') || '-',
    },
    {
      accessorKey: 'name',
      header: t('customers.customerName'),
    },
    {
      accessorKey: 'contact_name',
      header: t('customers.contactName'),
      cell: ({ row }) => row.getValue('contact_name') || '-',
    },
    {
      accessorKey: 'email',
      header: t('customers.email'),
      cell: ({ row }) => row.getValue('email') || '-',
    },
    {
      accessorKey: 'phone',
      header: t('customers.phone'),
      cell: ({ row }) => row.getValue('phone') || '-',
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
        const customer = row.original

        const handleDelete = async () => {
          if (!confirm(t('dialog.deleteMessage'))) return
          const result = await deleteCustomer(customer.id)
          if (result.error) toast.error(result.error)
          else toast.success(t('toast.customerDeleted'))
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
                <Link href={`/customers/${customer.id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('common.edit')}
                </Link>
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
        placeholder={t('table.searchCustomers')}
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
                  {t('customers.noCustomers')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
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
  )
}
