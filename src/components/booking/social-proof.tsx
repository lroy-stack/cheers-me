'use client'

import { motion } from 'framer-motion'
import { Star, Instagram } from 'lucide-react'
import { useBookingLanguage } from './booking-language-provider'

const REVIEWS = [
  {
    text: '"Best beach bar in Mallorca! The food was amazing and the atmosphere was electric. Will definitely be back!"',
    author: 'Thomas V.',
    flag: '🇳🇱',
  },
  {
    text: '"Fantastic cocktails and the DJ was brilliant. Perfect spot for a night out on the beach!"',
    author: 'Sarah M.',
    flag: '🇬🇧',
  },
  {
    text: '"World Kitchen Konzept ist unglaublich! Tolles Personal, tolle Stimmung, toller Ort."',
    author: 'Markus K.',
    flag: '🇩🇪',
  },
]

export default function SocialProof() {
  const { t } = useBookingLanguage()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-8 px-4"
    >
      <div className="max-w-4xl mx-auto">
        {/* Google Rating */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-4xl font-bold text-foreground">4.8</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${i <= 4 ? 'text-primary fill-primary' : 'text-primary fill-primary/50'}`}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t('socialProof.onGoogleReviews')}</p>
        </div>

        {/* Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {REVIEWS.map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-card rounded-lg p-4 border border-border"
            >
              <p className="text-sm text-muted-foreground italic">
                {review.text}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {review.flag} {review.author}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Instagram */}
        <div className="text-center">
          <a
            href="https://instagram.com/cheersmallorca"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-cheers-amber transition-colors"
          >
            <Instagram className="w-4 h-4" />
            {t('socialProof.followersCount')}
          </a>
        </div>
      </div>
    </motion.div>
  )
}
