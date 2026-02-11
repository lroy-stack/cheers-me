'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, CheckCircle2, Loader2 } from 'lucide-react'
import { useBookingLanguage } from './booking-language-provider'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function NewsletterSection() {
  const { t, language } = useBookingLanguage()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/marketing/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name || undefined,
          language,
        }),
      })

      if (res.ok) {
        setStatus('success')
        setEmail('')
        setName('')
      } else {
        const data = await res.json()
        if (data.error?.includes('already subscribed')) {
          setErrorMsg(t('newsletter.errorAlreadySubscribed'))
        } else {
          setErrorMsg(t('newsletter.errorGeneric'))
        }
        setStatus('error')
      }
    } catch {
      setErrorMsg(t('newsletter.errorGeneric'))
      setStatus('error')
    }
  }

  return (
    <section className="py-16 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-lg mx-auto text-center"
      >
        <Mail className="h-10 w-10 text-primary mx-auto mb-4" />
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {t('newsletter.heading')}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t('newsletter.description')}
        </p>

        {status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6"
          >
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-semibold text-green-800 dark:text-green-200">
              {t('newsletter.successTitle')}
            </p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              {t('newsletter.successDescription')}
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('newsletter.emailPlaceholder')}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('newsletter.namePlaceholder')}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email}
              className="w-full px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('newsletter.subscribing')}
                </>
              ) : (
                t('newsletter.subscribe')
              )}
            </button>
            {status === 'error' && errorMsg && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}
          </form>
        )}
      </motion.div>
    </section>
  )
}
