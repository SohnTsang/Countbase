import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CategoriesTable } from '@/components/tables/categories-table'
import { getTranslator } from '@/lib/i18n/server'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: rawCategories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  // Manually map parent data and sort hierarchically
  const categoriesWithParent = rawCategories?.map(category => {
    const parent = category.parent_id
      ? rawCategories.find(c => c.id === category.parent_id)
      : null
    return {
      ...category,
      parent: parent ? { id: parent.id, name: parent.name } : null,
      isChild: !!category.parent_id,
    }
  }) || []

  // Build hierarchical list: parent followed by its children
  const rootCategories = categoriesWithParent
    .filter(c => !c.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name))

  const categories: typeof categoriesWithParent = []
  for (const parent of rootCategories) {
    categories.push(parent)
    // Add children immediately after their parent
    const children = categoriesWithParent
      .filter(c => c.parent_id === parent.id)
      .sort((a, b) => a.name.localeCompare(b.name))
    categories.push(...children)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('categories.title')}</h1>
          <p className="text-gray-600">{t('categories.subtitle')}</p>
        </div>
        <Link href="/categories/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('categories.newCategory')}
          </Button>
        </Link>
      </div>

      <CategoriesTable data={categories} />
    </div>
  )
}
