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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255),
  contact_person: z.string().max(255).optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  payment_terms: z.string().max(255).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})

type SupplierFormData = z.infer<typeof supplierSchema>

interface AddSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddSupplierDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddSupplierDialogProps) {
  const t = useTranslations('stock')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      payment_terms: '',
      notes: '',
    },
  })

  const onSubmit = async (data: SupplierFormData) => {
    setIsSubmitting(true)

    try {
      // Convert empty strings to undefined
      const payload = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value === '' ? undefined : value])
      )

      const response = await fetch('/api/stock/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('dialogs.failedCreateSupplier'))
      }

      form.reset()
      onSuccess()
    } catch (error) {
      console.error('Error creating supplier:', error)
      form.setError('root', {
        message: error instanceof Error ? error.message : t('dialogs.failedCreateSupplier'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('suppliers.addSupplier')}</DialogTitle>
          <DialogDescription>
            {t('dialogs.addSupplierDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.name')} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('dialogs.supplierNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('suppliers.contact')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dialogs.contactPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('suppliers.phone')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dialogs.phonePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.email')}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t('dialogs.emailPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.address')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('dialogs.addressPlaceholder')}
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.paymentTerms')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('dialogs.paymentTermsPlaceholder')} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('dialogs.paymentTermsDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('dialogs.notesPlaceholder')}
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

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
                {t('suppliers.addSupplier')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
