'use server'

import { createClient } from '@/lib/supabase/server'
import type { AuditAction, AuditResourceType } from '@/types'

export interface AuditLogInput {
  action: AuditAction
  resourceType: AuditResourceType
  resourceId?: string | null
  resourceName?: string | null
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  changes?: Record<string, unknown> | null
  notes?: string | null
}

/**
 * Creates an audit log entry for tracking user actions
 * This should be called after successful operations
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[AUDIT] No authenticated user, skipping audit log')
      return
    }

    // Get user details
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id, name, email')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.error('[AUDIT] User data not found, skipping audit log')
      return
    }

    // Insert audit log
    const { error } = await supabase.from('audit_logs').insert({
      tenant_id: userData.tenant_id,
      user_id: user.id,
      user_name: userData.name,
      user_email: userData.email,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId || null,
      resource_name: input.resourceName || null,
      old_values: input.oldValues || null,
      new_values: input.newValues || null,
      changes: input.changes || null,
      notes: input.notes || null,
    })

    if (error) {
      console.error('[AUDIT] Failed to create audit log:', error)
    }
  } catch (error) {
    console.error('[AUDIT] Error creating audit log:', error)
  }
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(options?: {
  resourceType?: AuditResourceType
  resourceId?: string
  action?: AuditAction
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}) {
  const supabase = await createClient()

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (options?.resourceType) {
    query = query.eq('resource_type', options.resourceType)
  }

  if (options?.resourceId) {
    query = query.eq('resource_id', options.resourceId)
  }

  if (options?.action) {
    query = query.eq('action', options.action)
  }

  if (options?.userId) {
    query = query.eq('user_id', options.userId)
  }

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate)
  }

  if (options?.endDate) {
    query = query.lte('created_at', options.endDate)
  }

  const limit = options?.limit || 50
  const offset = options?.offset || 0

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(error.message)
  }

  return { data, count }
}
