import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ProductsTable } from '@/components/tables/products-table'
import { getTranslator } from '@/lib/i18n/server'

export default async function ProductsPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: products, error } = await supabase
    .from('products')
    .select('*, category:categories(id, name)')
    .order('sku', { ascending: true })

  if (error) {
    return <div className="text-red-600">{t('errors.serverError')}: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('products.title')}</h1>
          <p className="text-gray-600">{t('products.subtitle')}</p>
        </div>
        <Link href="/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('products.newProduct')}
          </Button>
        </Link>
      </div>

      <ProductsTable data={products || []} />
    </div>
  )
}
