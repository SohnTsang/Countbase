import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { AdjustmentActions } from '@/components/adjustments/adjustment-actions'
import { DocumentUpload } from '@/components/documents/document-upload'
import { getTranslator, getLocale } from '@/lib/i18n/server'

interface AdjustmentDetailPageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default async function AdjustmentDetailPage({ params }: AdjustmentDetailPageProps) {
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

  const { data: adjustment, error } = await supabase
    .from('adjustments')
    .select(`
      *,
      location:locations(id, name),
      lines:adjustment_lines(
        *,
        product:products(id, sku, name, base_uom)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !adjustment) {
    notFound()
  }

  const reasonLabels: Record<string, string> = {
    damage: t('adjustments.damage'),
    shrinkage: t('adjustments.shrinkage'),
    expiry: t('adjustments.expiry'),
    correction: t('adjustments.correction'),
    sample: t('adjustments.sample'),
    count_variance: t('adjustments.countVariance'),
    other: t('adjustments.other'),
  }

  const statusTranslations: Record<string, string> = {
    draft: t('common.draft'),
    completed: t('common.completed'),
    cancelled: t('common.cancelled'),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adjustmentTotal = adjustment.lines?.reduce((sum: number, line: any) => {
    return sum + Math.abs(line.qty * (line.unit_cost || 0))
  }, 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/adjustments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{adjustment.adjustment_number}</h1>
              <Badge className={statusColors[adjustment.status] || ''}>
                {statusTranslations[adjustment.status] || adjustment.status}
              </Badge>
            </div>
            <p className="text-gray-600">
              {adjustment.location?.name} - {reasonLabels[adjustment.reason] || adjustment.reason}
            </p>
          </div>
        </div>
        <AdjustmentActions adjustment={adjustment} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('adjustments.adjustmentDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">{t('stock.location')}:</span>
              <p className="font-medium">{adjustment.location?.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">{t('adjustments.reason')}:</span>
              <p className="font-medium">{reasonLabels[adjustment.reason] || adjustment.reason}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">{t('common.createdAt')}:</span>
              <p>{formatDate(adjustment.created_at, locale)}</p>
            </div>
            {adjustment.notes && (
              <div>
                <span className="text-sm text-gray-500">{t('common.notes')}:</span>
                <p>{adjustment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('adjustments.lineItems')}</CardTitle>
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
                {adjustment.lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div>
                        <span className="font-mono text-sm">{line.product?.sku}</span>
                        <p className="text-sm text-gray-600">{line.product?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={line.qty > 0 ? 'text-green-600' : 'text-red-600'}>
                        {line.qty > 0 ? '+' : ''}{line.qty} {t(`uom.${line.product?.base_uom}`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{line.lot_number || '-'}</TableCell>
                    <TableCell className="text-center">
                      {line.expiry_date ? formatDate(line.expiry_date, locale) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.unit_cost ? formatCurrency(line.unit_cost, currency, locale) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {line.unit_cost ? formatCurrency(Math.abs(line.qty * line.unit_cost), currency, locale) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {adjustmentTotal > 0 && (
            <div className="flex justify-end mt-4">
              <div className="text-lg font-bold">
                {t('common.total')}: {formatCurrency(adjustmentTotal, currency, locale)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentUpload
        entityType="adjustment"
        entityId={adjustment.id}
        readOnly={adjustment.status === 'cancelled'}
      />
    </div>
  )
}
