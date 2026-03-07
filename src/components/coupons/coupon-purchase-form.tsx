'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import type { CouponTheme } from '@/types'
import CouponAmountSelector from './coupon-amount-selector'
import CouponThemePicker from './coupon-theme-picker'
import CouponPreviewCard from './coupon-preview-card'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const STEPS = ['step1', 'step2', 'step3', 'step4'] as const

export default function CouponPurchaseForm() {
  const t = useTranslations('coupons.purchase')
  const tCommon = useTranslations('common.buttons')
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
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className={`hidden sm:block text-xs whitespace-nowrap ${i <= step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {t(s)}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 min-w-4 sm:min-w-8 h-0.5 ${i < step ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
          <div className="space-y-6">
            <CouponAmountSelector value={amount} onChange={setAmount} />
            <div>
              <p className="text-sm font-medium mb-2">{t('chooseTheme')}</p>
              <CouponThemePicker selected={theme} onChange={setTheme} />
            </div>
          </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
          <div className="space-y-4">
            <div>
              <Label className="block text-sm font-medium mb-1">
                {t('recipientName')} <span className="text-muted-foreground text-xs">({t('optional')})</span>
              </Label>
              <Input
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder={t('recipientNamePlaceholder')}
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">
                {t('personalMessage')} <span className="text-muted-foreground text-xs">({t('optional')})</span>
              </Label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('personalMessagePlaceholder')}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
            </div>
            <CouponPreviewCard amount={amount} theme={theme} recipientName={recipientName} message={message} />
          </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
          <div className="space-y-4">
            <div>
              <Label className="block text-sm font-medium mb-1">{t('yourName')}</Label>
              <Input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">{t('yourEmail')}</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">{t('emailHelp')}</p>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="gdpr"
                checked={gdprConsent}
                onCheckedChange={(checked) => setGdprConsent(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="gdpr" className="text-xs text-muted-foreground font-normal cursor-pointer">
                {t('gdprConsent')}
              </Label>
            </div>
            {!gdprConsent && name && email && (
              <p className="text-xs text-destructive">{t('gdprRequired')}</p>
            )}
          </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
          <div className="space-y-6 py-2">
            <div className="flex justify-center">
              <CouponPreviewCard amount={amount} theme={theme} recipientName={recipientName} message={message} />
            </div>

            {/* Order summary */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-1.5 text-sm">
              {recipientName && <p><span className="text-muted-foreground">{t('forLabel')}:</span> {recipientName}</p>}
              <p><span className="text-muted-foreground">{t('fromLabel')}:</span> {name} ({email})</p>
            </div>

            {/* IVA Breakdown */}
            {(() => {
              const totalEur = amount / 100
              const baseEur = totalEur / 1.21
              const ivaEur = totalEur - baseEur
              return (
                <div className="rounded-lg border border-border bg-card p-4 space-y-1 text-sm">
                  <p className="font-medium text-foreground mb-2">{t('orderSummary')}</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('baseAmount')}</span>
                    <span>€{baseEur.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('ivaLabel')} (21%)</span>
                    <span>€{ivaEur.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
                    <span>{t('totalLabel')}</span>
                    <span>€{totalEur.toFixed(2)}</span>
                  </div>
                </div>
              )
            })()}

            {/* Consumer Protection Disclosures */}
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground text-sm">{t('traderTitle')}</p>
              <p>{t('traderIdentity')}</p>
              <p className="mt-2 font-medium text-foreground">{t('withdrawalTitle')}</p>
              <p>{t('withdrawalText')}</p>
            </div>
          </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <Button
            type="button"
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {tCommon('back')}
          </Button>
        )}
        <div className="flex-1" />
        {step < 3 ? (
          <Button
            type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-1 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {tCommon('next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={processing || !canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
            {processing ? t('processing') : t('payNow', { amount: `€${(amount / 100).toFixed(0)}` })}
          </Button>
        )}
      </div>
    </div>
  )
}
