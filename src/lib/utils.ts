import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Map app locales to Intl locale codes
const localeMap: Record<string, string> = {
  en: 'en-US',
  ja: 'ja-JP',
  es: 'es-ES',
  zh: 'zh-CN',
}

export function formatCurrency(amount: number, currency = 'USD', locale = 'en'): string {
  const intlLocale = localeMap[locale] || 'en-US'
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: string | Date, locale = 'en'): string {
  const intlLocale = localeMap[locale] || 'en-US'
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date, locale = 'en'): string {
  const intlLocale = localeMap[locale] || 'en-US'
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
