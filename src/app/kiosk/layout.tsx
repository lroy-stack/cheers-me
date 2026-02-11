import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'GrandCafe Cheers - Kiosk',
  description: 'Employee time clock kiosk',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GrandCafe Kiosk',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-background select-none"
      style={{ touchAction: 'manipulation' }}
    >
      {children}
    </div>
  )
}
