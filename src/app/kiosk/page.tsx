import { KioskClient } from './kiosk-client'
import { getWebConfig } from '@/lib/utils/get-web-config'
import { ModuleDisabledPage } from '@/components/module-disabled'

export default async function KioskPage() {
  const webConfig = await getWebConfig()

  if (!webConfig.kiosk_enabled) {
    return <ModuleDisabledPage module="Self-Service Kiosk" />
  }

  return <KioskClient />
}
