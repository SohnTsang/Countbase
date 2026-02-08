import { notFound } from 'next/navigation'
import { getTenantDetails } from '@/lib/actions/tenants'
import { TenantForm } from '@/components/forms/tenant-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditTenantPage({ params }: PageProps) {
  const { id } = await params
  const { tenant, users, error } = await getTenantDetails(id)

  if (error || !tenant) {
    notFound()
  }

  const activeUserCount = users.filter((u) => u.active).length

  return <TenantForm tenant={tenant} userCount={activeUserCount} />
}
