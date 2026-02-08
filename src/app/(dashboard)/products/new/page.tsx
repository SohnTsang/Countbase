import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/forms/product-form'

export default async function NewProductPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  return <ProductForm categories={categories || []} />
}
