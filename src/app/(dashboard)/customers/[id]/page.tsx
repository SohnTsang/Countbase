import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CustomerForm } from '@/components/forms/customer-form'

interface EditCustomerPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !customer) {
    notFound()
  }

  return <CustomerForm customer={customer} />
}
