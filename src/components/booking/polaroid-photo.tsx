'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useBookingLanguage } from './booking-language-provider'

interface PolaroidPhotoProps {
  image: string
  captionKey: string
  rotation?: number
  className?: string
}

export function PolaroidPhoto({ image, captionKey, rotation = 0, className = '' }: PolaroidPhotoProps) {
  const { t } = useBookingLanguage()

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: rotation * 0.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: rotation }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
      whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
      className={`inline-block ${className}`}
    >
      <div className="bg-white p-2.5 pb-12 rounded-sm shadow-[4px_6px_20px_rgba(0,0,0,0.25)] relative">
        <div className="relative w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] overflow-hidden">
          <Image
            src={image}
            alt={t(`experience.${captionKey}`)}
            fill
            className="object-cover"
            sizes="220px"
          />
        </div>
        <p className="absolute bottom-2.5 left-0 right-0 text-center text-sm font-medium text-gray-700 font-[cursive]">
          {t(`experience.${captionKey}`)}
        </p>
      </div>
    </motion.div>
  )
}

/** A pair of polaroids floating between sections */
export function PolaroidPair({
  items,
}: {
  items: { image: string; captionKey: string; rotation: number }[]
}) {
  return (
    <div className="py-6 sm:py-10 flex justify-center items-center gap-4 sm:gap-8 overflow-visible">
      {items.map((item) => (
        <PolaroidPhoto
          key={item.captionKey}
          image={item.image}
          captionKey={item.captionKey}
          rotation={item.rotation}
        />
      ))}
    </div>
  )
}
