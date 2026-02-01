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
import { MoreHorizontal, Pencil, Trash2, UserCheck, UserX, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { deleteUser, toggleUserActive } from '@/lib/actions/users'
import { useTranslation } from '@/lib/i18n'
import type { User, UserRole } from '@/types'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  staff: 'bg-green-100 text-green-800',
  readonly: 'bg-gray-100 text-gray-800',
}

// Roles that managers can manage
const MANAGER_MANAGEABLE_ROLES: UserRole[] = ['staff', 'readonly']

interface UsersTableProps {
  data: User[]
  currentUserId: string
  currentUserRole: UserRole
}

export function UsersTable({ data, currentUserId, currentUserRole }: UsersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const { t } = useTranslation()

  const roleLabels: Record<string, string> = {
    admin: t('users.roleAdmin'),
    manager: t('users.roleManager'),
    staff: t('users.roleStaff'),
    readonly: t('users.roleReadOnly'),
  }

  // Helper to check if current user can manage a target user
  const canManageUser = (targetRole: UserRole): boolean => {
    if (currentUserRole === 'admin') return true
    if (currentUserRole === 'manager') return MANAGER_MANAGEABLE_ROLES.includes(targetRole)
    return false
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: t('users.name'),
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.getValue('name')}</span>
          {row.original.id === currentUserId && (
            <span className="ml-2 text-xs text-gray-500">{t('users.you')}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: t('users.email'),
    },
    {
      accessorKey: 'role',
      header: t('users.role'),
      cell: ({ row }) => {
        const role = row.getValue('role') as string
        return (
          <Badge className={ROLE_COLORS[role] || ''}>
            {roleLabels[role] || role}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'active',
      header: t('common.status'),
      cell: ({ row }) => (
        <Badge variant={row.getValue('active') ? 'default' : 'secondary'}>
          {row.getValue('active') ? t('users.active') : t('users.inactive')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original
        const isCurrentUser = user.id === currentUserId
        const canManage = canManageUser(user.role as UserRole)

        const handleToggleActive = async () => {
          const confirmMessage = user.active
            ? t('users.confirmDeactivate')
            : t('users.confirmActivate')
          if (!confirm(confirmMessage)) return

          const result = await toggleUserActive(user.id, !user.active)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(user.active ? t('toast.userDeactivated') : t('toast.userActivated'))
          }
        }

        const handleDelete = async () => {
          if (!confirm(t('users.confirmDeleteUser'))) return

          const result = await deleteUser(user.id)
          if (result.error) {
            toast.error(result.error)
          } else {
            toast.success(t('toast.userDeleted'))
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
                <Link href={`/users/${user.id}`}>
                  {canManage ? (
                    <>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t('common.edit')}
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      {t('common.view')}
                    </>
                  )}
                </Link>
              </DropdownMenuItem>
              {!isCurrentUser && canManage && (
                <>
                  <DropdownMenuItem onClick={handleToggleActive}>
                    {user.active ? (
                      <>
                        <UserX className="mr-2 h-4 w-4" />
                        {t('users.deactivate')}
                      </>
                    ) : (
                      <>
                        <UserCheck className="mr-2 h-4 w-4" />
                        {t('users.activate')}
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                </>
              )}
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
        placeholder={t('users.searchUsers')}
        value={globalFilter ?? ''}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />

      {currentUserRole === 'manager' && (
        <p className="text-sm text-gray-500">
          {t('users.managerNote')}
        </p>
      )}

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
                  {t('users.noUsers')}
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
