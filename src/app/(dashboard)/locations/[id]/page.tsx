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
    <LocationForm
      location={locationResult.data}
      locations={locationsResult.data || []}
    />
  )
}
