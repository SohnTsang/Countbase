import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from 'sonner'
import { TranslationProvider } from '@/lib/i18n'
import { getLocale, getServerMessages } from '@/lib/i18n/server'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Inventory System',
  description: 'Multi-location inventory management',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getServerMessages()

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <QueryProvider>
          <TranslationProvider initialLocale={locale} messages={messages}>
            {children}
            <Toaster position="top-right" richColors />
          </TranslationProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
