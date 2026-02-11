'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Download, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { exportModelo303Excel } from '@/lib/utils/sales-excel-export'
import type { Modelo303Data, Modelo111Data, Modelo347Data } from '@/types/expenses'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)
const QUARTERS = [1, 2, 3, 4]

export function TaxReportsTab() {
  const t = useTranslations('finance')

  return (
    <div className="space-y-6">
      <Modelo303Card t={t} />
      <Modelo111Card t={t} />
      <Modelo347Card t={t} />
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Modelo303Card({ t }: { t: any }) {
  const [year, setYear] = useState(String(CURRENT_YEAR))
  const [quarter, setQuarter] = useState('1')
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [data, setData] = useState<Modelo303Data | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ year, quarter })
      const res = await fetch(`/api/finance/tax/modelo303?${params}`)
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate')
      }
      const result = await res.json()
      setData(result)
      setExpanded(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    setPdfLoading(true)
    try {
      const params = new URLSearchParams({ year, quarter })
      const res = await fetch(`/api/finance/print/modelo303?${params}`)
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `modelo-303-${quarter}T-${year}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download error:', err)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleViewOfficialForm = () => {
    const params = new URLSearchParams({ year, quarter })
    window.open(`/api/finance/tax-form/modelo303?${params}`, '_blank')
  }

  const handleExportExcel = async () => {
    if (!data) return
    await exportModelo303Excel(data, `${quarter}T-${year}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          {t('tax.modelo303')}
        </CardTitle>
        <CardDescription>{t('tax.modelo303Desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('tax.year')}</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('tax.quarter')}</label>
            <Select value={quarter} onValueChange={setQuarter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUARTERS.map((q) => (
                  <SelectItem key={q} value={String(q)}>
                    Q{q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? t('tax.calculating') : t('tax.generate')}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            {pdfLoading ? t('tax.loadingPdf') : t('tax.download')}
          </Button>
          <Button variant="outline" onClick={handleViewOfficialForm}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {t('tax.viewOfficialForm')}
          </Button>
          {data && (
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">{t('tax.ivaRepercutido')}</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(data.iva_repercutido)}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">{t('tax.ivaSoportado')}</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(data.iva_soportado)}
                </p>
              </div>
              <div
                className={`p-4 rounded-lg ${
                  data.resultado >= 0
                    ? 'bg-red-50 dark:bg-red-950'
                    : 'bg-emerald-50 dark:bg-emerald-950'
                }`}
              >
                <p className="text-sm text-muted-foreground">{t('tax.resultado')}</p>
                <p
                  className={`text-xl font-bold ${
                    data.resultado >= 0
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {formatCurrency(data.resultado)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {expanded ? t('tax.hideDetails') : t('tax.showDetails')}
            </button>

            {expanded && (
              <div className="space-y-4 border-t pt-4">
                {data.iva_repercutido_by_rate.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      {t('tax.ivaByRate')}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 pr-4">{t('tax.rate')}</th>
                            <th className="text-right py-1 pr-4">{t('tax.base')}</th>
                            <th className="text-right py-1">{t('tax.iva')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.iva_repercutido_by_rate.map((item, idx) => (
                            <tr key={idx} className="border-b border-dashed">
                              <td className="py-1 pr-4">{item.rate}%</td>
                              <td className="text-right py-1 pr-4">
                                {formatCurrency(item.base)}
                              </td>
                              <td className="text-right py-1">
                                {formatCurrency(item.iva)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {data.iva_soportado_by_category.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      {t('tax.ivaByCategory')}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 pr-4">{t('tax.category')}</th>
                            <th className="text-right py-1 pr-4">{t('tax.base')}</th>
                            <th className="text-right py-1">{t('tax.iva')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.iva_soportado_by_category.map((item, idx) => (
                            <tr key={idx} className="border-b border-dashed">
                              <td className="py-1 pr-4">{item.category}</td>
                              <td className="text-right py-1 pr-4">
                                {formatCurrency(item.base)}
                              </td>
                              <td className="text-right py-1">
                                {formatCurrency(item.iva)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Modelo111Card({ t }: { t: any }) {
  const [year, setYear] = useState(String(CURRENT_YEAR))
  const [quarter, setQuarter] = useState('1')
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [data, setData] = useState<Modelo111Data | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ year, quarter })
      const res = await fetch(`/api/finance/tax/modelo111?${params}`)
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate')
      }
      const result = await res.json()
      setData(result)
      setExpanded(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    setPdfLoading(true)
    try {
      const params = new URLSearchParams({ year, quarter })
      const res = await fetch(`/api/finance/print/modelo111?${params}`)
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `modelo-111-${quarter}T-${year}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download error:', err)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleViewOfficialForm = () => {
    const params = new URLSearchParams({ year, quarter })
    window.open(`/api/finance/tax-form/modelo111?${params}`, '_blank')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-600" />
          {t('tax.modelo111')}
        </CardTitle>
        <CardDescription>{t('tax.modelo111Desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('tax.year')}</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('tax.quarter')}</label>
            <Select value={quarter} onValueChange={setQuarter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUARTERS.map((q) => (
                  <SelectItem key={q} value={String(q)}>
                    Q{q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? t('tax.calculating') : t('tax.generate')}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            {pdfLoading ? t('tax.loadingPdf') : t('tax.download')}
          </Button>
          <Button variant="outline" onClick={handleViewOfficialForm}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {t('tax.viewOfficialForm')}
          </Button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-3">
            <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('tax.totalIrpf')}</p>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                {formatCurrency(data.total_irpf)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('tax.employeesWithIrpf', { count: data.employees.length })}
              </p>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {expanded ? t('tax.hideDetails') : t('tax.showDetails')}
            </button>

            {expanded && data.employees.length > 0 && (
              <div className="border-t pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 pr-4">{t('tax.employee')}</th>
                        <th className="text-right py-1 pr-4">{t('tax.grossSalary')}</th>
                        <th className="text-right py-1 pr-4">{t('tax.irpfPercent')}</th>
                        <th className="text-right py-1">{t('tax.irpfAmount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.employees.map((emp, idx) => (
                        <tr key={idx} className="border-b border-dashed">
                          <td className="py-1 pr-4">{emp.name}</td>
                          <td className="text-right py-1 pr-4">
                            {formatCurrency(emp.gross_salary)}
                          </td>
                          <td className="text-right py-1 pr-4">{emp.irpf_rate}%</td>
                          <td className="text-right py-1">
                            {formatCurrency(emp.irpf_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Modelo347Card({ t }: { t: any }) {
  const [year, setYear] = useState(String(CURRENT_YEAR))
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [data, setData] = useState<Modelo347Data | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ year })
      const res = await fetch(`/api/finance/tax/modelo347?${params}`)
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate')
      }
      const result = await res.json()
      setData(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    setPdfLoading(true)
    try {
      const params = new URLSearchParams({ year })
      const res = await fetch(`/api/finance/print/modelo347?${params}`)
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `modelo-347-${year}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download error:', err)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleViewOfficialForm = () => {
    const params = new URLSearchParams({ year })
    window.open(`/api/finance/tax-form/modelo347?${params}`, '_blank')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-600" />
          {t('tax.modelo347')}
        </CardTitle>
        <CardDescription>{t('tax.modelo347Desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('tax.year')}</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? t('tax.calculating') : t('tax.generate')}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            {pdfLoading ? t('tax.loadingPdf') : t('tax.download')}
          </Button>
          <Button variant="outline" onClick={handleViewOfficialForm}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {t('tax.viewOfficialForm')}
          </Button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-3">
            <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {t('tax.suppliersAboveThreshold')}
              </p>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                {data.suppliers.length} supplier(s)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('tax.threshold')}: {formatCurrency(data.threshold)}
              </p>
            </div>

            {data.suppliers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 pr-4">{t('tax.supplier')}</th>
                      <th className="text-left py-1 pr-4">{t('tax.nif')}</th>
                      <th className="text-right py-1">{t('tax.totalOperations')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.suppliers.map((supplier, idx) => (
                      <tr key={idx} className="border-b border-dashed">
                        <td className="py-1 pr-4">{supplier.name}</td>
                        <td className="py-1 pr-4 font-mono text-xs">
                          {supplier.nif}
                        </td>
                        <td className="text-right py-1">
                          {formatCurrency(supplier.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
