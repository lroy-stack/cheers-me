'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Supplier } from '@/types'
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
import { Badge } from '@/components/ui/badge'
import {
  MoreHorizontal,
  Search,
  ArrowUpDown,
  Pencil,
  Trash2,
  Eye,
  Mail,
  Phone,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SupplierListProps {
  suppliers: Supplier[]
  onEdit?: (supplier: Supplier) => void
  onDelete?: (supplierId: string) => void
  onViewDetails?: (supplier: Supplier) => void
}

type SortField = 'name' | 'contact_person' | 'email'
type SortDirection = 'asc' | 'desc'

export function SupplierList({
  suppliers,
  onEdit,
  onDelete,
  onViewDetails,
}: SupplierListProps) {
  const t = useTranslations('stock')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Filter and sort suppliers
  const filteredSuppliers = useMemo(() => {
    const filtered = suppliers.filter((supplier) => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesSearch
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: string | null = a[sortField]
      let bVal: string | null = b[sortField]

      if (aVal === null) aVal = ''
      if (bVal === null) bVal = ''

      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [suppliers, searchQuery, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('suppliers.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {t('suppliers.showingSuppliers', { filtered: filteredSuppliers.length, total: suppliers.length })}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 hover:bg-transparent"
                >
                  {t('suppliers.name')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('contact_person')}
                  className="h-auto p-0 hover:bg-transparent"
                >
                  {t('suppliers.contact')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('email')}
                  className="h-auto p-0 hover:bg-transparent"
                >
                  {t('suppliers.email')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="hidden lg:table-cell">{t('suppliers.phone')}</TableHead>
              <TableHead className="hidden xl:table-cell">{t('dialogs.paymentTerms')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t('suppliers.noSuppliers')}
                </TableCell>
              </TableRow>
            ) : (
              filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{supplier.name}</div>
                      <div className="text-xs text-muted-foreground md:hidden">
                        {supplier.contact_person || t('common.noContact')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.contact_person || (
                      <span className="text-muted-foreground">{'\u2014'}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {supplier.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <a
                          href={`mailto:${supplier.email}`}
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {supplier.email}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{'\u2014'}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {supplier.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <a
                          href={`tel:${supplier.phone}`}
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {supplier.phone}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{'\u2014'}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {supplier.payment_terms ? (
                      <Badge variant="outline" className="font-normal">
                        {supplier.payment_terms}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">{'\u2014'}</span>
                    )}
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
                        {onViewDetails && (
                          <DropdownMenuItem onClick={() => onViewDetails(supplier)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('suppliers.viewDetails')}
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(supplier)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(supplier.id)}
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
    </div>
  )
}
