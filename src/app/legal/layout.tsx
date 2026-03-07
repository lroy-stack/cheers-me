import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Shield, Cookie, FileText, ScrollText, RotateCcw, UserCog } from 'lucide-react'

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('legal')

  const navLinks = [
    { href: '/legal/privacy', label: t('nav.privacy'), icon: Shield },
    { href: '/legal/cookies', label: t('nav.cookies'), icon: Cookie },
    { href: '/legal/aviso-legal', label: t('nav.avisoLegal'), icon: FileText },
    { href: '/legal/terms', label: t('nav.terms'), icon: ScrollText },
    { href: '/legal/refund', label: t('nav.refund'), icon: RotateCcw },
    { href: '/legal/data-request', label: t('nav.dataRequest'), icon: UserCog },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="md:w-56 shrink-0">
            <nav className="sticky top-8 space-y-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
