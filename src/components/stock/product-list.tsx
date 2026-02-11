'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ProductWithSupplier, ProductCategory } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  MoreHorizontal,
  Search,
  ArrowUpDown,
  Pencil,
  Trash2,
  PackagePlus,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StockLevelBadge } from './stock-level-badge'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/currency'

interface ProductListProps {
  products: ProductWithSupplier[]
  onEdit?: (product: ProductWithSupplier) => void
  onDelete?: (productId: string) => void
  onAddStock?: (product: ProductWithSupplier) => void
}

type SortField = 'name' | 'category' | 'current_stock' | 'cost_per_unit'
type SortDirection = 'asc' | 'desc'

export function ProductList({
  products,
  onEdit,
  onDelete,
  onAddStock,
}: ProductListProps) {
  const t = useTranslations('stock')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      // Search filter
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())

      // Category filter
      const matchesCategory =
        categoryFilter === 'all' || product.category === categoryFilter

      // Stock level filter
      let matchesStock = true
      if (stockFilter === 'low') {
        matchesStock =
          product.min_stock !== null && product.current_stock < product.min_stock
      } else if (stockFilter === 'out') {
        matchesStock = product.current_stock === 0
      }

      return matchesSearch && matchesCategory && matchesStock
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: string | number = a[sortField]
      let bVal: string | number = b[sortField]

      if (sortField === 'name' || sortField === 'category') {
        aVal = (aVal as string).toLowerCase()
        bVal = (bVal as string).toLowerCase()
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [products, searchQuery, categoryFilter, stockFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const translateUnit = (unit: string) => {
    const key = `units.${unit}` as any
    const translated = t.has(key) ? t(key) : unit
    return translated
  }

  const getCategoryBadgeColor = (category: ProductCategory) => {
    const colors: Record<ProductCategory, string> = {
      food: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      drink: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      beer: 'bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary',
      supplies: 'bg-muted text-foreground dark:bg-muted dark:text-foreground',
    }
    return colors[category] || ''
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('inventory.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
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
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('inventory.currentStock')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inventory.inStock')}</SelectItem>
              <SelectItem value="low">{t('inventory.lowStock')}</SelectItem>
              <SelectItem value="out">{t('inventory.outOfStock')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {t('inventory.showingProducts', { filtered: filteredProducts.length, total: products.length })}
      </div>

      {/* Desktop Table View - hidden on mobile */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 hover:bg-transparent"
                >
                  {t('inventory.itemName')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('category')}
                  className="h-auto p-0 hover:bg-transparent"
                >
                  {t('inventory.category')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell">{t('inventory.supplier')}</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('current_stock')}
                  className="h-auto p-0 hover:bg-transparent"
                >
                  {t('inventory.currentStock')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="hidden lg:table-cell">{t('inventory.minStock')}</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('cost_per_unit')}
                  className="h-auto p-0 hover:bg-transparent"
                >
                  {t('inventory.cost')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t('inventory.noProductsFound')}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{product.name}</div>
                      <div className="text-xs text-muted-foreground md:hidden">
                        {product.supplier?.name || t('common.noSupplier')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn('capitalize', getCategoryBadgeColor(product.category))}
                    >
                      {t(`categories.${product.category}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {product.supplier?.name || (
                      <span className="text-muted-foreground">{t('common.noSupplier')}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {product.current_stock} {translateUnit(product.unit)}
                        </span>
                        <StockLevelBadge
                          currentStock={product.current_stock}
                          minStock={product.min_stock}
                          maxStock={product.max_stock}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="text-sm text-muted-foreground">
                      {product.min_stock !== null ? (
                        <span>
                          {product.min_stock} / {product.max_stock || '\u2014'}
                        </span>
                      ) : (
                        '\u2014'
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{formatCurrency(product.cost_per_unit)}</div>
                    <div className="text-xs text-muted-foreground">{t('common.perUnit', { unit: translateUnit(product.unit) })}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {onAddStock && (
                          <DropdownMenuItem onClick={() => onAddStock(product)}>
                            <PackagePlus className="mr-2 h-4 w-4" />
                            {t('inventory.addStock')}
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(product)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(product.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View - shown only on mobile */}
      <div className="block md:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('inventory.noProductsFound')}
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3"
            >
              {/* Header: Name and Category */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                  {product.supplier?.name && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {product.supplier.name}
                    </p>
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className={cn('capitalize shrink-0', getCategoryBadgeColor(product.category))}
                >
                  {t(`categories.${product.category}`)}
                </Badge>
              </div>

              {/* Stock Level - Prominent */}
              <div className="flex items-center justify-between p-3 rounded-md bg-muted">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('inventory.currentStock')}</p>
                  <p className="text-lg font-bold text-foreground">
                    {product.current_stock} {translateUnit(product.unit)}
                  </p>
                </div>
                <StockLevelBadge
                  currentStock={product.current_stock}
                  minStock={product.min_stock}
                  maxStock={product.max_stock}
                />
              </div>

              {/* Details */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('inventory.cost')}</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(product.cost_per_unit)}
                    <span className="text-xs text-muted-foreground ml-1">
                      / {translateUnit(product.unit)}
                    </span>
                  </span>
                </div>
                {product.min_stock !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('inventory.minStock')}</span>
                    <span className="text-sm text-foreground">
                      {product.min_stock} / {product.max_stock || '—'}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-border">
                {onAddStock && (
                  <Button
                    variant="outline"
                    className="flex-1 h-11"
                    onClick={() => onAddStock(product)}
                  >
                    <PackagePlus className="h-4 w-4 mr-2" />
                    {t('inventory.addStock')}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={cn(onAddStock ? 'w-11 p-0' : 'flex-1')}>
                      <MoreHorizontal className="h-4 w-4" />
                      {!onAddStock && <span className="ml-2">{t('common.actions')}</span>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {onAddStock && (
                      <DropdownMenuItem onClick={() => onAddStock(product)}>
                        <PackagePlus className="mr-2 h-4 w-4" />
                        {t('inventory.addStock')}
                      </DropdownMenuItem>
                    )}
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(product)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(product.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
