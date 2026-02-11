'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const formSchema = z.object({
  actual_amount: z.string().min(1, 'Actual amount is required'),
  notes: z.string().optional(),
})

interface RegisterCloseFormProps {
  expectedAmount: number
  date: string
  employeeId: string
  disabled?: boolean
}

export function RegisterCloseForm({
  expectedAmount,
  date,
  employeeId,
  disabled = false,
}: RegisterCloseFormProps) {
  const t = useTranslations('sales')
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      actual_amount: '',
      notes: '',
    },
  })

  const actualAmount = parseFloat(form.watch('actual_amount') || '0')
  const variance = actualAmount - expectedAmount
  const hasVariance = !isNaN(variance) && variance !== 0

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (disabled) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/sales/register-close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          expected_amount: expectedAmount,
          actual_amount: parseFloat(values.actual_amount),
          notes: values.notes || undefined,
          closed_by: employeeId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to close register')
      }

      setSuccess(true)

      // Refresh the page after a short delay
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-900 dark:text-green-400">
          {t('close.successMessage')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Expected Amount (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('close.cashExpected')}</label>
            <div className="text-3xl font-bold text-muted-foreground">
              €{expectedAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('close.basedOnSales')}
            </p>
          </div>

          {/* Actual Amount Input */}
          <FormField
            control={form.control}
            name="actual_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('close.cashCounted')} *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      €
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-7 text-lg h-12"
                      disabled={disabled || isSubmitting}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  {t('close.countAllCash')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Variance Display */}
        {actualAmount > 0 && (
          <Card className={`p-4 ${
            variance === 0
              ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
              : Math.abs(variance) > 10
              ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800'
              : 'border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {variance === 0 ? (
                  <Minus className="h-6 w-6 text-green-600" />
                ) : variance > 0 ? (
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {variance === 0 ? t('close.perfectMatch') : variance > 0 ? t('close.surplus') : t('close.shortage')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {variance === 0
                      ? t('close.cashMatchesExpected')
                      : t('close.varianceAmount', { amount: Math.abs(variance).toFixed(2), direction: variance > 0 ? t('close.over') : t('close.under') })}
                  </p>
                </div>
              </div>
              <div className={`text-2xl font-bold ${
                variance === 0
                  ? 'text-green-700'
                  : Math.abs(variance) > 10
                  ? 'text-red-700'
                  : 'text-orange-700'
              }`}>
                {variance > 0 ? '+' : ''}€{variance.toFixed(2)}
              </div>
            </div>
          </Card>
        )}

        {/* Variance Warning */}
        {hasVariance && Math.abs(variance) > 10 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('close.largeVarianceWarning', { amount: Math.abs(variance).toFixed(2) })}
            </AlertDescription>
          </Alert>
        )}

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('close.notes')} {hasVariance && Math.abs(variance) > 5 && t('close.notesRecommended')}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('close.notesPlaceholder')}
                  className="resize-none"
                  rows={4}
                  disabled={disabled || isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t('close.notesDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="submit"
            size="lg"
            disabled={disabled || isSubmitting || !actualAmount}
            className="min-w-[160px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('close.closing')}
              </>
            ) : (
              t('close.submit')
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
