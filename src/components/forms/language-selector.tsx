'use client'

import { useTranslation } from '@/lib/i18n'
import { locales, localeNames, type Locale } from '@/lib/i18n/config'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function LanguageSelector() {
  const { locale, setLocale } = useTranslation()
  const router = useRouter()

  const handleLanguageChange = (value: string) => {
    setLocale(value as Locale)
    // Refresh the page to update server components with new language
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-gray-500" />
      <Select value={locale} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {locales.map((loc) => (
            <SelectItem key={loc} value={loc}>
              {localeNames[loc]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
