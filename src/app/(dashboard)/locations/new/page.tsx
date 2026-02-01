import { createClient } from '@/lib/supabase/server'
import { LocationForm } from '@/components/forms/location-form'

export default async function NewLocationPage() {
  const supabase = await createClient()

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Location</h1>
        <p className="text-gray-600">Add a new warehouse, store, or outlet</p>
      </div>
      <LocationForm locations={locations || []} />
    </div>
  )
}
