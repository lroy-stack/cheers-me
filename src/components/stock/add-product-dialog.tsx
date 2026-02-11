'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2 } from 'lucide-react'
import { Supplier } from '@/types'
import { useToast } from '@/hooks/use-toast'

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  category: z.enum(['food', 'drink', 'supplies', 'beer']),
  unit: z.string().min(1, 'Unit is required').max(50),
  current_stock: z.coerce.number().min(0).default(0),
  min_stock: z.coerce.number().min(0).optional(),
  max_stock: z.coerce.number().min(0).optional(),
  cost_per_unit: z.coerce.number().min(0).default(0),
  supplier_id: z.string().optional(),
})

type ProductFormData = z.infer<typeof productSchema>

interface AddProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  suppliers: Supplier[]
}

export function AddProductDialog({
  open,
  onOpenChange,
  onSuccess,
  suppliers,
}: AddProductDialogProps) {
  const t = useTranslations('stock')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      category: 'food',
      unit: '',
      current_stock: 0,
      min_stock: undefined,
      max_stock: undefined,
      cost_per_unit: 0,
      supplier_id: '',
    },
  })

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true)

    try {
      // Clean up empty supplier_id
      const payload = {
        ...data,
        supplier_id: data.supplier_id || null,
        min_stock: data.min_stock || null,
        max_stock: data.max_stock || null,
      }

      const response = await fetch('/api/stock/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('dialogs.failedCreateProduct'))
      }

      toast({
        title: t('common.success'),
        description: t('dialogs.productCreated'),
      })

      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('dialogs.failedCreateProduct'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('inventory.addItem')}</DialogTitle>
          <DialogDescription>
            {t('dialogs.addProductDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('dialogs.basicInformation')}</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inventory.itemName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dialogs.namePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inventory.category')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('dialogs.selectCategory')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="food">{t('categories.food')}</SelectItem>
                          <SelectItem value="drink">{t('categories.drink')}</SelectItem>
                          <SelectItem value="beer">{t('categories.beer')}</SelectItem>
                          <SelectItem value="supplies">{t('categories.supplies')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inventory.unit')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('dialogs.unitPlaceholder')} {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('dialogs.unitDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inventory.supplier')}</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)} defaultValue={field.value || '__none__'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dialogs.selectSupplier')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">{t('common.noSupplier')}</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Stock Levels */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('dialogs.stockLevels')}</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="current_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inventory.currentStock')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="min_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inventory.minStock')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={t('dialogs.alertThreshold')}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('dialogs.alertWhenBelow')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dialogs.maxStockOptional')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={t('dialogs.maxCapacityPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('dialogs.maximumCapacity')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('dialogs.pricing')}</h3>

              <FormField
                control={form.control}
                name="cost_per_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.costPerUnit')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('dialogs.costDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('dialogs.createProduct')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
