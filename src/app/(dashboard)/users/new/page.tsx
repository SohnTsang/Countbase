import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { UserForm } from '@/components/forms/user-form'
import { getAssignableRoles } from '@/lib/actions/users'

export default async function NewUserPage() {
  const supabase = await createClient()

  // Get current user and check if admin or manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only admins and managers can create users
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
    redirect('/')
  }

  // Get roles this user can assign
  const assignableRoles = await getAssignableRoles()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New User</h1>
          <p className="text-gray-600">Add a new team member</p>
        </div>
      </div>

      <UserForm assignableRoles={assignableRoles} />
    </div>
  )
}
