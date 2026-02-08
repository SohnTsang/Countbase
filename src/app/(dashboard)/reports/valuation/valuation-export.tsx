'use client'

import { ExportButton } from '@/components/export-button'
import { useTranslation } from '@/lib/i18n'

interface ValuationExportData {
  [key: string]: unknown
  sku: string
  product: string
  location: string
  lot_number: string
  expiry_date: string
  qty: number
  uom: string
  avg_cost: number
  total_value: number
}

interface ValuationExportProps {
  data: ValuationExportData[]
}

export function ValuationExport({ data }: ValuationExportProps) {
  const { t } = useTranslation()

  const columns: { key: keyof ValuationExportData; header: string }[] = [
    { key: 'sku', header: t('products.sku') },
    { key: 'product', header: t('products.product') },
    { key: 'location', header: t('stock.location') },
    { key: 'lot_number', header: t('reports.lotNumber') },
    { key: 'expiry_date', header: t('reports.expiryDate') },
    { key: 'qty', header: t('common.quantity') },
    { key: 'uom', header: t('reports.unit') },
    { key: 'avg_cost', header: t('reports.avgCost') },
    { key: 'total_value', header: t('reports.totalValue') },
  ]

  return (
    <ExportButton
      data={data}
      columns={columns}
      filename={`inventory-valuation-${new Date().toISOString().split('T')[0]}`}
    />
  )
}
