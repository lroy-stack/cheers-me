'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

interface AddReviewSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Customer {
  id: string
  name: string
  email: string | null
  vip: boolean
}

export function AddReviewSheet({
  open,
  onOpenChange,
  onSuccess,
}: AddReviewSheetProps) {
  const t = useTranslations('customers.reviews')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)

  const [formData, setFormData] = useState({
    customer_id: '',
    platform: '',
    rating: '',
    review_text: '',
    sentiment: '',
  })

  // Fetch customers for linking
  useEffect(() => {
    if (open) {
      fetchCustomers()
    }
  }, [open])

  const fetchCustomers = async () => {
    setIsLoadingCustomers(true)
    try {
      const response = await fetch('/api/crm/customers?limit=100')
      if (!response.ok) throw new Error('Failed to fetch customers')
      const data = await response.json()
      setCustomers(data.data)
    } catch (err) {
      console.error('Error fetching customers:', err)
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.platform) {
      setError(t('platformRequired'))
      return
    }
    if (!formData.rating) {
      setError(t('ratingRequired'))
      return
    }
    if (!formData.review_text.trim()) {
      setError(t('reviewTextRequired'))
      return
    }
    if (!formData.sentiment) {
      setError(t('sentimentRequired'))
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        customer_id: formData.customer_id || null,
        platform: formData.platform,
        rating: parseFloat(formData.rating),
        review_text: formData.review_text,
        sentiment: formData.sentiment,
      }

      const response = await fetch('/api/crm/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create review')
      }

      // Reset form
      setFormData({
        customer_id: '',
        platform: '',
        rating: '',
        review_text: '',
        sentiment: '',
      })

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('addReviewTitle')}</SheetTitle>
          <SheetDescription>
            {t('addReviewDescription')}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <p className="text-sm">{error}</p>
            </Alert>
          )}

          {/* Platform */}
          <div className="space-y-2">
            <Label htmlFor="platform">
              {t('platformLabel')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.platform}
              onValueChange={(value) => handleChange('platform', value)}
            >
              <SelectTrigger id="platform">
                <SelectValue placeholder={t('selectPlatform')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TripAdvisor">🦉 TripAdvisor</SelectItem>
                <SelectItem value="Google">🔍 Google</SelectItem>
                <SelectItem value="Restaurant Guru">👨‍🍳 Restaurant Guru</SelectItem>
                <SelectItem value="Other">⭐ Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label htmlFor="rating">
              {t('ratingLabel')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.rating}
              onValueChange={(value) => handleChange('rating', value)}
            >
              <SelectTrigger id="rating">
                <SelectValue placeholder={t('selectRating')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">⭐⭐⭐⭐⭐ {t('stars5')}</SelectItem>
                <SelectItem value="4">⭐⭐⭐⭐ {t('stars4')}</SelectItem>
                <SelectItem value="3">⭐⭐⭐ {t('stars3')}</SelectItem>
                <SelectItem value="2">⭐⭐ {t('stars2')}</SelectItem>
                <SelectItem value="1">⭐ {t('stars1')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sentiment */}
          <div className="space-y-2">
            <Label htmlFor="sentiment">
              {t('sentimentLabel')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.sentiment}
              onValueChange={(value) => handleChange('sentiment', value)}
            >
              <SelectTrigger id="sentiment">
                <SelectValue placeholder={t('selectSentiment')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">👍 {t('positive')}</SelectItem>
                <SelectItem value="neutral">😐 {t('neutral')}</SelectItem>
                <SelectItem value="negative">👎 {t('negative')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="review_text">
              {t('reviewTextLabel')} <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="review_text"
              className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={t('reviewTextPlaceholder')}
              value={formData.review_text}
              onChange={(e) => handleChange('review_text', e.target.value)}
            />
          </div>

          {/* Link to Customer (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="customer_id">{t('linkCustomer')}</Label>
            <Select
              value={formData.customer_id || '__none__'}
              onValueChange={(value) => handleChange('customer_id', value === '__none__' ? '' : value)}
              disabled={isLoadingCustomers}
            >
              <SelectTrigger id="customer_id">
                <SelectValue placeholder={t('selectCustomer')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('noneAnonymous')}</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} {customer.vip && '⭐'}
                    {customer.email && ` (${customer.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('linkCustomerHint')}
            </p>
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('adding')}
                </>
              ) : (
                t('addReview')
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
