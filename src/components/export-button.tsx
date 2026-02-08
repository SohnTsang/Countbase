'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { exportToCsv } from '@/lib/utils/csv-export'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

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
  const { t } = useTranslation()

  const handleExport = () => {
    if (data.length === 0) {
      toast.error(t('reports.noDataToExport'))
      return
    }

    try {
      exportToCsv(data, columns, filename)
      toast.success(t('reports.exportedRows').replace('{count}', data.length.toString()))
    } catch (_error) {
      toast.error(t('common.errorOccurred'))
    }
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      {t('reports.exportCsv')}
    </Button>
  )
}
