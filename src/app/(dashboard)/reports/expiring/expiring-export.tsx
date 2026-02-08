'use client'

import { ExportButton } from '@/components/export-button'
import { useTranslation } from '@/lib/i18n'

interface ExpiringExportData {
  [key: string]: unknown
  sku: string
  product: string
  location: string
  lot_number: string
  expiry_date: string
  qty: number
  uom: string
  avg_cost: number
  inventory_value: number
  days_until_expiry: number
}

interface ExpiringExportProps {
  data: ExpiringExportData[]
}

export function ExpiringExport({ data }: ExpiringExportProps) {
  const { t } = useTranslation()

  const columns: { key: keyof ExpiringExportData; header: string }[] = [
    { key: 'sku', header: t('products.sku') },
    { key: 'product', header: t('products.product') },
    { key: 'location', header: t('stock.location') },
    { key: 'lot_number', header: t('reports.lotNumber') },
    { key: 'expiry_date', header: t('reports.expiryDate') },
    { key: 'qty', header: t('common.quantity') },
    { key: 'uom', header: t('reports.unit') },
    { key: 'avg_cost', header: t('reports.avgCost') },
    { key: 'inventory_value', header: t('stock.inventoryValue') },
    { key: 'days_until_expiry', header: t('reports.daysLeft') },
  ]

  return (
    <ExportButton
      data={data}
      columns={columns}
      filename={`expiring-inventory-${new Date().toISOString().split('T')[0]}`}
    />
  )
}
