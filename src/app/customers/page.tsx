'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Heart, Calendar, Gift } from 'lucide-react'
import {
  CustomerInsightsCards,
  CustomersDataTable,
  AddCustomerSheet,
} from '@/components/crm'
import { useRouter } from 'next/navigation'
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

interface CustomerInsights {
  total_customers: number
  vip_customers: number
  avg_visit_count: number
  customers_this_month: number
  total_reviews: number
  avg_rating: number
  sentiment_breakdown: {
    positive: number
    neutral: number
    negative: number
  }
  pending_review_responses: number
  upcoming_birthdays_7days: number
  loyalty_rewards_issued_this_month: number
}

export default function CustomersPage() {
  const router = useRouter()
  const t = useTranslations('customers')
  const [page, setPage] = useState(1)
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<{ vip?: string; language?: string }>({})

  // Build customer query params
  const customerParams = new URLSearchParams({ page: page.toString(), limit: '50' })
  if (searchQuery) customerParams.append('search', searchQuery)
  if (filters.vip) customerParams.append('vip', filters.vip)
  if (filters.language) customerParams.append('language', filters.language)

  // SWR for insights
  const {
    data: insights = null,
    isLoading: isLoadingInsights,
    mutate: mutateInsights,
  } = useSWR<CustomerInsights>('/api/crm/insights')

  // SWR for customers
  const {
    data: customersData,
    isLoading: isLoadingCustomers,
    mutate: mutateCustomers,
  } = useSWR<{ data: Customer[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
    `/api/crm/customers?${customerParams}`
  )

  const customers = customersData?.data || []
  const pagination = customersData?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleFilterChange = (newFilters: { vip?: string; language?: string }) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleCustomerEdit = (customer: Customer) => {
    // TODO: Implement edit functionality
    console.log('Edit customer:', customer)
  }

  const handleCustomerDelete = async (customerId: string) => {
    try {
      const response = await fetch(`/api/crm/customers/${customerId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete customer')
      mutateCustomers()
      mutateInsights()
    } catch (error) {
      console.error('Error deleting customer:', error)
    }
  }

  const handleCustomerAdded = () => {
    mutateCustomers()
    mutateInsights()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('page.title')}</h1>
          <p className="text-muted-foreground">
            {t('page.subtitle')}
          </p>
        </div>
        <Button onClick={() => setAddCustomerOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('page.addCustomer')}
        </Button>
      </div>

      {/* Insights Cards */}
      <CustomerInsightsCards insights={insights} isLoading={isLoadingInsights} />

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">{t('tabs.all')}</TabsTrigger>
          <TabsTrigger value="vip">
            <Heart className="mr-2 h-4 w-4" />
            {t('tabs.vip')}
          </TabsTrigger>
          <TabsTrigger value="birthdays">
            <Calendar className="mr-2 h-4 w-4" />
            {t('tabs.birthdays')}
          </TabsTrigger>
          <TabsTrigger value="rewards">
            <Gift className="mr-2 h-4 w-4" />
            {t('tabs.loyalty')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <CustomersDataTable
            customers={customers}
            pagination={pagination}
            onPageChange={handlePageChange}
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            onCustomerEdit={handleCustomerEdit}
            onCustomerDelete={handleCustomerDelete}
            isLoading={isLoadingCustomers}
          />
        </TabsContent>

        <TabsContent value="vip" className="space-y-4">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('vip.title')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('vip.description')}
            </p>
            <Button onClick={() => router.push('/customers/vip')}>
              {t('vip.viewVip')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="birthdays" className="space-y-4">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('birthdays.title')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('birthdays.description')}
            </p>
            <Button onClick={() => router.push('/customers/birthdays')}>
              {t('birthdays.viewCalendar')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Gift className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('loyalty.title')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('loyalty.description')}
            </p>
            <Button onClick={() => router.push('/customers/rewards')}>
              {t('loyalty.viewRewards')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Customer Sheet */}
      <AddCustomerSheet
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        onSuccess={handleCustomerAdded}
      />
    </div>
  )
}
