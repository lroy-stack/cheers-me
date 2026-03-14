'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import type { CouponTheme } from '@/types'
import CouponAmountSelector from './coupon-amount-selector'
import CouponThemePicker from './coupon-theme-picker'
import CouponPreviewCard from './coupon-preview-card'
import { Loader2, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const STEPS = ['step1', 'step2', 'step3', 'step4'] as const

const stepVariants = {
  enter: { opacity: 0, x: 80, filter: 'blur(4px)' },
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, x: -80, filter: 'blur(4px)' },
}

export default function CouponPurchaseForm() {
  const t = useTranslations('coupons.purchase')
  const tCommon = useTranslations('common.buttons')
  const [step, setStep] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [amount, setAmount] = useState(5000) // cents
  const [theme, setTheme] = useState<CouponTheme>('elegant')
  const [recipientName, setRecipientName] = useState('')
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [gdprConsent, setGdprConsent] = useState(false)

  const canProceed = () => {
    switch (step) {
      case 0: return amount >= 1000 && amount <= 50000
      case 1: return true
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

  const progress = step / (STEPS.length - 1)

  return (
    <div className="w-full">
      {/* Progress bar — thin line with dots */}
      <div className="w-full mb-8">
        <div className="relative h-0.5 bg-border/50 rounded-full">
          <motion.div
            className="absolute top-0 left-0 h-full bg-primary rounded-full"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Dots on the line */}
        <div className="relative flex items-center justify-between -mt-[5px]">
          {STEPS.map((s, i) => {
            const isCompleted = i < step
            const isCurrent = i === step
            const isClickable = i < step

            return (
              <button
                key={s}
                type="button"
                onClick={() => isClickable && setStep(i)}
                disabled={!isClickable}
                className={`relative flex flex-col items-center gap-2 bg-transparent border-0 p-0 ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <motion.div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-primary scale-100'
                      : isCurrent
                        ? 'bg-primary ring-4 ring-primary/15 scale-125'
                        : 'bg-border/80 scale-100'
                  }`}
                  whileHover={isClickable ? { scale: 1.5 } : undefined}
                  whileTap={isClickable ? { scale: 0.9 } : undefined}
                >
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-full h-full flex items-center justify-center"
                    >
                      <Check className="w-1.5 h-1.5 text-primary-foreground" />
                    </motion.div>
                  )}
                </motion.div>

                <span
                  className={`text-[10px] sm:text-xs font-medium whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'text-primary'
                      : isCompleted
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/50'
                  }`}
                >
                  <span className="hidden sm:inline">{t(s)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step-0"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
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
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
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
                className="rounded-xl"
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
                className="resize-none rounded-xl"
              />
            </div>
            <CouponPreviewCard amount={amount} theme={theme} recipientName={recipientName} message={message} />
          </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
          <div className="space-y-4">
            <div>
              <Label className="block text-sm font-medium mb-1">{t('yourName')}</Label>
              <Input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">{t('yourEmail')}</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="rounded-xl"
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
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
          <div className="space-y-6 py-2">
            <div className="flex justify-center">
              <CouponPreviewCard amount={amount} theme={theme} recipientName={recipientName} message={message} />
            </div>

            {/* Order summary */}
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 space-y-1.5 text-sm">
              {recipientName && <p><span className="text-muted-foreground">{t('forLabel')}:</span> {recipientName}</p>}
              <p><span className="text-muted-foreground">{t('fromLabel')}:</span> {name} ({email})</p>
            </div>

            {/* IVA Breakdown */}
            {(() => {
              const totalEur = amount / 100
              const baseEur = totalEur / 1.21
              const ivaEur = totalEur - baseEur
              return (
                <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 space-y-1 text-sm">
                  <p className="font-medium text-foreground mb-2">{t('orderSummary')}</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('baseAmount')}</span>
                    <span>&euro;{baseEur.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('ivaLabel')} (21%)</span>
                    <span>&euro;{ivaEur.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground border-t border-border/40 pt-1 mt-1">
                    <span>{t('totalLabel')}</span>
                    <span>&euro;{totalEur.toFixed(2)}</span>
                  </div>
                </div>
              )
            })()}

            {/* Validity notice */}
            <div className="rounded-xl border border-border/30 bg-muted/30 p-4 text-xs text-muted-foreground">
              <p>{t('validityNote')}</p>
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
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1 px-5 py-2.5 rounded-full border border-border/60 text-sm font-medium hover:bg-muted transition-colors"
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
            className="flex items-center gap-1 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 glow-hover"
          >
            {tCommon('next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={processing || !canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 glow-hover"
          >
            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
            {processing ? t('processing') : t('payNow', { amount: `€${(amount / 100).toFixed(0)}` })}
          </Button>
        )}
      </div>
    </div>
  )
}
