import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CategoryForm } from '@/components/forms/category-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCategoryPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [categoryRes, categoriesRes] = await Promise.all([
    supabase.from('categories').select('*').eq('id', id).single(),
    supabase.from('categories').select('*').order('name'),
  ])

  if (categoryRes.error || !categoryRes.data) {
    notFound()
  }

  return (
    <CategoryForm
      category={categoryRes.data}
      categories={categoriesRes.data || []}
    />
  )
}
