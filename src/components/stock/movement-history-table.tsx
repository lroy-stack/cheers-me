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
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Trash2, Search } from 'lucide-react'
import type { StockMovementWithProduct, MovementType, ProductCategory } from '@/types'
import { format } from 'date-fns'

interface MovementHistoryTableProps {
  movements: StockMovementWithProduct[]
}

const categoryConfig: Record<ProductCategory, { color: string }> = {
  food: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' },
  drink: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  beer: { color: 'bg-primary/10 text-primary dark:bg-primary/5 dark:text-primary' },
  supplies: { color: 'bg-muted text-foreground dark:bg-muted dark:text-muted-foreground' },
}

export function MovementHistoryTable({ movements }: MovementHistoryTableProps) {
  const t = useTranslations('stock')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const movementTypeConfig: Record<MovementType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    in: { label: t('movements.stockIn'), icon: ArrowDownToLine, color: 'text-green-500 bg-green-50 dark:bg-green-950' },
    out: { label: t('movements.stockOut'), icon: ArrowUpFromLine, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950' },
    adjustment: { label: t('movements.adjustment'), icon: RefreshCw, color: 'text-primary bg-primary/5 dark:bg-primary/5' },
    waste: { label: t('movements.waste'), icon: Trash2, color: 'text-red-500 bg-red-50 dark:bg-red-950' },
  }

  // Filter and search movements
  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        movement.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movement.reason?.toLowerCase().includes(searchQuery.toLowerCase())

      // Type filter
      const matchesType = filterType === 'all' || movement.movement_type === filterType

      // Category filter
      const matchesCategory =
        filterCategory === 'all' || movement.product?.category === filterCategory

      return matchesSearch && matchesType && matchesCategory
    })
  }, [movements, searchQuery, filterType, filterCategory])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('movements.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder={t('movements.movementType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('movements.type')}</SelectItem>
            <SelectItem value="in">{t('movements.incoming')}</SelectItem>
            <SelectItem value="out">{t('movements.outgoing')}</SelectItem>
            <SelectItem value="adjustment">{t('movements.adjustment')}</SelectItem>
            <SelectItem value="waste">{t('movements.waste')}</SelectItem>
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

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {t('movements.showingMovements', { filtered: filteredMovements.length, total: movements.length })}
      </p>

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
                <TableHead className="hidden md:table-cell">{t('movements.notes')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('movements.recordedBy')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t('movements.noMovements')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement) => {
                  const config = movementTypeConfig[movement.movement_type]
                  const Icon = config.icon
                  const categoryColor = categoryConfig[movement.product?.category || 'supplies']

                  return (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(movement.created_at), 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(movement.created_at), 'HH:mm')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{movement.product?.name}</div>
                        <div className="text-xs text-muted-foreground">{movement.product?.unit}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={categoryColor.color}>
                          {movement.product?.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${config.color} w-fit px-2 py-1 rounded-md`}>
                          <Icon className="h-3 w-3" />
                          <span className="text-xs font-medium">{config.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-semibold ${
                            movement.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {movement.quantity > 0 ? '+' : ''}
                          {movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate">
                        <span className="text-sm text-muted-foreground">
                          {movement.reason || '\u2014'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm">
                          {movement.recorded_by_employee?.profile?.full_name || '\u2014'}
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
