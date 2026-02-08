import { createClient } from '@/lib/supabase/server'
import { CategoryForm } from '@/components/forms/category-form'

export default async function NewCategoryPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  return <CategoryForm categories={categories || []} />
}
