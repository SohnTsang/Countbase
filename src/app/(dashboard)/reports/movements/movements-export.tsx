'use client'

import { ExportButton } from '@/components/export-button'

interface MovementExportData {
  [key: string]: unknown
  date: string
  type: string
  sku: string
  product: string
  location: string
  qty: number
  uom: string
  unit_cost: number
  reference: string
}

interface MovementsExportProps {
  data: MovementExportData[]
}

const columns: { key: keyof MovementExportData; header: string }[] = [
  { key: 'date', header: 'Date' },
  { key: 'type', header: 'Type' },
  { key: 'sku', header: 'SKU' },
  { key: 'product', header: 'Product' },
  { key: 'location', header: 'Location' },
  { key: 'qty', header: 'Quantity' },
  { key: 'uom', header: 'UoM' },
  { key: 'unit_cost', header: 'Unit Cost' },
  { key: 'reference', header: 'Reference' },
]

export function MovementsExport({ data }: MovementsExportProps) {
  return (
    <ExportButton
      data={data}
      columns={columns}
      filename={`stock-movements-${new Date().toISOString().split('T')[0]}`}
    />
  )
}
