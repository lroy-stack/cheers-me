import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/utils/auth'
import { AuthProvider } from '@/components/providers/auth-provider'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

export const metadata = {
  title: 'AI Assistant | GrandCafe Cheers',
  description: 'AI-powered assistant for GrandCafe Cheers restaurant management',
}

export default async function AssistantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userData = await getCurrentUser()

  if (!userData?.profile) {
    redirect('/login')
  }

  const locale = await getLocale()
  const messages = await getMessages({ locale })

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider
        user={userData?.user ?? null}
        profile={userData?.profile ?? null}
      >
        {children}
      </AuthProvider>
    </NextIntlClientProvider>
  )
}
