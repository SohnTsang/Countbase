'use client'

import { ExportButton } from '@/components/export-button'
import { useTranslation } from '@/lib/i18n'

interface MovementExportData {
  [key: string]: unknown
  date: string
  type: string
  sku: string
  product: string
  location: string
  from_location: string
  to_location: string
  qty: number
  uom: string
  unit_cost: number
  extended_cost: number
  lot_number: string
  expiry_date: string
  reason: string
  notes: string
  document_number: string
  reference: string
}

interface MovementsExportProps {
  data: MovementExportData[]
}

export function MovementsExport({ data }: MovementsExportProps) {
  const { t } = useTranslation()

  const columns: { key: keyof MovementExportData; header: string }[] = [
    { key: 'date', header: t('common.date') },
    { key: 'type', header: t('locations.type') },
    { key: 'document_number', header: t('reports.documentNumber') },
    { key: 'sku', header: t('products.sku') },
    { key: 'product', header: t('products.product') },
    { key: 'location', header: t('stock.location') },
    { key: 'from_location', header: t('reports.fromLocation') },
    { key: 'to_location', header: t('reports.toLocation') },
    { key: 'qty', header: t('common.quantity') },
    { key: 'uom', header: t('reports.unit') },
    { key: 'unit_cost', header: t('reports.cost') },
    { key: 'extended_cost', header: t('reports.extendedCost') },
    { key: 'lot_number', header: t('reports.lotNumber') },
    { key: 'expiry_date', header: t('reports.expiryDate') },
    { key: 'reason', header: t('reports.reason') },
    { key: 'notes', header: t('common.notes') },
    { key: 'reference', header: t('reports.reference') },
  ]

  return (
    <ExportButton
      data={data}
      columns={columns}
      filename={`stock-movements-${new Date().toISOString().split('T')[0]}`}
    />
  )
}
