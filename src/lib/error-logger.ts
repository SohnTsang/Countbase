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

export interface ErrorLogPayload {
  message: string
  stack?: string
  type?: ErrorType
  severity?: ErrorSeverity
  url?: string
  method?: string
  statusCode?: number
  metadata?: Record<string, unknown>
  tags?: string[]
}

// Client-side error logger
export async function logError(payload: ErrorLogPayload): Promise<void> {
  try {
    const errorHash = generateErrorHash(payload.message, payload.stack)
    const fingerprint = generateFingerprint(payload.message, payload.stack, payload.url)

    const body = {
      error_hash: errorHash,
      fingerprint,
      error_type: payload.type || 'unknown',
      severity: payload.severity || 'error',
      message: payload.message,
      stack_trace: payload.stack,
      url: payload.url || (typeof window !== 'undefined' ? window.location.href : undefined),
      method: payload.method,
      status_code: payload.statusCode,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      metadata: payload.metadata || {},
      tags: payload.tags || [],
    }

    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    // Silently fail - don't create infinite error loops
    console.error('[ErrorLogger] Failed to log error:', e)
  }
}

// Convenience methods for different error types
export const errorLogger = {
  // Client-side errors
  client: (error: Error, metadata?: Record<string, unknown>) =>
    logError({
      message: error.message,
      stack: error.stack,
      type: 'client',
      severity: 'error',
      metadata,
    }),

  // React component errors
  react: (error: Error, componentStack: string, metadata?: Record<string, unknown>) =>
    logError({
      message: error.message,
      stack: error.stack,
      type: 'client',
      severity: 'error',
      metadata: {
        ...metadata,
        componentStack,
        errorType: 'react_boundary',
      },
    }),

  // API errors
  api: (
    message: string,
    statusCode: number,
    metadata?: Record<string, unknown>
  ) =>
    logError({
      message,
      type: 'api',
      severity: statusCode >= 500 ? 'error' : 'warning',
      statusCode,
      metadata,
    }),

  // Network errors
  network: (error: Error, url: string, method: string) =>
    logError({
      message: error.message,
      stack: error.stack,
      type: 'network',
      severity: 'error',
      url,
      method,
    }),

  // Auth errors
  auth: (message: string, metadata?: Record<string, unknown>) =>
    logError({
      message,
      type: 'auth',
      severity: 'warning',
      metadata,
    }),

  // Validation errors
  validation: (message: string, metadata?: Record<string, unknown>) =>
    logError({
      message,
      type: 'validation',
      severity: 'info',
      metadata,
    }),

  // Fatal errors
  fatal: (error: Error, metadata?: Record<string, unknown>) =>
    logError({
      message: error.message,
      stack: error.stack,
      type: 'unknown',
      severity: 'fatal',
      metadata,
    }),

  // Custom error
  custom: (payload: ErrorLogPayload) => logError(payload),
}

// Setup global error handlers (call once in app initialization)
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason))

    logError({
      message: `Unhandled Promise Rejection: ${error.message}`,
      stack: error.stack,
      type: 'client',
      severity: 'error',
      metadata: { unhandledRejection: true },
    })
  })

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    // Ignore ResizeObserver errors (browser noise)
    if (event.message?.includes('ResizeObserver')) return

    logError({
      message: event.message || 'Unknown error',
      stack: event.error?.stack,
      type: 'client',
      severity: 'error',
      url: event.filename,
      metadata: {
        lineno: event.lineno,
        colno: event.colno,
        uncaughtError: true,
      },
    })
  })
}
