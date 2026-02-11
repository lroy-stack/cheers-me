'use client'

import { useCoupon } from '@/hooks/use-coupons'
import { useTranslations } from 'next-intl'
import { formatCouponAmount } from '@/lib/utils/coupon-code'
import { X, Loader2, Download } from 'lucide-react'

interface CouponDetailDialogProps {
  couponId: string
  onClose: () => void
}

export default function CouponDetailDialog({ couponId, onClose }: CouponDetailDialogProps) {
  const t = useTranslations('coupons.detail')
  const ts = useTranslations('coupons.status')
  const { coupon, loading } = useCoupon(couponId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold">{t('couponCode')}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        {loading || !coupon ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="text-center">
              <p className="font-mono text-2xl font-bold">{coupon.code}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{ts(coupon.status)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">{t('amount')}</p>
                <p className="font-bold">{formatCouponAmount(coupon.amount_cents)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t('remaining')}</p>
                <p className="font-bold">{formatCouponAmount(coupon.remaining_cents)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t('purchaser')}</p>
                <p>{coupon.purchaser_name}</p>
                <p className="text-xs text-muted-foreground">{coupon.purchaser_email}</p>
              </div>
              {coupon.recipient_name && (
                <div>
                  <p className="text-muted-foreground text-xs">{t('recipient')}</p>
                  <p>{coupon.recipient_name}</p>
                </div>
              )}
              {coupon.personal_message && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">{t('message')}</p>
                  <p className="italic text-sm">{coupon.personal_message}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs">{t('purchasedAt')}</p>
                <p>{coupon.purchased_at ? new Date(coupon.purchased_at).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t('expiresAt')}</p>
                <p>{new Date(coupon.expires_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Redemption history */}
            <div>
              <h3 className="text-sm font-medium mb-2">{t('redemptionHistory')}</h3>
              {coupon.redemptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('noRedemptions')}</p>
              ) : (
                <div className="space-y-2">
                  {coupon.redemptions.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-xs bg-muted/50 rounded-md px-3 py-2">
                      <div>
                        <span className="font-medium">{formatCouponAmount(r.amount_cents)}</span>
                        <span className="text-muted-foreground ml-2">{r.validation_method.replace('_', ' ')}</span>
                      </div>
                      <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PDF download */}
            <a
              href={`/api/coupons/${coupon.id}/pdf`}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4" />
              {t('downloadPdf')}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
