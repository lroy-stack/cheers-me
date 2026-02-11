import type { Metadata, Viewport } from 'next'
import { Inter, Lora, Fira_Code } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { PwaProvider } from '@/components/pwa/pwa-provider'
import { SWRProvider } from '@/components/providers/swr-provider'
import { ThemeInjector } from '@/components/providers/theme-injector'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
})

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#5c1520' },
    { media: '(prefers-color-scheme: dark)', color: '#1a0a0e' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'GrandCafe Cheers Manager',
  description: 'Restaurant management platform for GrandCafe Cheers Mallorca',
  manifest: '/manifest.json',
  applicationName: 'GrandCafe Cheers Manager',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cheers Manager',
  },
  formatDetection: {
    telephone: false,
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Cheers Manager" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.variable} ${lora.variable} ${firaCode.variable} font-sans`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
          >
            <SWRProvider>
              <ThemeInjector />
              <PwaProvider>
                {children}
              </PwaProvider>
            </SWRProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
