import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { LocationsTable } from '@/components/tables/locations-table'
import { getTranslator } from '@/lib/i18n/server'

export default async function LocationsPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: rawLocations, error } = await supabase
    .from('locations')
    .select('*')
    .order('name')

  if (error) {
    return <div className="text-red-600">{t('errors.serverError')}: {error.message}</div>
  }

  // Manually map parent data and sort hierarchically
  const locationsWithParent = rawLocations?.map(location => {
    const parent = location.parent_id
      ? rawLocations.find(l => l.id === location.parent_id)
      : null
    return {
      ...location,
      parent: parent ? { id: parent.id, name: parent.name } : null,
      isChild: !!location.parent_id,
    }
  }) || []

  // Build hierarchical list: parent followed by its children
  const rootLocations = locationsWithParent
    .filter(l => !l.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name))

  const locations: typeof locationsWithParent = []
  for (const parent of rootLocations) {
    locations.push(parent)
    // Add children immediately after their parent
    const children = locationsWithParent
      .filter(l => l.parent_id === parent.id)
      .sort((a, b) => a.name.localeCompare(b.name))
    locations.push(...children)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('locations.title')}</h1>
          <p className="text-gray-600">{t('locations.subtitle')}</p>
        </div>
        <Link href="/locations/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('locations.newLocation')}
          </Button>
        </Link>
      </div>

      <LocationsTable data={locations} />
    </div>
  )
}
