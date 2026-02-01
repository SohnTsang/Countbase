import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    // Get request context
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || undefined
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIp = headersList.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || undefined

    // Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser()
    let tenantId: string | undefined

    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      tenantId = userData?.tenant_id
    }

    // Validate required fields
    if (!body.message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Use the database function for upsert (handles deduplication)
    const { error } = await supabase.rpc('upsert_error_log', {
      p_error_hash: body.error_hash || generateHash(body.message),
      p_fingerprint: body.fingerprint || null,
      p_error_type: body.error_type || 'unknown',
      p_severity: body.severity || 'error',
      p_message: body.message,
      p_stack_trace: body.stack_trace || null,
      p_url: body.url || null,
      p_method: body.method || null,
      p_status_code: body.status_code || null,
      p_user_agent: userAgent,
      p_ip_address: ipAddress,
      p_user_id: user?.id || null,
      p_tenant_id: tenantId || null,
      p_metadata: body.metadata || {},
      p_tags: body.tags || [],
    })

    if (error) {
      console.error('[API/errors] Failed to log error:', error)
      return NextResponse.json(
        { error: 'Failed to log error' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API/errors] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}
