'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, Star, ThumbsUp, AlertCircle } from 'lucide-react'

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

interface ReviewInsightsCardsProps {
  insights: ReviewInsights | null
  isLoading: boolean
}

export function ReviewInsightsCards({
  insights,
  isLoading,
}: ReviewInsightsCardsProps) {
  const t = useTranslations('customers.reviews')

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!insights) return null

  const positivePercentage = insights.total_reviews
    ? Math.round((insights.sentiment_breakdown.positive / insights.total_reviews) * 100)
    : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Reviews */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <div className="text-2xl font-bold">{insights.total_reviews}</div>
          </div>
          <p className="text-xs text-muted-foreground">{t('totalReviews')}</p>
          <p className="text-xs text-blue-500 mt-1">
            {t('thisMonth', { count: insights.reviews_this_month })}
          </p>
        </CardContent>
      </Card>

      {/* Average Rating */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-primary fill-primary" />
            <div className="text-2xl font-bold">
              {insights.avg_rating.toFixed(1)}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('averageRating')}</p>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-3 w-3 ${
                  star <= Math.round(insights.avg_rating)
                    ? 'text-primary fill-primary'
                    : 'text-muted-foreground'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Positive Sentiment */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp className="h-4 w-4 text-green-500" />
            <div className="text-2xl font-bold">{positivePercentage}%</div>
          </div>
          <p className="text-xs text-muted-foreground">{t('positiveReviews')}</p>
          <p className="text-xs text-green-500 mt-1">
            {t('ofTotal', { count: insights.sentiment_breakdown.positive, total: insights.total_reviews })}
          </p>
        </CardContent>
      </Card>

      {/* Pending Responses */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle
              className={`h-4 w-4 ${
                insights.pending_review_responses > 0
                  ? 'text-orange-500'
                  : 'text-muted-foreground'
              }`}
            />
            <div className="text-2xl font-bold">
              {insights.pending_review_responses}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('pendingResponses')}</p>
          {insights.pending_review_responses > 0 && (
            <p className="text-xs text-orange-500 mt-1">{t('requiresAttention')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
