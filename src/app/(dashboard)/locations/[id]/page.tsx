import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LocationForm } from '@/components/forms/location-form'

interface EditLocationPageProps {
  params: Promise<{ id: string }>
}

export default async function EditLocationPage({ params }: EditLocationPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [locationResult, locationsResult] = await Promise.all([
    supabase.from('locations').select('*').eq('id', id).single(),
    supabase.from('locations').select('*').order('name'),
  ])

  if (locationResult.error || !locationResult.data) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Location</h1>
        <p className="text-gray-600">Update location details</p>
      </div>
      <LocationForm
        location={locationResult.data}
        locations={locationsResult.data || []}
      />
    </div>
  )
}
