import Link from 'next/link'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from '@/components/auth/login-form'
import { ThemeToggle } from '@/components/theme-toggle'
import { Clock, BookOpen, Smartphone } from 'lucide-react'

export const metadata = {
  title: 'Login | GrandCafe Cheers',
  description: 'Sign in to GrandCafe Cheers management platform',
}

export default async function LoginPage() {
  const t = await getTranslations('auth.page')

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-muted p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-8">
        {/* Logo Section */}
        <div className="flex flex-col items-center space-y-4">
          <Image
            src="/icons/logoheader.png"
            alt="Cheers Mallorca"
            width={80}
            height={80}
            className="shadow-lg"
            priority
          />
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {t('title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Public Access Links */}
        <div className="space-y-3">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('publicAccess')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/kiosk"
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border px-3 py-3 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <Clock className="h-5 w-5" />
              {t('employeeKiosk')}
            </Link>
            <Link
              href="/booking"
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border px-3 py-3 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <BookOpen className="h-5 w-5" />
              {t('bookTable')}
            </Link>
            <Link
              href="/menu/digital"
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border px-3 py-3 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <Smartphone className="h-5 w-5" />
              {t('viewMenu')}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>{t('address')}</p>
          <p className="mt-1">{t('social')}</p>
        </div>
      </div>
    </div>
  )
}
