import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { TransferActions } from '@/components/transfers/transfer-actions'
import { DocumentUpload } from '@/components/documents/document-upload'
import { getTranslator, getLocale } from '@/lib/i18n/server'

interface TransferDetailPageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default async function TransferDetailPage({ params }: TransferDetailPageProps) {
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

  const { data: transfer, error } = await supabase
    .from('transfers')
    .select(`
      *,
      from_location:locations!transfers_from_location_id_fkey(id, name),
      to_location:locations!transfers_to_location_id_fkey(id, name),
      lines:transfer_lines(
        *,
        product:products(id, sku, name, base_uom)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !transfer) {
    notFound()
  }

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
          <Link href="/transfers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{transfer.transfer_number}</h1>
              <Badge className={statusColors[transfer.status] || ''}>
                {statusTranslations[transfer.status] || transfer.status}
              </Badge>
            </div>
            <p className="text-gray-600">
              {transfer.from_location?.name} → {transfer.to_location?.name}
            </p>
          </div>
        </div>
        <TransferActions transfer={transfer} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('transfers.details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">{t('transfers.fromLocation')}:</span>
              <p className="font-medium">{transfer.from_location?.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">{t('transfers.toLocation')}:</span>
              <p className="font-medium">{transfer.to_location?.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">{t('common.createdAt')}:</span>
              <p>{formatDate(transfer.created_at, locale)}</p>
            </div>
            {transfer.sent_at && (
              <div>
                <span className="text-sm text-gray-500">{t('transfers.sent')}:</span>
                <p>{formatDate(transfer.sent_at, locale)}</p>
              </div>
            )}
            {transfer.received_at && (
              <div>
                <span className="text-sm text-gray-500">{t('transfers.received')}:</span>
                <p>{formatDate(transfer.received_at, locale)}</p>
              </div>
            )}
            {transfer.notes && (
              <div>
                <span className="text-sm text-gray-500">{t('common.notes')}:</span>
                <p>{transfer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('transfers.lineItems')}</CardTitle>
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
                {transfer.lines?.map((line: any) => (
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
        </CardContent>
      </Card>

      <DocumentUpload
        entityType="transfer"
        entityId={transfer.id}
        readOnly={transfer.status === 'cancelled'}
      />
    </div>
  )
}
