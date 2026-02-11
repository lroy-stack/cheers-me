'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Users, Star, Heart, Gift, TrendingUp, MessageSquare, AlertCircle, Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'

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

interface CustomerInsightsCardsProps {
  insights: CustomerInsights | null
  isLoading?: boolean
}

export function CustomerInsightsCards({ insights, isLoading }: CustomerInsightsCardsProps) {
  const t = useTranslations('customers.insights')

  if (isLoading || !insights) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-8 bg-muted animate-pulse rounded mb-2" />
              <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const sentiment = insights.sentiment_breakdown ?? { positive: 0, neutral: 0, negative: 0 }

  const cards = [
    {
      icon: Users,
      value: (insights.total_customers ?? 0).toLocaleString(),
      label: t('totalCustomers'),
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Heart,
      value: (insights.vip_customers ?? 0).toLocaleString(),
      label: t('vipCustomers'),
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
    },
    {
      icon: TrendingUp,
      value: (insights.avg_visit_count ?? 0).toFixed(1),
      label: t('avgVisits'),
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: Users,
      value: (insights.customers_this_month ?? 0).toLocaleString(),
      label: t('activeThisMonth'),
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      icon: Star,
      value: insights.avg_rating?.toFixed(1) || 'N/A',
      label: t('avgRating'),
      sublabel: `${insights.total_reviews ?? 0} ${t('reviews')}`,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: MessageSquare,
      value: (sentiment.positive ?? 0).toLocaleString(),
      label: t('positiveReviews'),
      sublabel: `${sentiment.negative ?? 0} ${t('negative')}`,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: Calendar,
      value: (insights.upcoming_birthdays_7days ?? 0).toLocaleString(),
      label: t('birthdaysWeek'),
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
    },
    {
      icon: Gift,
      value: (insights.loyalty_rewards_issued_this_month ?? 0).toLocaleString(),
      label: t('rewardsThisMonth'),
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
              {card.sublabel && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">{card.sublabel}</p>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Alert Card for Pending Review Responses */}
      {(insights.pending_review_responses ?? 0) > 0 && (
        <Card className="col-span-2 md:col-span-4 border-orange-500/50 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold">
                  {insights.pending_review_responses} {t('negativeNeedResponse')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('visitReviewsSection')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
