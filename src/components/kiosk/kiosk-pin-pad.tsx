'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Delete, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'

interface KioskPinPadProps {
  onSubmit: (pin: string) => void
  onCancel: () => void
  error: string | null
}

export function KioskPinPad({ onSubmit, onCancel, error }: KioskPinPadProps) {
  const t = useTranslations('kiosk')
  const [pin, setPin] = useState('')

  const handleDigit = useCallback((digit: string) => {
    setPin(prev => {
      const next = prev + digit
      if (next.length === 4) {
        // Auto-submit on 4th digit
        setTimeout(() => onSubmit(next), 100)
        return next
      }
      return next.length <= 4 ? next : prev
    })
  }, [onSubmit])

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1))
  }, [])

  const handleCancel = useCallback(() => {
    setPin('')
    onCancel()
  }, [onCancel])

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '']

  return (
    <div className="w-full max-w-sm mx-auto px-6 flex flex-col items-center">
      {/* Header */}
      <h2 className="text-2xl font-semibold mb-8 text-center">
        {t('enterPin')}
      </h2>

      {/* PIN dots */}
      <div className="flex gap-4 mb-6">
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-all ${
              i < pin.length
                ? 'bg-primary border-primary scale-110'
                : 'border-muted-foreground/40'
            }`}
            initial={{ scale: 1 }}
            animate={i === pin.length - 1 ? { scale: [1, 1.2, 1.1] } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-destructive text-sm mb-4 text-center">{error}</p>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 w-full mb-6">
        {digits.map((digit, i) => {
          if (i === 9) {
            // Cancel button
            return (
              <Button
                key="cancel"
                variant="ghost"
                size="lg"
                className="h-[72px] text-lg"
                onClick={handleCancel}
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
            )
          }
          if (i === 11) {
            // Backspace button
            return (
              <Button
                key="backspace"
                variant="ghost"
                size="lg"
                className="h-[72px] text-lg"
                onClick={handleBackspace}
                disabled={pin.length === 0}
              >
                <Delete className="h-6 w-6" />
              </Button>
            )
          }
          return (
            <motion.div key={digit} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="lg"
                className="h-[72px] w-full text-2xl font-semibold"
                onClick={() => handleDigit(digit)}
                disabled={pin.length >= 4}
              >
                {digit}
              </Button>
            </motion.div>
          )
        })}
      </div>

      {/* Back */}
      <Button variant="ghost" onClick={handleCancel} className="text-muted-foreground">
        {t('back')}
      </Button>
    </div>
  )
}
