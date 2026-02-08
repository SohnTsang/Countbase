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
import { ReturnActions } from '@/components/return-actions'
import { DocumentUpload } from '@/components/documents/document-upload'
import { getTranslator, getLocale } from '@/lib/i18n/server'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const typeColors: Record<string, string> = {
  customer: 'bg-blue-100 text-blue-800',
  supplier: 'bg-purple-100 text-purple-800',
}

export default async function ReturnDetailPage({ params }: PageProps) {
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

  const { data: returnDoc, error } = await supabase
    .from('returns')
    .select(`
      *,
      location:locations(id, name, type),
      lines:return_lines(
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

  if (error || !returnDoc) {
    notFound()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const returnTotal = returnDoc.lines?.reduce((sum: number, line: any) => {
    return sum + line.qty * (line.unit_cost || 0)
  }, 0) || 0

  const statusTranslations: Record<string, string> = {
    draft: t('common.draft'),
    completed: t('common.completed'),
    cancelled: t('common.cancelled'),
  }

  const typeTranslations: Record<string, string> = {
    customer: t('returns.fromCustomer'),
    supplier: t('returns.toSupplier'),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/returns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{returnDoc.return_number}</h1>
              <Badge className={typeColors[returnDoc.return_type] || ''}>
                {typeTranslations[returnDoc.return_type] || returnDoc.return_type}
              </Badge>
              <Badge className={statusColors[returnDoc.status] || ''}>
                {statusTranslations[returnDoc.status] || returnDoc.status}
              </Badge>
            </div>
            <p className="text-gray-600">{t('common.createdAt')}: {formatDate(returnDoc.created_at, locale)}</p>
          </div>
        </div>
        <ReturnActions returnDoc={returnDoc} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('returns.details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">
                {returnDoc.return_type === 'customer' ? t('customers.customer') : t('suppliers.supplier')}:
              </span>
              <p className="font-medium">{returnDoc.partner_name || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">{t('stock.location')}:</span>
              <p className="font-medium">{returnDoc.location?.name}</p>
            </div>
            {returnDoc.reason && (
              <div>
                <span className="text-sm text-gray-500">{t('returns.reason')}:</span>
                <p>{returnDoc.reason}</p>
              </div>
            )}
            {returnDoc.notes && (
              <div>
                <span className="text-sm text-gray-500">{t('common.notes')}:</span>
                <p>{returnDoc.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('returns.summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">{t('returns.totalItems')}:</span>
              <p className="font-medium">{returnDoc.lines?.length || 0}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">{t('returns.stockImpact')}:</span>
              <p className="font-medium">
                {returnDoc.return_type === 'customer' ? t('returns.addsToInventory') : t('returns.removesFromInventory')}
              </p>
            </div>
            {returnDoc.status === 'completed' && returnTotal > 0 && (
              <div>
                <span className="text-sm text-gray-500">{t('returns.totalValue')}:</span>
                <p className="font-medium">{formatCurrency(returnTotal, currency, locale)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('returns.items')}</CardTitle>
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
              {returnDoc.lines?.map((line: any) => (
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

          {returnDoc.status === 'completed' && returnTotal > 0 && (
            <div className="flex justify-end mt-4">
              <div className="text-lg font-bold">
                {t('common.total')}: {formatCurrency(returnTotal, currency, locale)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentUpload
        entityType="return"
        entityId={returnDoc.id}
        readOnly={returnDoc.status === 'cancelled'}
      />
    </div>
  )
}
