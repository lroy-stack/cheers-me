'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA Install Prompt Component
 * Shows installation dialog when app can be installed as PWA
 * Works with the beforeinstallprompt event on compatible browsers
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if app was already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    // Check localStorage for user dismissal
    const wasDismissed = localStorage.getItem('pwa-install-dismissed')
    if (wasDismissed === 'true') {
      setDismissed(true)
      return
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      // Show prompt after a short delay to not be too intrusive
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('User accepted PWA installation')
      } else {
        console.log('User dismissed PWA installation')
      }

      setDeferredPrompt(null)
      setShowPrompt(false)
    } catch (error) {
      console.error('Failed to trigger install prompt:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
    setDismissed(true)
  }

  // Don't show if already installed or dismissed
  if (dismissed || !deferredPrompt) {
    return null
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Install GrandCafe Cheers Manager
          </DialogTitle>
          <DialogDescription>
            Install the app on your device for quick access and offline support
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Get the GrandCafe Cheers Manager app on your device for:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">✓</span>
              <span>Quick access from your home screen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">✓</span>
              <span>Works offline for shift viewing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">✓</span>
              <span>Full-screen immersive experience</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">✓</span>
              <span>Push notifications for updates</span>
            </li>
          </ul>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleDismiss}>
            <X className="h-4 w-4 mr-2" />
            Not Now
          </Button>
          <Button onClick={handleInstall}>
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
