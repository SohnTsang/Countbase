'use client'

import { ExportButton } from '@/components/export-button'

interface ValuationExportData {
  [key: string]: unknown
  sku: string
  product: string
  location: string
  qty: number
  uom: string
  avg_cost: number
  total_value: number
}

interface ValuationExportProps {
  data: ValuationExportData[]
}

const columns: { key: keyof ValuationExportData; header: string }[] = [
  { key: 'sku', header: 'SKU' },
  { key: 'product', header: 'Product' },
  { key: 'location', header: 'Location' },
  { key: 'qty', header: 'Quantity' },
  { key: 'uom', header: 'Unit' },
  { key: 'avg_cost', header: 'Avg Cost' },
  { key: 'total_value', header: 'Total Value' },
]

export function ValuationExport({ data }: ValuationExportProps) {
  return (
    <ExportButton
      data={data}
      columns={columns}
      filename={`inventory-valuation-${new Date().toISOString().split('T')[0]}`}
    />
  )
}
