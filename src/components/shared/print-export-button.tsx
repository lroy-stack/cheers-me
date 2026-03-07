'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileText, Loader2, Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PrintExportButtonProps {
  apiRoute: string
  filename: string
  params?: Record<string, string>
  onExportExcel?: () => Promise<void> | void
  onExportCSV?: () => Promise<void> | void
}

export function PrintExportButton({
  apiRoute,
  filename,
  params,
  onExportExcel,
  onExportCSV,
}: PrintExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [excelLoading, setExcelLoading] = useState(false)
  const { toast } = useToast()

  const handleDownloadPDF = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        ...params,
        format: 'pdf',
      })

      const response = await fetch(`${apiRoute}?${queryParams.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF download error:', error)
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to generate PDF',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExcelExport = async () => {
    if (!onExportExcel) return
    setExcelLoading(true)
    try {
      await onExportExcel()
    } catch (error) {
      console.error('Excel export error:', error)
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to generate Excel file',
        variant: 'destructive',
      })
    } finally {
      setExcelLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const isLoading = loading || excelLoading

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownloadPDF} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
          Download PDF
        </DropdownMenuItem>
        {onExportExcel && (
          <DropdownMenuItem onClick={handleExcelExport} disabled={excelLoading}>
            {excelLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
            {excelLoading ? 'Generating...' : 'Export Excel'}
          </DropdownMenuItem>
        )}
        {onExportCSV && (
          <DropdownMenuItem onClick={async () => { try { await onExportCSV?.() } catch (error) { toast({ title: 'Export failed', description: error instanceof Error ? error.message : 'Failed to export CSV', variant: 'destructive' }) } }}>
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
