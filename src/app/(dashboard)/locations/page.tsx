import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { LocationsTable } from '@/components/tables/locations-table'
import { getTranslator } from '@/lib/i18n/server'

export default async function LocationsPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: locations, error } = await supabase
    .from('locations')
    .select('*')
    .order('name')

  if (error) {
    return <div className="text-red-600">{t('errors.serverError')}: {error.message}</div>
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

      <LocationsTable data={locations || []} />
    </div>
  )
}
