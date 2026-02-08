import { Suspense } from 'react'
import { AcceptInvitationForm } from '@/components/forms/accept-invitation-form'
import { getInvitationByToken } from '@/lib/actions/invitations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Building2, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

async function AcceptInvitationContent({ token }: { token: string }) {
  const { invitation, error } = await getInvitationByToken(token)

  if (error || !invitation) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Invalid Invitation</CardTitle>
          <CardDescription>
            {error || 'This invitation is no longer valid'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-gray-500 mb-4">
            The invitation may have expired or already been used.
            Please contact your administrator for a new invitation.
          </p>
          <Link href="/login">
            <Button variant="outline">Go to Login</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const tenant = invitation.tenant as { name: string } | undefined

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <Building2 className="h-6 w-6 text-emerald-600" />
        </div>
        <CardTitle>Accept Invitation</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join <strong>{tenant?.name || 'an organization'}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="font-medium">{invitation.email}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">Role</span>
            <span className="font-medium capitalize">{invitation.role}</span>
          </div>
        </div>
        <AcceptInvitationForm token={token} email={invitation.email} />
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-6 w-32 mx-auto bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-48 mx-auto mt-2 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AcceptInvitationPage({ searchParams }: PageProps) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Missing Token</CardTitle>
            <CardDescription>
              No invitation token was provided
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              Please use the link from your invitation email.
            </p>
            <Link href="/login">
              <Button variant="outline">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<LoadingSkeleton />}>
        <AcceptInvitationContent token={token} />
      </Suspense>
    </div>
  )
}
