import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/forms/product-form'

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [productResult, categoriesResult] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('categories')
      .select('*')
      .order('name'),
  ])

  if (productResult.error || !productResult.data) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        <p className="text-gray-600">Update product information</p>
      </div>

      <ProductForm
        product={productResult.data}
        categories={categoriesResult.data || []}
      />
    </div>
  )
}
