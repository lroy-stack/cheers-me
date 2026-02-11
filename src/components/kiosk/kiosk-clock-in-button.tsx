'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { ClockInOut, Shift } from '@/types'

interface KioskClockInButtonProps {
  employeeId: string
  onClockIn: (clockRecord: ClockInOut, shift: Shift | null) => void
}

const HOLD_DURATION_MS = 3000

export function KioskClockInButton({ employeeId, onClockIn }: KioskClockInButtonProps) {
  const t = useTranslations('kiosk')
  const [progress, setProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const animate = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current
    const pct = Math.min(elapsed / HOLD_DURATION_MS, 1)
    setProgress(pct)

    if (pct >= 1) {
      // Complete!
      setIsHolding(false)
      handleClockIn()
      return
    }

    animationRef.current = requestAnimationFrame(animate)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePointerDown = useCallback(() => {
    if (loading || success) return
    setIsHolding(true)
    setProgress(0)
    startTimeRef.current = Date.now()
    animationRef.current = requestAnimationFrame(animate)

    // Haptic feedback if available
    if (navigator.vibrate) navigator.vibrate(10)
  }, [loading, success, animate])

  const handlePointerUp = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (progress < 1) {
      setIsHolding(false)
      setProgress(0)
    }
  }, [progress])

  async function handleClockIn() {
    setLoading(true)
    try {
      const res = await fetch('/api/public/kiosk/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId }),
      })

      if (!res.ok) throw new Error('Clock-in failed')

      const data = await res.json()
      setSuccess(true)

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])

      setTimeout(() => {
        onClockIn(data.clock_record, data.shift)
      }, 500)
    } catch {
      setProgress(0)
      setLoading(false)
    }
  }

  // SVG ring parameters
  const size = 160
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* SVG progress ring */}
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            className={success ? 'text-green-500' : 'text-primary'}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`w-[${size - stroke * 4}px] h-[${size - stroke * 4}px] rounded-full flex items-center justify-center transition-colors ${
              success
                ? 'bg-green-500/10'
                : isHolding
                  ? 'bg-primary/10'
                  : 'bg-muted/50'
            }`}
            style={{ width: size - stroke * 4, height: size - stroke * 4 }}
          >
            <span className="text-sm font-medium text-center px-2">
              {success
                ? t('clockedIn')
                : isHolding
                  ? t('keepHolding', { seconds: Math.ceil((HOLD_DURATION_MS - progress * HOLD_DURATION_MS) / 1000) })
                  : t('holdToClockIn')
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
