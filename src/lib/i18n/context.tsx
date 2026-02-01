'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { type Locale, defaultLocale, isValidLocale } from './config'
import { getNestedValue } from './get-messages'

type Messages = Record<string, unknown>

interface TranslationContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
  messages: Messages
}

const TranslationContext = createContext<TranslationContextValue | null>(null)

const LOCALE_COOKIE_NAME = 'NEXT_LOCALE'

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift()
  return undefined
}

function setCookie(name: string, value: string, days: number = 365) {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

interface TranslationProviderProps {
  children: ReactNode
  initialLocale?: Locale
  messages: Messages
}

export function TranslationProvider({
  children,
  initialLocale,
  messages: initialMessages,
}: TranslationProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || defaultLocale)
  const [messages, setMessages] = useState<Messages>(initialMessages)

  useEffect(() => {
    // Check cookie on mount
    const savedLocale = getCookie(LOCALE_COOKIE_NAME)
    if (savedLocale && isValidLocale(savedLocale) && savedLocale !== locale) {
      setLocaleState(savedLocale)
      // Load messages for saved locale
      import(`../../../messages/${savedLocale}.json`)
        .then((mod) => setMessages(mod.default))
        .catch(() => {})
    }
  }, [])

  const setLocale = useCallback(async (newLocale: Locale) => {
    if (newLocale === locale) return

    try {
      const newMessages = (await import(`../../../messages/${newLocale}.json`)).default
      setMessages(newMessages)
      setLocaleState(newLocale)
      setCookie(LOCALE_COOKIE_NAME, newLocale)
      // Refresh the page to apply server-side changes
      window.location.reload()
    } catch (error) {
      console.error('Failed to load locale:', error)
    }
  }, [locale])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let translation = getNestedValue(messages, key)

      if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
          translation = translation.replace(`{${paramKey}}`, String(value))
        })
      }

      return translation
    },
    [messages]
  )

  return (
    <TranslationContext.Provider value={{ locale, setLocale, t, messages }}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
}
