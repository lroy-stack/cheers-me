'use client'

import { motion, useInView } from 'framer-motion'
import { Star, Instagram, Gift, ArrowRight, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { useBookingLanguage } from './booking-language-provider'
import Link from 'next/link'

const REVIEWS = [
  {
    text: '"Best beach bar in Mallorca! The food was amazing and the atmosphere was electric. Will definitely be back!"',
    author: 'Thomas V.',
    flag: '\u{1F1F3}\u{1F1F1}',
    rating: 5,
  },
  {
    text: '"Fantastic cocktails and the DJ was brilliant. Perfect spot for a night out on the beach!"',
    author: 'Sarah M.',
    flag: '\u{1F1EC}\u{1F1E7}',
    rating: 5,
  },
  {
    text: '"World Kitchen Konzept ist unglaublich! Tolles Personal, tolle Stimmung, toller Ort."',
    author: 'Markus K.',
    flag: '\u{1F1E9}\u{1F1EA}',
    rating: 5,
  },
  {
    text: '"De cocktails waren geweldig en de sfeer was fantastisch. Zeker een aanrader!"',
    author: 'Lisa B.',
    flag: '\u{1F1F3}\u{1F1F1}',
    rating: 5,
  },
]

/** Animated counter for the rating */
function RatingCounter() {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const duration = 1200
    const start = performance.now()
    const target = 4.8

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target * 10) / 10)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView])

  return <span ref={ref}>{value.toFixed(1)}</span>
}

/** Inline newsletter form */
function InlineNewsletter() {
  const { t, language } = useBookingLanguage()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/marketing/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language, gdpr_consent: true }),
      })
      setStatus(res.ok ? 'success' : 'error')
      if (res.ok) setEmail('')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 text-sm text-green-400"
      >
        <CheckCircle2 className="w-4 h-4" />
        {t('newsletter.successTitle')}
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm">
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('newsletter.emailPlaceholder')}
          className="w-full pl-10 pr-4 py-2.5 rounded-full bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-5 py-2.5 rounded-full bg-primary text-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
      >
        {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : t('newsletter.subscribe')}
      </button>
    </form>
  )
}

export default function SocialProof() {
  const { t } = useBookingLanguage()

  return (
    <section className="dark relative py-16 sm:py-20 px-4 bg-background text-foreground overflow-hidden">
      {/* Subtle radial glow using semantic primary token */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(var(--primary)/0.08)_0%,transparent_60%)]" />

      <div className="relative z-10 max-w-5xl mx-auto space-y-12 sm:space-y-16">
        {/* Google Rating */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-6xl sm:text-7xl font-extralight tracking-tight text-foreground">
            <RatingCounter />
          </p>
          <div className="flex justify-center gap-1 mt-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i <= 4 ? 'text-primary fill-primary' : 'text-primary/50 fill-primary/30'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground/60 mt-2">{t('socialProof.onGoogleReviews')}</p>
        </motion.div>

        {/* Reviews — horizontal scroll */}
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
          {REVIEWS.map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="shrink-0 w-[300px] sm:w-[340px] snap-start rounded-2xl bg-muted border border-border p-5 sm:p-6"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: review.rating }, (_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                {review.text}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-3">
                {review.flag} {review.author}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Instagram link */}
        <div className="text-center">
          <a
            href="https://instagram.com/cheersmallorca"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-primary transition-colors"
          >
            <Instagram className="w-4 h-4" />
            {t('socialProof.followersCount')}
          </a>
        </div>

        {/* Newsletter + Gift voucher row */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="border-t border-border pt-10 sm:pt-12"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
            {/* Newsletter */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">
                {t('newsletter.heading')}
              </h3>
              <p className="text-sm text-muted-foreground/60">
                {t('newsletter.description')}
              </p>
              <InlineNewsletter />
              <p className="text-[10px] text-muted-foreground/30">
                {t('newsletter.consentLabel')}{' '}
                <a href="/legal/privacy" className="underline hover:no-underline" target="_blank" rel="noopener noreferrer">
                  {t('newsletter.consentLink')}
                </a>
              </p>
            </div>

            {/* Gift voucher banner */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-muted border border-border">
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-foreground text-sm">
                  {t('giftVoucher.heading')}
                </h3>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {t('giftVoucher.fromAmount')}
                </p>
              </div>
              <Link
                href="/gift"
                className="shrink-0 inline-flex items-center gap-1 text-sm text-primary font-medium hover:text-primary/80 transition-colors"
              >
                {t('giftVoucher.buyNow')}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
