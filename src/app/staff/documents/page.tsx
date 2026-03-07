'use client'


import useSWR from 'swr'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Download, Loader2, FileX } from 'lucide-react'
import { format } from 'date-fns'

interface StaffDocument {
  id: string
  document_type: string
  file_name: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  description: string | null
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contract: 'Contract',
  payslip: 'Payslip',
  id_document: 'ID Document',
  tax_form: 'Tax Form',
  other: 'Other',
}

const DOCUMENT_TYPE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  contract: 'default',
  payslip: 'secondary',
  id_document: 'outline',
  tax_form: 'secondary',
  other: 'outline',
}

export default function StaffDocumentsPage() {
  const { data: documents, isLoading, error } = useSWR<StaffDocument[]>(
    '/api/staff/documents',
    fetcher
  )

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="My Documents"
        description="View and download your employment documents"
        backHref="/staff/my-schedule"
        backLabel="My Schedule"
      />

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileX className="h-10 w-10 mb-3" />
              <p>Failed to load documents</p>
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mb-3 opacity-50" />
              <p className="font-medium">No documents yet</p>
              <p className="text-sm mt-1">Your employment documents will appear here once uploaded by your manager.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.file_name}</TableCell>
                      <TableCell>
                        <Badge variant={DOCUMENT_TYPE_VARIANTS[doc.document_type] || 'outline'}>
                          {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {doc.description || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(doc.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="min-h-[44px]"
                        >
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download={doc.file_name}>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
