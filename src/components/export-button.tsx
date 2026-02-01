'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { exportToCsv } from '@/lib/utils/csv-export'
import { toast } from 'sonner'

interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[]
  columns: { key: keyof T; header: string }[]
  filename: string
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
}: ExportButtonProps<T>) {
  const handleExport = () => {
    if (data.length === 0) {
      toast.error('No data to export')
      return
    }

    try {
      exportToCsv(data, columns, filename)
      toast.success(`Exported ${data.length} rows to ${filename}.csv`)
    } catch (_error) {
      toast.error('Failed to export data')
    }
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  )
}
