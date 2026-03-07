import { KioskClient } from './kiosk-client'
import { getWebConfig } from '@/lib/utils/get-web-config'
import { ModuleDisabledPage } from '@/components/module-disabled'
import { createClient } from '@/lib/supabase/server'

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

export default async function KioskPage() {
  const webConfig = await getWebConfig()

  if (!webConfig.kiosk_enabled) {
    return <ModuleDisabledPage module="Self-Service Kiosk" />
  }

  const { standardBreakMinutes, autoLockSeconds } = await getKioskSettings()

  return (
    <KioskClient
      standardBreakMinutes={standardBreakMinutes}
      autoLockSeconds={autoLockSeconds}
    />
  )
}
