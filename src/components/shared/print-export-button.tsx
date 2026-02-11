'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react'

interface PrintExportButtonProps {
  apiRoute: string
  filename: string
  params?: Record<string, string>
  onExportExcel?: () => void
  onExportCSV?: () => void
}

export function PrintExportButton({
  apiRoute,
  filename,
  params,
  onExportExcel,
  onExportCSV,
}: PrintExportButtonProps) {
  const [loading, setLoading] = useState(false)

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
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          <Download className="h-4 w-4 mr-2" />
          {loading ? 'Loading...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownloadPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Download PDF
        </DropdownMenuItem>
        {onExportExcel && (
          <DropdownMenuItem onClick={onExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </DropdownMenuItem>
        )}
        {onExportCSV && (
          <DropdownMenuItem onClick={onExportCSV}>
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
