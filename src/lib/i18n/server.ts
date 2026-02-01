import { cookies } from 'next/headers'
import { type Locale, defaultLocale, isValidLocale } from './config'
import { getMessages as loadMessages, getNestedValue } from './get-messages'

const LOCALE_COOKIE_NAME = 'NEXT_LOCALE'

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value

  if (localeCookie && isValidLocale(localeCookie)) {
    return localeCookie
  }

  return defaultLocale
}

export async function getServerMessages() {
  const locale = await getLocale()
  return loadMessages(locale)
}

export async function getTranslator() {
  const messages = await getServerMessages()
  return (key: string): string => getNestedValue(messages, key)
}

export { loadMessages as getMessages }
