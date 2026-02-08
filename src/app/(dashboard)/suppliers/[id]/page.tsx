import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SupplierForm } from '@/components/forms/supplier-form'

interface EditSupplierPageProps {
  params: Promise<{ id: string }>
}

export default async function EditSupplierPage({ params }: EditSupplierPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: supplier, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !supplier) {
    notFound()
  }

  return <SupplierForm supplier={supplier} />
}
