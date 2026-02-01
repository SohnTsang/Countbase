import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/forms/product-form'

export default async function NewProductPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Product</h1>
        <p className="text-gray-600">Add a new product to your catalog</p>
      </div>

      <ProductForm categories={categories || []} />
    </div>
  )
}
