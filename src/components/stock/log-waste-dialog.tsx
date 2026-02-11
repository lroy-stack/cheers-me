'use client'

import { useState, useMemo } from 'react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import type { Product, WasteLogWithProduct, WasteReason } from '@/types'
import { formatCurrency } from '@/lib/utils/currency'

interface LogWasteDialogProps {
  products: Product[]
  onWasteLogged: (waste: WasteLogWithProduct) => void
}

const wasteSchema = z.object({
  product_id: z.string().uuid({ message: 'Please select a product' }),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number' })
    .min(0.01, { message: 'Quantity must be greater than 0' }),
  reason: z.enum(['expired', 'damaged', 'overproduction', 'spoiled', 'customer_return', 'other'], {
    required_error: 'Please select a reason',
  }),
  notes: z.string().max(500).optional(),
})

type WasteFormData = z.infer<typeof wasteSchema>

export function LogWasteDialog({ products, onWasteLogged }: LogWasteDialogProps) {
  const t = useTranslations('stock')
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const wasteReasons: { value: WasteReason; label: string; description: string }[] = [
    { value: 'expired', label: t('wasteReasons.expired'), description: t('wasteReasons.expiredDescription') },
    { value: 'damaged', label: t('wasteReasons.damaged'), description: t('wasteReasons.damagedDescription') },
    { value: 'overproduction', label: t('wasteReasons.overproduction'), description: t('wasteReasons.overproductionDescription') },
    { value: 'spoiled', label: t('wasteReasons.spoiled'), description: t('wasteReasons.spoiledDescription') },
    { value: 'customer_return', label: t('wasteReasons.customerReturn'), description: t('wasteReasons.customerReturnDescription') },
    { value: 'other', label: t('wasteReasons.other'), description: t('wasteReasons.otherDescription') },
  ]

  const form = useForm<WasteFormData>({
    resolver: zodResolver(wasteSchema),
    defaultValues: {
      product_id: '',
      quantity: 0,
      reason: 'expired',
      notes: '',
    },
  })

  const selectedProductId = form.watch('product_id')
  const quantity = form.watch('quantity')

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  )

  const estimatedValueLoss = useMemo(() => {
    if (!selectedProduct || !quantity) return 0
    return quantity * selectedProduct.cost_per_unit
  }, [selectedProduct, quantity])

  const onSubmit = async (data: WasteFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/stock/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('dialogs.failedLogWaste'))
      }

      const newWaste = await response.json()
      onWasteLogged(newWaste)
      setOpen(false)
      form.reset()
    } catch (error) {
      console.error('Failed to log waste:', error)
      form.setError('root', {
        message: error instanceof Error ? error.message : t('dialogs.failedLogWaste'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Trash2 className="h-4 w-4 mr-2" />
          {t('movements.waste')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            {t('movements.waste')}
          </DialogTitle>
          <DialogDescription>
            {t('dialogs.wasteDialogDescription')}
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
                          <div className="flex items-center justify-between w-full">
                            <span>{product.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({product.current_stock} {product.unit})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProduct && (
                    <FormDescription>
                      {t('movementDialog.currentStockInfo', { stock: selectedProduct.current_stock, unit: selectedProduct.unit })} •
                      {t('inventory.cost')}: {formatCurrency(selectedProduct.cost_per_unit)}/{selectedProduct.unit}
                    </FormDescription>
                  )}
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
                  {selectedProduct && (
                    <FormDescription>
                      {t('inventory.unit')}: {selectedProduct.unit}
                      {quantity > selectedProduct.current_stock && (
                        <span className="text-destructive ml-2">
                          {t('dialogs.exceedsAvailableStock')}
                        </span>
                      )}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Waste Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wasteReasons.reasonLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('wasteReasons.selectReason')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {wasteReasons.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          <div>
                            <div className="font-medium">{reason.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {reason.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('movements.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('dialogs.wasteDetails')}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('dialogs.wasteOptionalInfo')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Value Loss Alert */}
            {estimatedValueLoss > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-semibold">{t('dialogs.estimatedValueLoss', { value: formatCurrency(estimatedValueLoss) })}</span>
                  <p className="text-xs mt-1">
                    {t('dialogs.wasteWillReduce')}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Error message */}
            {form.formState.errors.root && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
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
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('dialogs.logging')}
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('movements.waste')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
