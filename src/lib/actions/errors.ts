'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ErrorLog, ErrorLogFilters, ErrorStats, ErrorStatus, ErrorSeverity, ErrorType } from '@/types'

// Check if current user is platform admin
async function requirePlatformAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_platform_admin) {
    throw new Error('Access denied: Platform admin required')
  }

  return user
}

// Get error logs with filtering and pagination
export async function getErrorLogs(
  filters: ErrorLogFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: ErrorLog[]; total: number; error?: string }> {
  try {
    const supabase = await createClient()
    await requirePlatformAdmin(supabase)

    let query = supabase
      .from('error_logs')
      .select('*, user:users!error_logs_user_id_fkey(id, name, email), resolver:users!error_logs_resolved_by_fkey(id, name, email), tenant:tenants(id, name)', { count: 'exact' })

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters.severity && filters.severity !== 'all') {
      query = query.eq('severity', filters.severity)
    }
    if (filters.error_type && filters.error_type !== 'all') {
      query = query.eq('error_type', filters.error_type)
    }
    if (filters.search) {
      query = query.ilike('message', `%${filters.search}%`)
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    query = query
      .order('last_seen_at', { ascending: false })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[getErrorLogs] Error:', error)
      return { data: [], total: 0, error: error.message }
    }

    return { data: data || [], total: count || 0 }
  } catch (error) {
    console.error('[getErrorLogs] Exception:', error)
    return { data: [], total: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get a single error log by ID
export async function getErrorLog(id: string): Promise<{ data: ErrorLog | null; error?: string }> {
  try {
    const supabase = await createClient()
    await requirePlatformAdmin(supabase)

    const { data, error } = await supabase
      .from('error_logs')
      .select('*, user:users!error_logs_user_id_fkey(id, name, email), resolver:users!error_logs_resolved_by_fkey(id, name, email), tenant:tenants(id, name)')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Update error status
export async function updateErrorStatus(
  id: string,
  status: ErrorStatus,
  resolutionNote?: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const user = await requirePlatformAdmin(supabase)

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'resolved' || status === 'ignored') {
      updateData.resolved_by = user.id
      updateData.resolved_at = new Date().toISOString()
      if (resolutionNote) {
        updateData.resolution_note = resolutionNote
      }
    } else {
      updateData.resolved_by = null
      updateData.resolved_at = null
      updateData.resolution_note = null
    }

    const { error } = await supabase
      .from('error_logs')
      .update(updateData)
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/error-logs')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Bulk update error status
export async function bulkUpdateErrorStatus(
  ids: string[],
  status: ErrorStatus,
  resolutionNote?: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const user = await requirePlatformAdmin(supabase)

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'resolved' || status === 'ignored') {
      updateData.resolved_by = user.id
      updateData.resolved_at = new Date().toISOString()
      if (resolutionNote) {
        updateData.resolution_note = resolutionNote
      }
    }

    const { error } = await supabase
      .from('error_logs')
      .update(updateData)
      .in('id', ids)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/error-logs')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Delete error log
export async function deleteErrorLog(id: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    await requirePlatformAdmin(supabase)

    const { error } = await supabase
      .from('error_logs')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/error-logs')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Bulk delete error logs
export async function bulkDeleteErrorLogs(ids: string[]): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    await requirePlatformAdmin(supabase)

    const { error } = await supabase
      .from('error_logs')
      .delete()
      .in('id', ids)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/error-logs')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get error statistics
export async function getErrorStats(): Promise<{ data: ErrorStats | null; error?: string }> {
  try {
    const supabase = await createClient()
    await requirePlatformAdmin(supabase)

    // Get counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('error_logs')
      .select('status')

    if (statusError) {
      return { data: null, error: statusError.message }
    }

    // Get counts by severity
    const { data: severityCounts, error: severityError } = await supabase
      .from('error_logs')
      .select('severity')

    if (severityError) {
      return { data: null, error: severityError.message }
    }

    // Get counts by type
    const { data: typeCounts, error: typeError } = await supabase
      .from('error_logs')
      .select('error_type')

    if (typeError) {
      return { data: null, error: typeError.message }
    }

    // Get trend (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: trendData, error: trendError } = await supabase
      .from('error_logs')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())

    if (trendError) {
      return { data: null, error: trendError.message }
    }

    // Process counts
    const stats: ErrorStats = {
      total: statusCounts?.length || 0,
      open: statusCounts?.filter(e => e.status === 'open').length || 0,
      investigating: statusCounts?.filter(e => e.status === 'investigating').length || 0,
      resolved: statusCounts?.filter(e => e.status === 'resolved').length || 0,
      ignored: statusCounts?.filter(e => e.status === 'ignored').length || 0,
      bySeverity: {
        info: severityCounts?.filter(e => e.severity === 'info').length || 0,
        warning: severityCounts?.filter(e => e.severity === 'warning').length || 0,
        error: severityCounts?.filter(e => e.severity === 'error').length || 0,
        fatal: severityCounts?.filter(e => e.severity === 'fatal').length || 0,
      },
      byType: {
        client: typeCounts?.filter(e => e.error_type === 'client').length || 0,
        server: typeCounts?.filter(e => e.error_type === 'server').length || 0,
        api: typeCounts?.filter(e => e.error_type === 'api').length || 0,
        database: typeCounts?.filter(e => e.error_type === 'database').length || 0,
        auth: typeCounts?.filter(e => e.error_type === 'auth').length || 0,
        validation: typeCounts?.filter(e => e.error_type === 'validation').length || 0,
        network: typeCounts?.filter(e => e.error_type === 'network').length || 0,
        unknown: typeCounts?.filter(e => e.error_type === 'unknown').length || 0,
      },
      trend: processTrendData(trendData || []),
    }

    return { data: stats }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

function processTrendData(data: { created_at: string }[]): { date: string; count: number }[] {
  const trend: Record<string, number> = {}

  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    trend[dateKey] = 0
  }

  // Count errors per day
  data.forEach(error => {
    const dateKey = error.created_at.split('T')[0]
    if (trend[dateKey] !== undefined) {
      trend[dateKey]++
    }
  })

  return Object.entries(trend).map(([date, count]) => ({ date, count }))
}

// Check if current user is platform admin
export async function checkIsPlatformAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const { data } = await supabase
      .from('users')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single()

    return data?.is_platform_admin || false
  } catch {
    return false
  }
}
