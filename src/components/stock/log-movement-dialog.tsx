'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Loader2 } from 'lucide-react'
import type { Product, StockMovementWithProduct, MovementType } from '@/types'

interface LogMovementDialogProps {
  products: Product[]
  onMovementCreated: (movement: StockMovementWithProduct) => void
}

const movementSchema = z.object({
  product_id: z.string().uuid({ message: 'Please select a product' }),
  movement_type: z.enum(['in', 'out', 'adjustment'], {
    required_error: 'Please select a movement type',
  }),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number' })
    .refine((val) => val !== 0, { message: 'Quantity cannot be zero' }),
  reason: z.string().max(500).optional(),
  reference: z.string().max(255).optional(),
})

type MovementFormData = z.infer<typeof movementSchema>

export function LogMovementDialog({ products, onMovementCreated }: LogMovementDialogProps) {
  const t = useTranslations('stock')
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const movementTypeOptions: { value: MovementType; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
    {
      value: 'in',
      label: t('movementDialog.stockIn'),
      icon: ArrowDownToLine,
      description: t('movementDialog.stockInDescription'),
    },
    {
      value: 'out',
      label: t('movementDialog.stockOut'),
      icon: ArrowUpFromLine,
      description: t('movementDialog.stockOutDescription'),
    },
    {
      value: 'adjustment',
      label: t('movementDialog.adjustment'),
      icon: RefreshCw,
      description: t('movementDialog.adjustmentDescription'),
    },
  ]

  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      product_id: '',
      movement_type: 'in',
      quantity: 0,
      reason: '',
      reference: '',
    },
  })

  const selectedProductId = form.watch('product_id')
  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const movementType = form.watch('movement_type')

  const onSubmit = async (data: MovementFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('movementDialog.failedCreateMovement'))
      }

      const newMovement = await response.json()
      onMovementCreated(newMovement)
      setOpen(false)
      form.reset()
    } catch (error) {
      console.error('Failed to create movement:', error)
      form.setError('root', {
        message: error instanceof Error ? error.message : t('movementDialog.failedCreateMovement'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <ArrowDownToLine className="h-4 w-4 mr-2" />
          {t('movements.addMovement')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('movements.addMovement')}</DialogTitle>
          <DialogDescription>
            {t('movements.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Product Selection */}
            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('movementDialog.productLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('movementDialog.selectProduct')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProduct && (
                    <FormDescription>
                      {t('movementDialog.currentStockInfo', { stock: selectedProduct.current_stock, unit: selectedProduct.unit })}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Movement Type */}
            <FormField
              control={form.control}
              name="movement_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('movementDialog.movementTypeLabel')}</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2">
                      {movementTypeOptions.map((option) => {
                        const Icon = option.icon
                        const isSelected = field.value === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            className={`p-3 border rounded-lg text-left transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Icon className={`h-4 w-4 mb-1 ${isSelected ? 'text-primary' : ''}`} />
                            <div className="text-sm font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {option.description}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('movements.quantity')} *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={t('movementDialog.enterQuantity')}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    {movementType === 'in' && t('movementDialog.quantityHelpIn')}
                    {movementType === 'out' && t('movementDialog.quantityHelpOut')}
                    {movementType === 'adjustment' && t('movementDialog.quantityHelpAdjustment')}
                    {selectedProduct && ` (${selectedProduct.unit})`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('movementDialog.reason')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('movementDialog.reasonPlaceholder')}
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('movementDialog.reasonDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reference */}
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('movementDialog.reference')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('movementDialog.referencePlaceholder')} {...field} />
                  </FormControl>
                  <FormDescription>{t('movementDialog.referenceDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error message */}
            {form.formState.errors.root && (
              <div className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  form.reset()
                }}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('movementDialog.recording')}
                  </>
                ) : (
                  t('movements.addMovement')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
