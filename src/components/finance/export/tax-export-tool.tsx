'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, FileText, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'

export function TaxExportTool() {
  const t = useTranslations('finance')
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all')
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv')
  const [loading, setLoading] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]
  const quarterOptions = [
    { value: 'all', label: t('taxExport.quarterFullYear') },
    { value: 'q1', label: t('taxExport.quarterQ1') },
    { value: 'q2', label: t('taxExport.quarterQ2') },
    { value: 'q3', label: t('taxExport.quarterQ3') },
    { value: 'q4', label: t('taxExport.quarterQ4') },
  ]

  const handleExport = async () => {
    setLoading(true)
    setExportStatus('idle')

    try {
      // Calculate date range based on year and quarter
      let startDate: string
      let endDate: string

      if (selectedQuarter === 'all') {
        startDate = `${selectedYear}-01-01`
        endDate = `${selectedYear}-12-31`
      } else {
        const quarterMap: Record<string, { start: string; end: string }> = {
          q1: { start: `${selectedYear}-01-01`, end: `${selectedYear}-03-31` },
          q2: { start: `${selectedYear}-04-01`, end: `${selectedYear}-06-30` },
          q3: { start: `${selectedYear}-07-01`, end: `${selectedYear}-09-30` },
          q4: { start: `${selectedYear}-10-01`, end: `${selectedYear}-12-31` },
        }
        startDate = quarterMap[selectedQuarter].start
        endDate = quarterMap[selectedQuarter].end
      }

      // Call API to generate export
      const response = await fetch(
        `/api/finance/export/tax?start_date=${startDate}&end_date=${endDate}&format=${exportFormat}`
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `tax-export-${selectedYear}${selectedQuarter !== 'all' ? '-' + selectedQuarter : ''}.${exportFormat}`
        a.click()
        window.URL.revokeObjectURL(url)
        setExportStatus('success')
      } else {
        const errorData = await response.json()
        console.error('Export error:', errorData)
        setExportStatus('error')
      }
    } catch (error) {
      console.error('Export error:', error)
      setExportStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('taxExport.exportConfig')}</CardTitle>
          <CardDescription>
            {t('taxExport.exportConfigDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year-select">{t('taxExport.taxYear')}</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v, 10))}>
                <SelectTrigger id="year-select" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quarter-select">{t('taxExport.period')}</Label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger id="quarter-select" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quarterOptions.map((quarter) => (
                    <SelectItem key={quarter.value} value={quarter.value}>
                      {quarter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t('taxExport.format')}</Label>
            <div className="flex gap-3 mt-2">
              <Button
                variant={exportFormat === 'csv' ? 'default' : 'outline'}
                onClick={() => setExportFormat('csv')}
                className="flex-1"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {t('taxExport.csvExcel')}
              </Button>
              <Button
                variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                onClick={() => setExportFormat('pdf')}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                {t('taxExport.pdfReport')}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleExport} disabled={loading} className="w-full" size="lg">
              <Download className="h-4 w-4 mr-2" />
              {loading ? t('taxExport.generatingExport') : t('taxExport.generateTaxExport')}
            </Button>
          </div>

          {/* Status Messages */}
          {exportStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">{t('taxExport.exportSuccess')}</span>
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                {t('taxExport.exportError')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Contents Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('taxExport.whatsIncluded')}</CardTitle>
          <CardDescription>{t('taxExport.whatsIncludedDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                {t('taxExport.revenueData')}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.revenueDataItem1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.revenueDataItem2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.revenueDataItem3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.revenueDataItem4')}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                {t('taxExport.expenseData')}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.expenseDataItem1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.expenseDataItem2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.expenseDataItem3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.expenseDataItem4')}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                {t('taxExport.plSummary')}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.plSummaryItem1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.plSummaryItem2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.plSummaryItem3')}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                {t('taxExport.compliance')}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.complianceItem1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.complianceItem2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('taxExport.complianceItem3')}</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="border-primary/20 bg-primary/5 dark:bg-primary/5 dark:border-primary">
        <CardHeader>
          <CardTitle className="text-base text-primary dark:text-primary">
            {t('taxExport.importantNotes')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-primary dark:text-primary">
            <li className="flex items-start gap-2">
              <span className="text-primary">&bull;</span>
              <span>{t('taxExport.note1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">&bull;</span>
              <span>{t('taxExport.note2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">&bull;</span>
              <span>{t('taxExport.note3')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">&bull;</span>
              <span>{t('taxExport.note4')}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
