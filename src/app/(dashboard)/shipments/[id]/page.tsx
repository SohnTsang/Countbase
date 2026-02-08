import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ShipmentActions } from '@/components/shipment-actions'
import { DocumentUpload } from '@/components/documents/document-upload'
import { getTranslator, getLocale } from '@/lib/i18n/server'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default async function ShipmentDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const t = await getTranslator()
  const locale = await getLocale()

  // Get current user's tenant settings for currency
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('tenant:tenants(settings)')
    .eq('id', user?.id)
    .single()

  const currency = (userData?.tenant as { settings?: { default_currency?: string } })?.settings?.default_currency || 'USD'

  const { data: shipment, error } = await supabase
    .from('shipments')
    .select(`
      *,
      customer:customers(id, name, code, email, phone),
      location:locations(id, name, type),
      lines:shipment_lines(
        id,
        product_id,
        qty,
        lot_number,
        expiry_date,
        unit_cost,
        product:products(id, sku, name, base_uom)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !shipment) {
    notFound()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shipmentTotal = shipment.lines?.reduce((sum: number, line: any) => {
    return sum + line.qty * (line.unit_cost || 0)
  }, 0) || 0

  const statusTranslations: Record<string, string> = {
    draft: t('common.draft'),
    confirmed: t('common.confirmed'),
    completed: t('common.completed'),
    cancelled: t('common.cancelled'),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/shipments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{shipment.shipment_number}</h1>
              <Badge className={statusColors[shipment.status] || ''}>
                {statusTranslations[shipment.status] || shipment.status}
              </Badge>
            </div>
            <p className="text-gray-600">
              {t('shipments.shipDate')}: {shipment.ship_date ? formatDate(shipment.ship_date, locale) : t('common.notSet')}
            </p>
          </div>
        </div>
        <ShipmentActions shipment={shipment} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('shipments.customer')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">{t('common.name')}:</span>
              <p className="font-medium">
                {shipment.customer?.name || shipment.customer_name || '-'}
              </p>
            </div>
            {shipment.customer?.email && (
              <div>
                <span className="text-sm text-gray-500">{t('common.email')}:</span>
                <p>{shipment.customer.email}</p>
              </div>
            )}
            {shipment.customer?.phone && (
              <div>
                <span className="text-sm text-gray-500">{t('common.phone')}:</span>
                <p>{shipment.customer.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('shipments.shipmentDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">{t('shipments.shipFromLocation')}:</span>
              <p className="font-medium">{shipment.location?.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">{t('common.createdAt')}:</span>
              <p>{formatDate(shipment.created_at, locale)}</p>
            </div>
            {shipment.notes && (
              <div>
                <span className="text-sm text-gray-500">{t('common.notes')}:</span>
                <p>{shipment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('shipments.lineItems')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('products.product')}</TableHead>
                  <TableHead className="text-center w-[120px]">{t('common.quantity')}</TableHead>
                  <TableHead className="text-center w-[140px]">{t('stock.lotNumber')}</TableHead>
                  <TableHead className="text-center w-[120px]">{t('stock.expiryDate')}</TableHead>
                  <TableHead className="text-right w-[120px]">{t('purchaseOrders.unitCost')}</TableHead>
                  <TableHead className="text-right w-[120px]">{t('common.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {shipment.lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div>
                        <span className="font-mono text-sm">{line.product?.sku}</span>
                        <p className="text-sm text-gray-600">{line.product?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {line.qty} {t(`uom.${line.product?.base_uom}`)}
                    </TableCell>
                    <TableCell className="text-center">{line.lot_number || '-'}</TableCell>
                    <TableCell className="text-center">
                      {line.expiry_date ? formatDate(line.expiry_date, locale) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.unit_cost ? formatCurrency(line.unit_cost, currency, locale) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {line.unit_cost ? formatCurrency(line.qty * line.unit_cost, currency, locale) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {shipment.status === 'completed' && shipmentTotal > 0 && (
            <div className="flex justify-end mt-4">
              <div className="text-lg font-bold">
                {t('common.total')}: {formatCurrency(shipmentTotal, currency, locale)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentUpload
        entityType="shipment"
        entityId={shipment.id}
        readOnly={shipment.status === 'cancelled'}
      />
    </div>
  )
}
