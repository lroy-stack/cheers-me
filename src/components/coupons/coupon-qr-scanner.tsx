'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Camera, AlertCircle } from 'lucide-react'

interface CouponQrScannerProps {
  onScan: (decodedText: string) => void
}

export default function CouponQrScanner({ onScan }: CouponQrScannerProps) {
  const t = useTranslations('coupons.validate')
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    async function initScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')

        if (!mounted || !containerRef.current) return

        const scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            onScan(decodedText)
            scanner.stop().catch(() => {})
          },
          () => {} // Ignore scan failures
        )

        if (mounted) setReady(true)
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : t('cameraPermission'))
        }
      }
    }

    initScanner()

    return () => {
      mounted = false
      if (scannerRef.current) {
        (scannerRef.current as { stop: () => Promise<void> }).stop().catch(() => {})
      }
    }
  }, [onScan, t])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        id="qr-reader"
        ref={containerRef}
        className="w-full max-w-sm mx-auto rounded-lg overflow-hidden bg-black"
        style={{ minHeight: '300px' }}
      />
      {!ready && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Camera className="h-4 w-4 animate-pulse" />
          <span>Initializing camera...</span>
        </div>
      )}
      {ready && (
        <p className="text-center text-xs text-muted-foreground">{t('scannerReady')}</p>
      )}
    </div>
  )
}
