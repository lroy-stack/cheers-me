'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Download, FileText, RefreshCcw } from 'lucide-react'
import Link from 'next/link'

export function FinanceDashboardActions() {
  const t = useTranslations('finance')
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const monthStart = `${today.substring(0, 7)}-01`
      const response = await fetch(
        `/api/finance/export/tax?start_date=${monthStart}&end_date=${today}&format=csv`
      )
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `finance_export_${today}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  const handleRecalculate = async () => {
    setRecalculating(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      await fetch(`/api/finance/calculate?date=${today}`, { method: 'POST' })
      router.refresh()
    } catch (error) {
      console.error('Recalculate failed:', error)
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/finance/reports">
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          {t('dashboard.reports')}
        </Button>
      </Link>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={exporting}
      >
        <Download className="h-4 w-4 mr-2" />
        {exporting ? '...' : t('dashboard.export')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRecalculate}
        disabled={recalculating}
      >
        <RefreshCcw className={`h-4 w-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
        {recalculating ? '...' : t('dashboard.recalculate')}
      </Button>
    </div>
  )
}
