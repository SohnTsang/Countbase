'use client'

import { ExportButton } from '@/components/export-button'

interface ExpiringExportData {
  [key: string]: unknown
  sku: string
  product: string
  location: string
  lot_number: string
  expiry_date: string
  qty: number
  uom: string
  days_until_expiry: number
}

interface ExpiringExportProps {
  data: ExpiringExportData[]
}

const columns: { key: keyof ExpiringExportData; header: string }[] = [
  { key: 'sku', header: 'SKU' },
  { key: 'product', header: 'Product' },
  { key: 'location', header: 'Location' },
  { key: 'lot_number', header: 'Lot #' },
  { key: 'expiry_date', header: 'Expiry Date' },
  { key: 'qty', header: 'Quantity' },
  { key: 'uom', header: 'Unit' },
  { key: 'days_until_expiry', header: 'Days Left' },
]

export function ExpiringExport({ data }: ExpiringExportProps) {
  return (
    <ExportButton
      data={data}
      columns={columns}
      filename={`expiring-inventory-${new Date().toISOString().split('T')[0]}`}
    />
  )
}
