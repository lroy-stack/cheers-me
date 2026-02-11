'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { History, Search, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface RegisterClose {
  id: string
  date: string
  expected_amount: number
  actual_amount: number
  variance: number
  notes?: string
  closed_by: string
  closed_by_employee?: {
    id: string
    profile: {
      full_name: string
    }
  }
  created_at: string
}

interface RegisterCloseHistoryProps {
  history: RegisterClose[]
}

export function RegisterCloseHistory({ history }: RegisterCloseHistoryProps) {
  const t = useTranslations('sales')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter history based on search
  const filteredHistory = history.filter((close) => {
    const searchLower = searchTerm.toLowerCase()
    const dateName = format(new Date(close.date), 'MMM d, yyyy').toLowerCase()
    const employeeName = close.closed_by_employee?.profile?.full_name?.toLowerCase() || ''

    return (
      dateName.includes(searchLower) ||
      employeeName.includes(searchLower) ||
      close.notes?.toLowerCase().includes(searchLower)
    )
  })

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredHistory.slice(startIndex, endIndex)

  const getVarianceBadge = (variance: number) => {
    if (variance === 0) {
      return (
        <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
          <Minus className="h-3 w-3 mr-1" />
          Perfect
        </Badge>
      )
    }

    if (Math.abs(variance) <= 5) {
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-700 dark:text-blue-400">
          {variance > 0 ? (
            <TrendingUp className="h-3 w-3 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 mr-1" />
          )}
          Minor
        </Badge>
      )
    }

    if (Math.abs(variance) <= 10) {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-400">
          {variance > 0 ? (
            <TrendingUp className="h-3 w-3 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 mr-1" />
          )}
          Moderate
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="border-red-500 text-red-700 dark:text-red-400">
        {variance > 0 ? (
          <TrendingUp className="h-3 w-3 mr-1" />
        ) : (
          <TrendingDown className="h-3 w-3 mr-1" />
        )}
        Large
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('close.history')}
            </CardTitle>
            <CardDescription>
              Past cash register closes ({filteredHistory.length} total)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by date, employee, or notes..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1) // Reset to first page on search
              }}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        {currentItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No register closes match your search</p>
              </>
            ) : (
              <>
                <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>{t('close.noRecords')}</p>
                <p className="text-sm mt-1">Close the register to start tracking history</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('close.date')}</TableHead>
                    <TableHead className="text-right">{t('close.cashExpected')}</TableHead>
                    <TableHead className="text-right">{t('close.cashCounted')}</TableHead>
                    <TableHead className="text-right">{t('close.difference')}</TableHead>
                    <TableHead>{t('close.status')}</TableHead>
                    <TableHead>{t('close.closedBy')}</TableHead>
                    <TableHead>{t('close.notes')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((close) => (
                    <TableRow key={close.id}>
                      <TableCell className="font-medium">
                        {format(new Date(close.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        €{close.expected_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        €{close.actual_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${
                        close.variance === 0
                          ? 'text-green-600'
                          : Math.abs(close.variance) > 10
                          ? 'text-red-600'
                          : 'text-orange-600'
                      }`}>
                        {close.variance > 0 ? '+' : ''}€{close.variance.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getVarianceBadge(close.variance)}
                      </TableCell>
                      <TableCell>
                        {close.closed_by_employee?.profile?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {close.notes ? (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {close.notes}
                          </p>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {currentItems.map((close) => (
                <Card key={close.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">
                          {format(new Date(close.date), 'MMM d, yyyy')}
                        </p>
                        {getVarianceBadge(close.variance)}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">{t('close.cashExpected')}</p>
                          <p className="font-medium">€{close.expected_amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">{t('close.cashCounted')}</p>
                          <p className="font-medium">€{close.actual_amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">{t('close.difference')}</p>
                          <p className={`font-semibold ${
                            close.variance === 0
                              ? 'text-green-600'
                              : Math.abs(close.variance) > 10
                              ? 'text-red-600'
                              : 'text-orange-600'
                          }`}>
                            {close.variance > 0 ? '+' : ''}€{close.variance.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Closed by {close.closed_by_employee?.profile?.full_name || 'Unknown'}
                        </p>
                        {close.notes && (
                          <p className="text-xs text-muted-foreground">
                            {close.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
