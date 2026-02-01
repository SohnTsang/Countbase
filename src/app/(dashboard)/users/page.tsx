import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { UsersTable } from '@/components/tables/users-table'
import { getTranslator } from '@/lib/i18n/server'

export default async function UsersPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  // Get current user and check if admin or manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  // Only admins and managers can access this page
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
    redirect('/')
  }

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
          <p className="text-gray-600">{t('users.subtitle')}</p>
        </div>
        <Link href="/users/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('users.newUser')}
          </Button>
        </Link>
      </div>

      <UsersTable
        data={users || []}
        currentUserId={currentUser.id}
        currentUserRole={currentUser.role}
      />
    </div>
  )
}
