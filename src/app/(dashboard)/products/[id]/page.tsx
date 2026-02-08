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
    <ProductForm
      product={productResult.data}
      categories={categoriesResult.data || []}
    />
  )
}
