'use client'

import { ExportButton } from '@/components/export-button'
import { useTranslation } from '@/lib/i18n'

interface LowStockExportData {
  [key: string]: unknown
  sku: string
  product: string
  category: string
  uom: string
  on_hand: number
  reorder_point: number
  reorder_qty: number
  shortage: number
  current_cost: number
  shortage_value: number
}

interface LowStockExportProps {
  data: LowStockExportData[]
}

export function LowStockExport({ data }: LowStockExportProps) {
  const { t } = useTranslation()

  const columns: { key: keyof LowStockExportData; header: string }[] = [
    { key: 'sku', header: t('products.sku') },
    { key: 'product', header: t('products.product') },
    { key: 'category', header: t('products.category') },
    { key: 'uom', header: t('reports.unit') },
    { key: 'on_hand', header: t('reports.onHand') },
    { key: 'reorder_point', header: t('reports.reorderPoint') },
    { key: 'reorder_qty', header: t('reports.reorderQty') },
    { key: 'shortage', header: t('reports.shortage') },
    { key: 'current_cost', header: t('reports.cost') },
    { key: 'shortage_value', header: t('reports.charts.shortageValue') },
  ]

  return (
    <ExportButton
      data={data}
      columns={columns}
      filename={`low-stock-report-${new Date().toISOString().split('T')[0]}`}
    />
  )
}
