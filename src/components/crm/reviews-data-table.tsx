'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { ReviewResponseDialog } from './review-response-dialog'

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

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ReviewsDataTableProps {
  reviews: Review[]
  pagination: Pagination
  onPageChange: (page: number) => void
  onSearch: (query: string) => void
  onFilterChange: (filters: { platform?: string; sentiment?: string }) => void
  onReviewUpdated: () => void
  onReviewDeleted: (id: string) => void
  isLoading: boolean
}

export function ReviewsDataTable({
  reviews,
  pagination,
  onPageChange,
  onSearch,
  onFilterChange,
  onReviewUpdated,
  onReviewDeleted,
  isLoading,
}: ReviewsDataTableProps) {
  const t = useTranslations('customers.reviews')
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('')
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [responseDialogOpen, setResponseDialogOpen] = useState(false)
  const [generatingResponse, setGeneratingResponse] = useState<string | null>(null)

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch(value)
  }

  const handlePlatformFilter = (value: string) => {
    setPlatformFilter(value)
    onFilterChange({ platform: value === 'all' ? undefined : value })
  }

  const handleGenerateResponse = async (review: Review) => {
    setGeneratingResponse(review.id)
    try {
      const response = await fetch(`/api/crm/reviews/${review.id}/generate-response`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to generate response')

      const data = await response.json()
      setSelectedReview(data)
      setResponseDialogOpen(true)
      onReviewUpdated()
    } catch (error) {
      console.error('Error generating response:', error)
    } finally {
      setGeneratingResponse(null)
    }
  }

  const handleOpenResponseDialog = (review: Review) => {
    setSelectedReview(review)
    setResponseDialogOpen(true)
  }

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-green-500">{t('positive')}</Badge>
      case 'neutral':
        return <Badge className="bg-muted0">{t('neutral')}</Badge>
      case 'negative':
        return <Badge className="bg-red-500">{t('negative')}</Badge>
      default:
        return <Badge>{sentiment}</Badge>
    }
  }

  const getPlatformIcon = (platform: string) => {
    const normalized = platform.toLowerCase()
    if (normalized.includes('tripadvisor')) return '🦉'
    if (normalized.includes('google')) return '🔍'
    if (normalized.includes('restaurant guru')) return '👨‍🍳'
    return '⭐'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={platformFilter} onValueChange={handlePlatformFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder={t('allPlatforms')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allPlatforms')}</SelectItem>
            <SelectItem value="TripAdvisor">TripAdvisor</SelectItem>
            <SelectItem value="Google">Google</SelectItem>
            <SelectItem value="Restaurant Guru">Restaurant Guru</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">{t('platform')}</TableHead>
              <TableHead className="w-[80px]">{t('rating')}</TableHead>
              <TableHead>{t('review')}</TableHead>
              <TableHead className="w-[100px]">{t('sentiment')}</TableHead>
              <TableHead className="w-[120px]">{t('customer')}</TableHead>
              <TableHead className="w-[100px]">{t('date')}</TableHead>
              <TableHead className="w-[100px]">{t('status')}</TableHead>
              <TableHead className="text-right w-[180px]">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                </TableRow>
              ))
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {t('noReviews')}
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{getPlatformIcon(review.platform)}</span>
                      <span className="text-sm hidden md:inline">{review.platform}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">{review.rating}</span>
                      <span className="text-primary">★</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="truncate text-sm">{review.review_text}</p>
                  </TableCell>
                  <TableCell>{getSentimentBadge(review.sentiment)}</TableCell>
                  <TableCell>
                    {review.customer ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{review.customer.name}</span>
                        {review.customer.vip && (
                          <Badge variant="outline" className="w-fit text-xs mt-1">{t('vip')}</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(review.created_at)}
                  </TableCell>
                  <TableCell>
                    {review.response_sent ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500">
                        {t('sent')}
                      </Badge>
                    ) : review.response_draft ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                        {t('draft')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-500">
                        {t('pending')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!review.response_sent && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleGenerateResponse(review)}
                          disabled={generatingResponse === review.id}
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenResponseDialog(review)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onReviewDeleted(review.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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
            from: ((pagination.page - 1) * pagination.limit) + 1,
            to: Math.min(pagination.page * pagination.limit, pagination.total),
            total: pagination.total,
          })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            {t('next')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Response Dialog */}
      {selectedReview && (
        <ReviewResponseDialog
          review={selectedReview}
          open={responseDialogOpen}
          onOpenChange={setResponseDialogOpen}
          onSuccess={onReviewUpdated}
        />
      )}
    </div>
  )
}
