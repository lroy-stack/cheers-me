'use client'

import { useBookingLanguage } from './booking-language-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import Image from 'next/image'

export default function BookingFooter() {
  const { t } = useBookingLanguage()

  const socialLinks = [
    { href: 'https://instagram.com/cheersmallorca', label: 'Instagram', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
    { href: 'https://facebook.com/cheersmallorca', label: 'Facebook', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
    { href: 'https://wa.me/34971XXXXXX', label: 'WhatsApp', path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' },
  ]

  return (
    <footer className="relative overflow-hidden bg-muted">
      <div className="relative z-10">
        {/* Brand logo */}
        <div className="text-center mb-8 pt-12 sm:pt-14">
          <Image src="/logofooter.png" alt="Cheers Mallorca" width={200} height={100} className="mx-auto" />
        </div>

        {/* Contact grid */}
        <div className="pb-12 sm:pb-14 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
              {/* Visit Us */}
              <div className="text-center space-y-2.5">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-1">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-medium text-foreground text-sm">{t('footer.visitUs')}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Carrer de Cartago 22<br />
                  El Arenal (Platja de Palma)<br />
                  Mallorca 07600
                </p>
                <a
                  href="https://maps.google.com/?q=Carrer+de+Cartago+22,+El+Arenal,+Mallorca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  {t('footer.getDirections')} &rarr;
                </a>
              </div>

              {/* Contact */}
              <div className="text-center space-y-2.5">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-1">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="font-medium text-foreground text-sm">{t('footer.contact')}</h3>
                <div className="space-y-1 text-xs">
                  <p>
                    <a href="tel:+34971XXXXXX" className="text-muted-foreground hover:text-primary transition-colors">
                      +34 971 XXX XXX
                    </a>
                  </p>
                  <p>
                    <a href="mailto:info@cheersmallorca.com" className="text-muted-foreground hover:text-primary transition-colors">
                      info@cheersmallorca.com
                    </a>
                  </p>
                </div>
              </div>

              {/* Hours & Socials */}
              <div className="text-center space-y-2.5">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-1">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-medium text-foreground text-sm">{t('footer.hours')}</h3>
                <p className="text-xs text-muted-foreground">
                  {t('footer.seasonDates')}<br />
                  {t('footer.dailyHours')}
                </p>
                {/* Social links */}
                <div className="flex items-center justify-center gap-2.5 pt-1">
                  {socialLinks.map(({ href, label, path }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-primary/20 transition-colors"
                      aria-label={label}
                    >
                      <svg className="w-3.5 h-3.5 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                        <path d={path} />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border py-5 px-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <p className="text-[10px] text-muted-foreground/50">
                {t('footer.allRights')}
              </p>
            </div>

            <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground/50">
              <a href="/digital" className="hover:text-foreground transition-colors">{t('footer.digitalMenu')}</a>
              <a href="/legal/privacy" className="hover:text-foreground transition-colors">{t('footer.privacy')}</a>
              <a href="/legal/terms" className="hover:text-foreground transition-colors">{t('footer.terms')}</a>
              <a href="/legal/refund" className="hover:text-foreground transition-colors">{t('footer.refunds')}</a>
              <a href="/legal/aviso-legal" className="hover:text-foreground transition-colors">{t('footer.avisoLegal')}</a>
            </nav>
          </div>

          <p className="text-center text-[9px] text-muted-foreground/30 mt-3 max-w-4xl mx-auto">
            {t('footer.reclamaciones')} &bull;{' '}
            <a
              href="https://www.caib.es/sites/consum"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground transition-colors underline"
            >
              Consum &ndash; Govern de les Illes Balears
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
