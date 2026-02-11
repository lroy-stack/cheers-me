'use client'

import { useState } from 'react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Heart,
  Mail,
  Phone,
  Calendar,
  Filter,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useTranslations } from 'next-intl'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  language: 'en' | 'nl' | 'es' | 'de' | null
  visit_count: number
  last_visit: string | null
  vip: boolean
  birthday: string | null
  anniversary: string | null
  preferences: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface CustomersDataTableProps {
  customers: Customer[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  onPageChange: (page: number) => void
  onSearch: (query: string) => void
  onFilterChange: (filters: { vip?: string; language?: string }) => void
  onCustomerEdit: (customer: Customer) => void
  onCustomerDelete: (customerId: string) => void
  isLoading?: boolean
}

const languageFlags = {
  en: '🇬🇧',
  nl: '🇳🇱',
  es: '🇪🇸',
  de: '🇩🇪',
}

export function CustomersDataTable({
  customers,
  pagination,
  onPageChange,
  onSearch,
  onFilterChange,
  onCustomerEdit,
  onCustomerDelete,
  isLoading,
}: CustomersDataTableProps) {
  const t = useTranslations('customers.table')
  const [searchQuery, setSearchQuery] = useState('')
  const [vipFilter, setVipFilter] = useState<string>('all')
  const [languageFilter, setLanguageFilter] = useState<string>('all')

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch(value)
  }

  const handleVipFilterChange = (value: string) => {
    setVipFilter(value)
    onFilterChange({
      vip: value === 'all' ? undefined : value,
      language: languageFilter === 'all' ? undefined : languageFilter,
    })
  }

  const handleLanguageFilterChange = (value: string) => {
    setLanguageFilter(value)
    onFilterChange({
      vip: vipFilter === 'all' ? undefined : vipFilter,
      language: value === 'all' ? undefined : value,
    })
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={vipFilter} onValueChange={handleVipFilterChange}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('vipStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allCustomers')}</SelectItem>
              <SelectItem value="true">{t('vipOnly')}</SelectItem>
              <SelectItem value="false">{t('regular')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={languageFilter} onValueChange={handleLanguageFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('language')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allLanguages')}</SelectItem>
              <SelectItem value="en">🇬🇧 {t('english')}</SelectItem>
              <SelectItem value="nl">🇳🇱 {t('dutch')}</SelectItem>
              <SelectItem value="es">🇪🇸 {t('spanish')}</SelectItem>
              <SelectItem value="de">🇩🇪 {t('german')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('customer')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('contact')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('language')}</TableHead>
              <TableHead>{t('visits')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('lastVisit')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('specialDates')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {t('noResults')}
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{customer.name}</span>
                          {customer.vip && (
                            <Badge variant="secondary" className="bg-rose-500/10 text-rose-500 border-rose-500/20">
                              <Heart className="h-3 w-3 mr-1 fill-current" />
                              {t('vip')}
                            </Badge>
                          )}
                        </div>
                        {/* Show contact on mobile */}
                        <div className="md:hidden text-xs text-muted-foreground mt-1">
                          {customer.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-1 text-sm">
                      {customer.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    {customer.language && (
                      <span className="text-lg">
                        {languageFlags[customer.language]}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {customer.visit_count}
                    </Badge>
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    {customer.last_visit ? (
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(customer.last_visit), { addSuffix: true })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">{t('never')}</span>
                    )}
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {customer.birthday && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          🎂
                        </div>
                      )}
                      {customer.anniversary && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          💍
                        </div>
                      )}
                      {!customer.birthday && !customer.anniversary && <span>—</span>}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onCustomerEdit(customer)}>
                          {t('editCustomer')}
                        </DropdownMenuItem>
                        <DropdownMenuItem>{t('viewHistory')}</DropdownMenuItem>
                        <DropdownMenuItem>{t('addNote')}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(t('confirmDelete', { name: customer.name }))) {
                              onCustomerDelete(customer.id)
                            }
                          }}
                        >
                          {t('deleteCustomer')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('showing', {
            from: customers.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0,
            to: Math.min(pagination.page * pagination.limit, pagination.total),
            total: pagination.total,
          })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('previous')}
          </Button>
          <span className="text-sm">
            {t('page', { current: pagination.page, total: pagination.totalPages || 1 })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            {t('next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
