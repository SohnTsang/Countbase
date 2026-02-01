'use client'

import { useEffect } from 'react'
import { ErrorBoundary } from '@/components/error-boundary'
import { setupGlobalErrorHandlers } from '@/lib/error-logger'

interface ErrorProviderProps {
  children: React.ReactNode
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  useEffect(() => {
    setupGlobalErrorHandlers()
  }, [])

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}
