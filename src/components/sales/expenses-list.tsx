'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Wallet, CheckCircle, XCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/utils/currency'
import { EXPENSE_CATEGORIES } from '@/lib/utils/spanish-tax'
import type { ExpenseEntry } from '@/types/expenses'

interface ExpensesListProps {
  expenses: ExpenseEntry[]
}

export function ExpensesList({ expenses }: ExpensesListProps) {
  const t = useTranslations('sales')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Get unique categories from actual expenses for filter buttons
  const activeCategories = useMemo(() => {
    const cats = new Set(expenses.map((e) => e.category))
    return Array.from(cats).sort()
  }, [expenses])

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch =
        !searchQuery ||
        expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.factura_number?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory =
        selectedCategory === 'all' || expense.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [expenses, searchQuery, selectedCategory])

  const getCategoryLabel = (value: string) => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.value === value)
    return cat?.label || value
  }

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'food':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'beverages':
      case 'non-alcoholic':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'rent':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'utilities':
      case 'phone':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'insurance':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300'
      case 'marketing':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300'
      case 'repairs':
      case 'supplies':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      default:
        return 'bg-muted text-foreground dark:bg-card dark:text-muted-foreground'
    }
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('expenses.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('expenses.noExpenses')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t('expenses.title')}</CardTitle>
            <CardDescription>
              {filteredExpenses.length} of {expenses.length} expenses
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Category Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('expenses.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              {t('expenses.allCategories')}
            </Button>
            {activeCategories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {getCategoryLabel(cat)}
              </Button>
            ))}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('expenses.date')}</TableHead>
                <TableHead>{t('expenses.category')}</TableHead>
                <TableHead>{t('expenses.description')}</TableHead>
                <TableHead>{t('expenses.vendor')}</TableHead>
                <TableHead className="text-right">{t('expenses.amount')}</TableHead>
                <TableHead className="text-right">{t('expenses.ivaAmount')}</TableHead>
                <TableHead className="text-right">{t('expenses.baseImponible')}</TableHead>
                <TableHead>{t('expenses.facturaNumber')}</TableHead>
                <TableHead className="text-center">{t('expenses.deductible')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="whitespace-nowrap">
                    {expense.date ? format(parseISO(expense.date), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getCategoryBadgeColor(expense.category)}>
                      {getCategoryLabel(expense.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {expense.description}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate">
                    {expense.vendor || '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold whitespace-nowrap">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                    {expense.iva_amount != null ? formatCurrency(expense.iva_amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                    {expense.base_imponible != null ? formatCurrency(expense.base_imponible) : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {expense.factura_number || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {expense.is_deductible ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className="border rounded-lg p-4 space-y-2 bg-card"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{expense.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={getCategoryBadgeColor(expense.category)}>
                      {getCategoryLabel(expense.category)}
                    </Badge>
                    {expense.is_deductible && (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </div>
                </div>
                <p className="text-lg font-bold">{formatCurrency(expense.amount)}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{expense.date ? format(parseISO(expense.date), 'MMM d, yyyy') : '-'}</span>
                <span>{expense.vendor || ''}</span>
              </div>
              {(expense.iva_amount != null || expense.factura_number) && (
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                  <span>IVA: {expense.iva_amount != null ? formatCurrency(expense.iva_amount) : '-'}</span>
                  <span>{expense.factura_number || ''}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredExpenses.length === 0 && expenses.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('expenses.noExpenses')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
