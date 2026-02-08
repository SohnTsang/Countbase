import { createClient } from '@/lib/supabase/server'
import { LocationForm } from '@/components/forms/location-form'

export default async function NewLocationPage() {
  const supabase = await createClient()

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .order('name')

  return <LocationForm locations={locations || []} />
}
