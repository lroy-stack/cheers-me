'use client'

import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Download, FileText, DollarSign, Receipt } from 'lucide-react'
import { DailySalesEntryDialog } from './daily-sales-entry-dialog'
import { useToast } from '@/hooks/use-toast'

export function SalesDashboardActions() {
  const router = useRouter()
  const { toast } = useToast()

  const handleExport = async (endpoint: string, filename: string) => {
    try {
      const res = await fetch(endpoint)
      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        title: 'Export Error',
        description: error instanceof Error ? error.message : 'Failed to export',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              handleExport(
                '/api/sales/print/daily-report',
                `daily-report-${new Date().toISOString().split('T')[0]}.pdf`
              )
            }
          >
            <FileText className="h-4 w-4 mr-2" />
            Daily Report PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              handleExport(
                '/api/sales/print/register-close',
                `register-close-${new Date().toISOString().split('T')[0]}.pdf`
              )
            }
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Register Close PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              handleExport(
                '/api/sales/print/expenses',
                `expenses-${new Date().toISOString().split('T')[0]}.pdf`
              )
            }
          >
            <Receipt className="h-4 w-4 mr-2" />
            Expenses PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DailySalesEntryDialog onSuccess={() => router.refresh()} />
    </>
  )
}
