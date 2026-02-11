'use client'

import { motion } from 'framer-motion'
import { Gift, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useBookingLanguage } from './booking-language-provider'

const PRESETS = [25, 50, 75, 100]

export default function GiftVoucherSection() {
  const { t } = useBookingLanguage()

  return (
    <section className="py-16 px-4 bg-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
          {/* Header band */}
          <div className="bg-gradient-to-r from-primary via-accent to-primary p-6 text-center">
            <Gift className="h-10 w-10 text-white mx-auto mb-3" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {t('giftVoucher.heading')}
            </h2>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <p className="text-muted-foreground text-center">
              {t('giftVoucher.description')}
            </p>

            {/* Preset amounts */}
            <div className="flex justify-center gap-3 flex-wrap">
              {PRESETS.map((amount) => (
                <div
                  key={amount}
                  className="px-5 py-2.5 rounded-full border-2 border-primary/30 bg-primary/5 text-primary font-bold text-lg"
                >
                  &euro;{amount}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <Link
                href="/gift"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-white font-semibold text-lg hover:bg-primary/90 transition-colors shadow-md"
              >
                {t('giftVoucher.buyNow')}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="text-sm text-muted-foreground mt-3">
                {t('giftVoucher.fromAmount')}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
