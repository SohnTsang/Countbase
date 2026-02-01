import { type Locale, defaultLocale } from './config'

export async function getMessages(locale: Locale) {
  try {
    return (await import(`../../../messages/${locale}.json`)).default
  } catch {
    return (await import(`../../../messages/${defaultLocale}.json`)).default
  }
}

export function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let result: unknown = obj

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      return path // Return the path if translation not found
    }
  }

  return typeof result === 'string' ? result : path
}
