'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, FileText, FileSpreadsheet, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'

type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom'
type ExportFormat = 'csv' | 'pdf'

export function FinancialReportExport() {
  const t = useTranslations('finance')
  const [reportType, setReportType] = useState<ReportType>('daily')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [loading, setLoading] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Date inputs
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const reportTypeOptions = [
    { value: 'daily', label: t('export.dailyReport'), description: t('export.dailyReportDesc') },
    { value: 'weekly', label: t('export.weeklyReport'), description: t('export.weeklyReportDesc') },
    { value: 'monthly', label: t('export.monthlyReport'), description: t('export.monthlyReportDesc') },
    { value: 'custom', label: t('export.customRange'), description: t('export.customRangeDesc') },
  ]

  const handleExport = async () => {
    setLoading(true)
    setExportStatus('idle')

    try {
      // Build query params based on report type
      const params = new URLSearchParams({
        report_type: reportType,
        format: exportFormat,
      })

      if (reportType === 'daily') {
        params.append('date', selectedDate)
      } else if (reportType === 'weekly') {
        // Calculate week range from selected date
        const date = new Date(selectedDate)
        const dayOfWeek = date.getDay()
        const monday = new Date(date)
        monday.setDate(date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)

        params.append('start_date', monday.toISOString().split('T')[0])
        params.append('end_date', sunday.toISOString().split('T')[0])
      } else if (reportType === 'monthly') {
        // Calculate month range from selected date
        const date = new Date(selectedDate)
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        params.append('start_date', firstDay.toISOString().split('T')[0])
        params.append('end_date', lastDay.toISOString().split('T')[0])
      } else if (reportType === 'custom') {
        if (!startDate || !endDate) {
          setExportStatus('error')
          return
        }
        params.append('start_date', startDate)
        params.append('end_date', endDate)
      }

      // Call API to generate export
      const response = await fetch(`/api/finance/export?${params.toString()}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url

        // Generate filename
        let filename = `financial-report-${reportType}`
        if (reportType === 'daily') {
          filename += `-${selectedDate}`
        } else if (reportType === 'custom') {
          filename += `-${startDate}_${endDate}`
        } else {
          filename += `-${selectedDate}`
        }
        filename += `.${exportFormat}`

        a.download = filename
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

  const isCustomRange = reportType === 'custom'

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('export.exportConfig')}</CardTitle>
          <CardDescription>
            {t('export.exportConfigDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="report-type">{t('export.reportType')}</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger id="report-type" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date selection */}
          {!isCustomRange && (
            <div>
              <Label htmlFor="date-select">
                {reportType === 'daily' ? t('export.date') : t('export.weekMonthContaining')}
              </Label>
              <Input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {/* Custom range date inputs */}
          {isCustomRange && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">{t('export.startDate')}</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end-date">{t('export.endDate')}</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div>
            <Label>{t('export.exportFormat')}</Label>
            <div className="flex gap-3 mt-2">
              <Button
                variant={exportFormat === 'csv' ? 'default' : 'outline'}
                onClick={() => setExportFormat('csv')}
                className="flex-1"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {t('export.csvExcel')}
              </Button>
              <Button
                variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                onClick={() => setExportFormat('pdf')}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                {t('export.pdfReport')}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={handleExport}
              disabled={loading || (isCustomRange && (!startDate || !endDate))}
              className="w-full"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? t('export.generatingExport') : t('export.generateExport')}
            </Button>
          </div>

          {/* Status Messages */}
          {exportStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">{t('export.exportSuccess')}</span>
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                {t('export.exportError')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Contents Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('export.whatsIncluded')}</CardTitle>
          <CardDescription>{t('export.whatsIncludedDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                {t('export.revenueMetrics')}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('export.totalRevenueByDay')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('export.salesBreakdown')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('export.periodTotals')}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                {t('export.costAnalysis')}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('export.cogsItem')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('export.laborCosts')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('export.overheadExpenses')}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                {t('export.performanceRatios')}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('export.foodCostPercent')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('export.beverageCostPercent')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('export.laborCostPercent')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">✓</Badge>
                  <span>{t('export.profitMargins')}</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Export Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('export.quickExports')}</CardTitle>
          <CardDescription>{t('export.quickExportsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReportType('daily')
                setSelectedDate(new Date().toISOString().split('T')[0])
              }}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Calendar className="h-4 w-4" />
              <span className="text-xs">{t('export.today')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReportType('daily')
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                setSelectedDate(yesterday.toISOString().split('T')[0])
              }}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Calendar className="h-4 w-4" />
              <span className="text-xs">{t('export.yesterday')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReportType('weekly')
                setSelectedDate(new Date().toISOString().split('T')[0])
              }}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Calendar className="h-4 w-4" />
              <span className="text-xs">{t('export.thisWeek')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReportType('monthly')
                setSelectedDate(new Date().toISOString().split('T')[0])
              }}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Calendar className="h-4 w-4" />
              <span className="text-xs">{t('export.thisMonth')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
