'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Star } from 'lucide-react'

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
  customer?: {
    id: string
    name: string
    email: string | null
    vip: boolean
  }
}

interface ReviewCardProps {
  review: Review
}

export function ReviewCard({ review }: ReviewCardProps) {
  const t = useTranslations('customers.reviews')

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-500'
      case 'neutral':
        return 'bg-muted0'
      case 'negative':
        return 'bg-red-500'
      default:
        return 'bg-muted0'
    }
  }

  const getPlatformIcon = (platform: string) => {
    const normalized = platform.toLowerCase()
    if (normalized.includes('tripadvisor')) return '🦉'
    if (normalized.includes('google')) return '🔍'
    if (normalized.includes('restaurant guru')) return '👨‍🍳'
    return '⭐'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Avatar>
              <AvatarFallback>
                {review.customer?.name
                  ? review.customer.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                  : '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">
                  {review.customer?.name || t('anonymousCustomer')}
                </h3>
                {review.customer?.vip && (
                  <Badge variant="outline" className="text-xs">{t('vip')}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {getPlatformIcon(review.platform)} {review.platform}
                </span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(review.created_at)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < review.rating
                      ? 'text-primary fill-primary'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <Badge className={getSentimentColor(review.sentiment)}>
              {review.sentiment}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{review.review_text}</p>

        {review.response_sent && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              {t('yourResponse')}
            </p>
            <p className="text-sm">{review.response_sent}</p>
          </div>
        )}

        {!review.response_sent && review.response_draft && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs font-semibold text-blue-600 mb-2">
              {t('aiDraftResponse')}
            </p>
            <p className="text-sm">{review.response_draft}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
