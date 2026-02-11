'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCouponValidator } from '@/hooks/use-coupon-validator'
import { formatCouponCode, formatCouponAmount } from '@/lib/utils/coupon-code'
import CouponQrScanner from './coupon-qr-scanner'
import CouponRedeemDialog from './coupon-redeem-dialog'
import { QrCode, Keyboard, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function CouponValidator() {
  const t = useTranslations('coupons.validate')
  const tr = useTranslations('coupons.redeem')
  const [mode, setMode] = useState<'scan' | 'code'>('code')
  const [codeInput, setCodeInput] = useState('')
  const [showRedeem, setShowRedeem] = useState(false)
  const [validationMethod, setValidationMethod] = useState<'qr_scan' | 'code_entry'>('code_entry')
  const { coupon, loading, error, redeemSuccess, lookupByCode, handleQrScan, redeem, reset } = useCouponValidator()

  const handleLookup = () => {
    setValidationMethod('code_entry')
    lookupByCode(codeInput)
  }

  const handleScan = (text: string) => {
    setValidationMethod('qr_scan')
    handleQrScan(text)
  }

  const canRedeem = coupon && (coupon.status === 'active' || coupon.status === 'partially_used') && coupon.remaining_cents > 0

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => { setMode('scan'); reset() }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'scan' ? 'bg-background shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <QrCode className="h-4 w-4" />
          {t('scanQr')}
        </button>
        <button
          onClick={() => { setMode('code'); reset() }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'code' ? 'bg-background shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <Keyboard className="h-4 w-4" />
          {t('enterCode')}
        </button>
      </div>

      {/* Scanner or code input */}
      {mode === 'scan' ? (
        <CouponQrScanner onScan={handleScan} />
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={codeInput}
            onChange={e => setCodeInput(formatCouponCode(e.target.value))}
            placeholder={t('codePlaceholder')}
            className="flex-1 px-3 py-2.5 rounded-md border border-border bg-background text-sm font-mono uppercase"
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <button
            onClick={handleLookup}
            disabled={loading}
            className="px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('lookup')}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Success message */}
      {redeemSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {tr('success')}
        </div>
      )}

      {/* Coupon details */}
      {coupon && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="text-center">
            <p className="font-mono text-xl font-bold">{coupon.code}</p>
            {coupon.recipient_name && <p className="text-sm text-muted-foreground">For: {coupon.recipient_name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-center p-2 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">Original</p>
              <p className="font-bold">{formatCouponAmount(coupon.amount_cents)}</p>
            </div>
            <div className="text-center p-2 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="font-bold text-green-600">{formatCouponAmount(coupon.remaining_cents)}</p>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Valid until {new Date(coupon.expires_at).toLocaleDateString()}
          </div>

          {canRedeem && (
            <button
              onClick={() => setShowRedeem(true)}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {tr('title')}
            </button>
          )}
        </div>
      )}

      {/* Redeem dialog */}
      {showRedeem && coupon && (
        <CouponRedeemDialog
          coupon={coupon}
          validationMethod={validationMethod}
          onRedeem={async (amount, method, notes) => {
            // We need the coupon ID from the staff API, but for public-facing scanner
            // we look up by code. The validate endpoint uses coupon ID.
            // For the scanner, we need to find the coupon by code first.
            const lookupRes = await fetch(`/api/public/coupons/${coupon.code}`)
            if (!lookupRes.ok) return false
            // The validate endpoint uses the coupon ID, but we only have code from public API.
            // We'll pass code as ID and let the backend handle it via code lookup.
            // Actually, the staff API uses ID. Let's search staff coupons by code.
            const searchRes = await fetch(`/api/coupons?search=${coupon.code}`)
            if (!searchRes.ok) return false
            const coupons = await searchRes.json()
            const found = coupons.find((c: { code: string }) => c.code === coupon.code)
            if (!found) return false
            return redeem(found.id, amount, method, notes)
          }}
          onClose={() => setShowRedeem(false)}
        />
      )}
    </div>
  )
}
