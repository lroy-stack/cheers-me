'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { CouponTheme } from '@/types'
import CouponAmountSelector from './coupon-amount-selector'
import CouponThemePicker from './coupon-theme-picker'
import CouponPreviewCard from './coupon-preview-card'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const STEPS = ['step1', 'step2', 'step3', 'step4'] as const

export default function CouponPurchaseForm() {
  const t = useTranslations('coupons.purchase')
  const [step, setStep] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [amount, setAmount] = useState(5000) // €50 default
  const [theme, setTheme] = useState<CouponTheme>('elegant')
  const [recipientName, setRecipientName] = useState('')
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [gdprConsent, setGdprConsent] = useState(false)

  const canProceed = () => {
    switch (step) {
      case 0: return amount >= 1000 && amount <= 50000
      case 1: return true // optional step
      case 2: return name.trim().length > 0 && email.includes('@') && gdprConsent
      default: return false
    }
  }

  const handleSubmit = async () => {
    setProcessing(true)
    setError(null)

    try {
      const res = await fetch('/api/coupons/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_cents: amount,
          purchaser_name: name.trim(),
          purchaser_email: email.trim(),
          recipient_name: recipientName.trim() || undefined,
          personal_message: message.trim() || undefined,
          theme,
          gdpr_consent: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Purchase failed')
      }

      const { checkout_url } = await res.json()
      if (checkout_url) {
        window.location.href = checkout_url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setProcessing(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className={`hidden sm:block ml-2 text-xs ${i <= step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {t(s)}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-8 sm:w-16 h-0.5 mx-2 ${i < step ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">
        {step === 0 && (
          <div className="space-y-6">
            <CouponAmountSelector value={amount} onChange={setAmount} />
            <div>
              <p className="text-sm font-medium mb-2">{t('chooseTheme')}</p>
              <CouponThemePicker selected={theme} onChange={setTheme} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('recipientName')} <span className="text-muted-foreground text-xs">({t('optional')})</span>
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder={t('recipientNamePlaceholder')}
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('personalMessage')} <span className="text-muted-foreground text-xs">({t('optional')})</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('personalMessagePlaceholder')}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm resize-none"
              />
            </div>
            <CouponPreviewCard amount={amount} theme={theme} recipientName={recipientName} message={message} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('yourName')}</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('yourEmail')}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">{t('emailHelp')}</p>
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={gdprConsent}
                onChange={e => setGdprConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground">{t('gdprConsent')}</span>
            </label>
            {!gdprConsent && name && email && (
              <p className="text-xs text-destructive">{t('gdprRequired')}</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-6 py-4">
            <CouponPreviewCard amount={amount} theme={theme} recipientName={recipientName} message={message} />
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Amount:</span> <strong>€{(amount / 100).toFixed(0)}</strong></p>
              {recipientName && <p><span className="text-muted-foreground">For:</span> {recipientName}</p>}
              <p><span className="text-muted-foreground">From:</span> {name} ({email})</p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        )}
        <div className="flex-1" />
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-1 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={processing || !canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
            {processing ? t('processing') : t('payNow', { amount: `€${(amount / 100).toFixed(0)}` })}
          </button>
        )}
      </div>
    </div>
  )
}
