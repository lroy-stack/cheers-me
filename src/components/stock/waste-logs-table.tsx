'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, AlertTriangle } from 'lucide-react'
import type { WasteLogWithProduct, WasteReason, ProductCategory } from '@/types'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils/currency'

interface WasteLogsTableProps {
  wasteLogs: WasteLogWithProduct[]
}

const categoryConfig: Record<ProductCategory, { color: string }> = {
  food: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' },
  drink: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  beer: { color: 'bg-primary/10 text-primary dark:bg-primary/5 dark:text-primary' },
  supplies: { color: 'bg-muted text-foreground dark:bg-muted dark:text-muted-foreground' },
}

export function WasteLogsTable({ wasteLogs }: WasteLogsTableProps) {
  const t = useTranslations('stock')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterReason, setFilterReason] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const wasteReasonConfig: Record<WasteReason, { label: string; color: string }> = {
    expired: { label: t('wasteReasons.expired'), color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
    damaged: { label: t('wasteReasons.damaged'), color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' },
    overproduction: { label: t('wasteReasons.overproduction'), color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400' },
    spoiled: { label: t('wasteReasons.spoiled'), color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400' },
    customer_return: { label: t('wasteReasons.customerReturn'), color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400' },
    other: { label: t('wasteReasons.other'), color: 'bg-muted text-foreground dark:bg-muted dark:text-muted-foreground' },
  }

  // Calculate total waste value
  const totalWasteValue = useMemo(() => {
    return wasteLogs.reduce(
      (sum, log) => sum + log.quantity * (log.product?.cost_per_unit || 0),
      0
    )
  }, [wasteLogs])

  // Filter and search waste logs
  const filteredLogs = useMemo(() => {
    return wasteLogs.filter((log) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        log.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.notes?.toLowerCase().includes(searchQuery.toLowerCase())

      // Reason filter
      const matchesReason = filterReason === 'all' || log.reason === filterReason

      // Category filter
      const matchesCategory =
        filterCategory === 'all' || log.product?.category === filterCategory

      return matchesSearch && matchesReason && matchesCategory
    })
  }, [wasteLogs, searchQuery, filterReason, filterCategory])

  // Calculate filtered waste value
  const filteredWasteValue = useMemo(() => {
    return filteredLogs.reduce(
      (sum, log) => sum + log.quantity * (log.product?.cost_per_unit || 0),
      0
    )
  }, [filteredLogs])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('wasteTable.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterReason} onValueChange={setFilterReason}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('wasteReasons.wasteReason')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('wasteReasons.allReasons')}</SelectItem>
            <SelectItem value="expired">{t('wasteReasons.expired')}</SelectItem>
            <SelectItem value="damaged">{t('wasteReasons.damaged')}</SelectItem>
            <SelectItem value="overproduction">{t('wasteReasons.overproduction')}</SelectItem>
            <SelectItem value="spoiled">{t('wasteReasons.spoiled')}</SelectItem>
            <SelectItem value="other">{t('wasteReasons.other')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder={t('inventory.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inventory.allCategories')}</SelectItem>
            <SelectItem value="food">{t('categories.food')}</SelectItem>
            <SelectItem value="drink">{t('categories.drink')}</SelectItem>
            <SelectItem value="beer">{t('categories.beer')}</SelectItem>
            <SelectItem value="supplies">{t('categories.supplies')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count and total value */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {t('wasteTable.showingWaste', { filtered: filteredLogs.length, total: wasteLogs.length })}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="text-muted-foreground">{t('wasteTable.totalWasteValue')}</span>
          <span className="font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(filteredWasteValue)}
          </span>
          {filteredWasteValue !== totalWasteValue && (
            <span className="text-xs text-muted-foreground">
              {t('wasteTable.ofTotalValue', { total: formatCurrency(totalWasteValue) })}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('movements.date')}</TableHead>
                <TableHead>{t('movements.item')}</TableHead>
                <TableHead>{t('inventory.category')}</TableHead>
                <TableHead>{t('movements.type')}</TableHead>
                <TableHead className="text-right">{t('movements.quantity')}</TableHead>
                <TableHead className="text-right">{t('wasteTable.valueLost')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('movements.notes')}</TableHead>
                <TableHead className="hidden xl:table-cell">{t('movements.recordedBy')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t('wasteTable.noWasteLogs')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const reasonConfig = wasteReasonConfig[log.reason]
                  const categoryColor = categoryConfig[log.product?.category || 'supplies']
                  const valueLost = log.quantity * (log.product?.cost_per_unit || 0)

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(log.created_at), 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'HH:mm')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.product?.name}</div>
                        <div className="text-xs text-muted-foreground">{log.product?.unit}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={categoryColor.color}>
                          {log.product?.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={reasonConfig.color}>
                          {reasonConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {log.quantity} {log.product?.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(valueLost)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-xs truncate">
                        <span className="text-sm text-muted-foreground">
                          {log.notes || '\u2014'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-sm">
                          {log.recorded_by_employee?.profile?.full_name || '\u2014'}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
