import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/utils/auth'
import { getTranslations } from 'next-intl/server'
import { TaxExportTool } from '@/components/finance/export'
import { Download } from 'lucide-react'

export const metadata = {
  title: 'Tax Export | GrandCafe Cheers',
  description: 'Export financial data for tax filing and accounting',
}

export default async function TaxExportPage() {
  const userData = await getCurrentUser()

  if (!userData) {
    redirect('/login')
  }

  // Only allow admin and owner
  const allowedRoles = ['admin', 'owner']
  if (!allowedRoles.includes(userData.profile.role)) {
    redirect('/dashboard')
  }

  const t = await getTranslations('finance')

  return (
    <div className="bg-muted -m-4 md:-m-6 p-4 md:p-6 min-h-full">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Download className="h-6 w-6 text-emerald-500" />
              <h1 className="text-3xl font-bold">{t('taxExport.title')}</h1>
            </div>
            <p className="text-muted-foreground">
              {t('taxExport.subtitle')}
            </p>
          </div>
        </div>

        {/* Export Tool */}
        <TaxExportTool />
      </div>
    </div>
  )
}
