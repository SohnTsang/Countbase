'use client'

import { ExportButton } from '@/components/export-button'

interface LowStockExportData {
  [key: string]: unknown
  sku: string
  product: string
  uom: string
  on_hand: number
  reorder_point: number
  reorder_qty: number
  shortage: number
}

interface LowStockExportProps {
  data: LowStockExportData[]
}

const columns: { key: keyof LowStockExportData; header: string }[] = [
  { key: 'sku', header: 'SKU' },
  { key: 'product', header: 'Product' },
  { key: 'uom', header: 'Unit' },
  { key: 'on_hand', header: 'On Hand' },
  { key: 'reorder_point', header: 'Reorder Point' },
  { key: 'reorder_qty', header: 'Reorder Qty' },
  { key: 'shortage', header: 'Shortage' },
]

export function LowStockExport({ data }: LowStockExportProps) {
  return (
    <ExportButton
      data={data}
      columns={columns}
      filename={`low-stock-report-${new Date().toISOString().split('T')[0]}`}
    />
  )
}
