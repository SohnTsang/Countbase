export const locales = ['en', 'ja', 'zh'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  zh: '简体中文',
}

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}
