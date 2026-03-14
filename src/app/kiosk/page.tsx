import { KioskClient } from './kiosk-client'
import { KioskDeviceGate } from './kiosk-device-gate'
import { getWebConfig } from '@/lib/utils/get-web-config'
import { ModuleDisabledPage } from '@/components/module-disabled'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

async function getKioskSettings(): Promise<{ standardBreakMinutes: number; autoLockSeconds: number }> {
  try {
    const supabase = await createClient()
    const { data: rows } = await supabase
      .from('restaurant_settings')
      .select('key, value')
      .in('key', ['standard_break_minutes', 'kiosk_auto_lock_seconds'])

    const map: Record<string, unknown> = {}
    for (const row of rows || []) {
      map[row.key] = row.value
    }

    return {
      standardBreakMinutes: typeof map['standard_break_minutes'] === 'number'
        ? (map['standard_break_minutes'] as number)
        : 30,
      autoLockSeconds: typeof map['kiosk_auto_lock_seconds'] === 'number'
        ? (map['kiosk_auto_lock_seconds'] as number)
        : 30,
    }
  } catch {
    return { standardBreakMinutes: 30, autoLockSeconds: 30 }
  }
}

const DEVICE_SESSION_SECRET =
  process.env.KIOSK_DEVICE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-kiosk-secret'

async function isDeviceAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('kiosk_device_session')?.value
    if (!token) return false
    const payload = jwt.verify(token, DEVICE_SESSION_SECRET) as { type?: string }
    return payload.type === 'kiosk_device'
  } catch {
    return false
  }
}

export default async function KioskPage() {
  const webConfig = await getWebConfig()

  if (!webConfig.kiosk_enabled) {
    return <ModuleDisabledPage module="Self-Service Kiosk" />
  }

  const deviceAuthed = await isDeviceAuthenticated()

  if (!deviceAuthed) {
    return <KioskDeviceGate />
  }

  const { standardBreakMinutes, autoLockSeconds } = await getKioskSettings()

  return (
    <KioskClient
      standardBreakMinutes={standardBreakMinutes}
      autoLockSeconds={autoLockSeconds}
    />
  )
}
