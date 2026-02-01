'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import type { ErrorLogFilters } from '@/types'

interface ErrorLogsFiltersProps {
  currentFilters: ErrorLogFilters
}

export function ErrorLogsFilters({ currentFilters }: ErrorLogsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }

      // Reset to page 1 when filters change
      params.delete('page')

      router.push(`/admin/error-logs?${params.toString()}`)
    },
    [router, searchParams]
  )

  const clearFilters = useCallback(() => {
    router.push('/admin/error-logs')
  }, [router])

  const hasActiveFilters =
    (currentFilters.status && currentFilters.status !== 'all') ||
    (currentFilters.severity && currentFilters.severity !== 'all') ||
    (currentFilters.error_type && currentFilters.error_type !== 'all') ||
    currentFilters.search

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search error messages..."
              className="pl-10"
              defaultValue={currentFilters.search}
              onChange={(e) => {
                const value = e.target.value
                // Debounce search
                const timeout = setTimeout(() => {
                  updateFilter('search', value || undefined)
                }, 300)
                return () => clearTimeout(timeout)
              }}
            />
          </div>

          {/* Status Filter */}
          <Select
            value={currentFilters.status || 'all'}
            onValueChange={(value) => updateFilter('status', value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="ignored">Ignored</SelectItem>
            </SelectContent>
          </Select>

          {/* Severity Filter */}
          <Select
            value={currentFilters.severity || 'all'}
            onValueChange={(value) => updateFilter('severity', value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="fatal">Fatal</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select
            value={currentFilters.error_type || 'all'}
            onValueChange={(value) => updateFilter('type', value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="server">Server</SelectItem>
              <SelectItem value="api">API</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="validation">Validation</SelectItem>
              <SelectItem value="network">Network</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
