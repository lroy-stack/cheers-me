'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'
import {
  ReviewsDataTable,
  AddReviewSheet,
  ReviewInsightsCards,
} from '@/components/crm'

interface Review {
  id: string
  customer_id: string | null
  platform: string
  rating: number
  review_text: string
  sentiment: 'positive' | 'neutral' | 'negative'
  response_draft: string | null
  response_sent: string | null
  created_at: string
  updated_at: string
  customer?: {
    id: string
    name: string
    email: string | null
    vip: boolean
  }
}

interface ReviewInsights {
  total_reviews: number
  avg_rating: number
  sentiment_breakdown: {
    positive: number
    neutral: number
    negative: number
  }
  pending_review_responses: number
  reviews_this_month: number
  reviews_by_platform: {
    tripadvisor: number
    google: number
    restaurant_guru: number
    other: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ReviewsPage() {
  const t = useTranslations('customers.reviews')
  const [insights, setInsights] = useState<ReviewInsights | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  })
  const [isLoadingInsights, setIsLoadingInsights] = useState(true)
  const [isLoadingReviews, setIsLoadingReviews] = useState(true)
  const [addReviewOpen, setAddReviewOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<{
    platform?: string
    sentiment?: string
    pending?: string
  }>({})

  // Fetch insights
  const fetchInsights = async () => {
    setIsLoadingInsights(true)
    try {
      const response = await fetch('/api/crm/insights')
      if (!response.ok) throw new Error('Failed to fetch insights')
      const data = await response.json()
      setInsights(data)
    } catch (error) {
      console.error('Error fetching insights:', error)
    } finally {
      setIsLoadingInsights(false)
    }
  }

  // Fetch reviews
  const fetchReviews = async () => {
    setIsLoadingReviews(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (searchQuery) params.append('search', searchQuery)
      if (filters.platform) params.append('platform', filters.platform)
      if (filters.sentiment) params.append('sentiment', filters.sentiment)
      if (filters.pending) params.append('pending', filters.pending)

      const response = await fetch(`/api/crm/reviews?${params}`)
      if (!response.ok) throw new Error('Failed to fetch reviews')

      const data = await response.json()
      setReviews(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setIsLoadingReviews(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchInsights()
  }, [])

  useEffect(() => {
    fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, searchQuery, filters])

  // Tab change handler
  useEffect(() => {
    const newFilters: typeof filters = {}

    if (activeTab === 'positive') {
      newFilters.sentiment = 'positive'
    } else if (activeTab === 'neutral') {
      newFilters.sentiment = 'neutral'
    } else if (activeTab === 'negative') {
      newFilters.sentiment = 'negative'
    } else if (activeTab === 'pending') {
      newFilters.pending = 'true'
    }

    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [activeTab])

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleFilterChange = (newFilters: {
    platform?: string
    sentiment?: string
  }) => {
    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleReviewAdded = () => {
    fetchReviews()
    fetchInsights()
  }

  const handleReviewUpdated = () => {
    fetchReviews()
    fetchInsights()
  }

  const handleReviewDeleted = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/crm/reviews/${reviewId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete review')
      fetchReviews()
      fetchInsights()
    } catch (error) {
      console.error('Error deleting review:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
          <p className="text-muted-foreground">
            {t('pageSubtitle')}
          </p>
        </div>
        <Button onClick={() => setAddReviewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addReview')}
        </Button>
      </div>

      {/* Insights Cards */}
      <ReviewInsightsCards insights={insights} isLoading={isLoadingInsights} />

      {/* Tabs for sentiment filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            <MessageSquare className="mr-2 h-4 w-4" />
            {t('allReviews')}
          </TabsTrigger>
          <TabsTrigger value="positive">
            <ThumbsUp className="mr-2 h-4 w-4" />
            {t('positive')}
          </TabsTrigger>
          <TabsTrigger value="neutral">
            <Minus className="mr-2 h-4 w-4" />
            {t('neutral')}
          </TabsTrigger>
          <TabsTrigger value="negative">
            <ThumbsDown className="mr-2 h-4 w-4" />
            {t('negative')}
          </TabsTrigger>
          <TabsTrigger value="pending">
            <MessageSquare className="mr-2 h-4 w-4" />
            {t('pendingResponse')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <ReviewsDataTable
            reviews={reviews}
            pagination={pagination}
            onPageChange={handlePageChange}
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            onReviewUpdated={handleReviewUpdated}
            onReviewDeleted={handleReviewDeleted}
            isLoading={isLoadingReviews}
          />
        </TabsContent>
      </Tabs>

      {/* Add Review Sheet */}
      <AddReviewSheet
        open={addReviewOpen}
        onOpenChange={setAddReviewOpen}
        onSuccess={handleReviewAdded}
      />
    </div>
  )
}
