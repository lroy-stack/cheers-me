'use client'

import { useRouter } from 'next/navigation'
import { KioskDeviceLogin } from '@/components/kiosk/kiosk-device-login'

export function KioskDeviceGate() {
  const router = useRouter()

  return (
    <KioskDeviceLogin
      onSuccess={() => {
        // Cookie was set by the API — reload to let the server check it
        router.refresh()
      }}
    />
  )
}
