import { createClient } from '@/lib/supabase/server'
import { ErrorSeverity, ErrorType } from '@/types'

// Generate a hash for error grouping
function generateErrorHash(message: string, stackTrace?: string): string {
  const input = `${message}:${stackTrace?.split('\n')[0] || ''}`
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

// Generate a fingerprint for exact deduplication
function generateFingerprint(
  message: string,
  stackTrace?: string,
  url?: string
): string {
  const cleanStack = stackTrace
    ?.split('\n')
    .slice(0, 3)
    .map(line => line.replace(/:\d+:\d+/g, ''))
    .join('|') || ''
  return generateErrorHash(`${message}:${cleanStack}:${url || ''}`)
}

export interface ServerErrorLogPayload {
  message: string
  stack?: string
  type?: ErrorType
  severity?: ErrorSeverity
  url?: string
  method?: string
  statusCode?: number
  metadata?: Record<string, unknown>
  tags?: string[]
  userId?: string
  tenantId?: string
  ipAddress?: string
  userAgent?: string
}

// Server-side error logger (for use in server actions and API routes)
export async function logServerError(payload: ServerErrorLogPayload): Promise<void> {
  try {
    const supabase = await createClient()

    const errorHash = generateErrorHash(payload.message, payload.stack)
    const fingerprint = generateFingerprint(payload.message, payload.stack, payload.url)

    // Use the database function for upsert
    await supabase.rpc('upsert_error_log', {
      p_error_hash: errorHash,
      p_fingerprint: fingerprint,
      p_error_type: payload.type || 'server',
      p_severity: payload.severity || 'error',
      p_message: payload.message,
      p_stack_trace: payload.stack || null,
      p_url: payload.url || null,
      p_method: payload.method || null,
      p_status_code: payload.statusCode || null,
      p_user_agent: payload.userAgent || null,
      p_ip_address: payload.ipAddress || null,
      p_user_id: payload.userId || null,
      p_tenant_id: payload.tenantId || null,
      p_metadata: payload.metadata || {},
      p_tags: payload.tags || [],
    })
  } catch (e) {
    // Silently fail - don't create infinite error loops
    console.error('[ServerErrorLogger] Failed to log error:', e)
  }
}

// Server-side convenience methods
export const serverErrorLogger = {
  // Database errors
  database: (error: Error, query?: string, metadata?: Record<string, unknown>) =>
    logServerError({
      message: error.message,
      stack: error.stack,
      type: 'database',
      severity: 'error',
      metadata: { ...metadata, query },
    }),

  // Server action errors
  action: (
    actionName: string,
    error: Error,
    metadata?: Record<string, unknown>
  ) =>
    logServerError({
      message: `${actionName}: ${error.message}`,
      stack: error.stack,
      type: 'server',
      severity: 'error',
      metadata: { ...metadata, action: actionName },
    }),

  // API route errors
  apiRoute: (
    route: string,
    method: string,
    error: Error,
    statusCode: number = 500,
    metadata?: Record<string, unknown>
  ) =>
    logServerError({
      message: error.message,
      stack: error.stack,
      type: 'api',
      severity: statusCode >= 500 ? 'error' : 'warning',
      url: route,
      method,
      statusCode,
      metadata,
    }),

  // Auth errors
  auth: (message: string, userId?: string, metadata?: Record<string, unknown>) =>
    logServerError({
      message,
      type: 'auth',
      severity: 'warning',
      userId,
      metadata,
    }),

  // Custom error
  custom: (payload: ServerErrorLogPayload) => logServerError(payload),
}
