'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import { Input } from '@/components/ui/input'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/hooks/use-toast'

const categoryFormSchema = z.object({
  name_en: z.string().min(1, 'Required').max(100),
  name_nl: z.string().max(100).optional().or(z.literal('')),
  name_es: z.string().max(100).optional().or(z.literal('')),
  name_de: z.string().max(100).optional().or(z.literal('')),
  sort_order: z.coerce.number().int().min(0).optional(),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

interface Category {
  id: string
  name_en: string
  name_nl?: string
  name_es?: string
  name_de?: string
  sort_order: number
}

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  category?: Category
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  onSuccess,
  category,
}: CategoryFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const t = useTranslations('menu.overview')
  const isEditing = !!category

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name_en: category?.name_en ?? '',
      name_nl: category?.name_nl ?? '',
      name_es: category?.name_es ?? '',
      name_de: category?.name_de ?? '',
      sort_order: category?.sort_order ?? 0,
    },
  })

  async function onSubmit(values: CategoryFormValues) {
    setIsSubmitting(true)
    try {
      const payload = {
        name_en: values.name_en,
        name_nl: values.name_nl || undefined,
        name_es: values.name_es || undefined,
        name_de: values.name_de || undefined,
        sort_order: values.sort_order ?? 0,
      }

      const url = isEditing
        ? `/api/menu/categories/${category.id}`
        : '/api/menu/categories'

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Request failed')
      }

      toast({
        title: isEditing ? t('categoryUpdated') : t('categoryCreated'),
      })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('editCategory') : t('createCategory')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('categoryName')} (EN) *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name_nl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('categoryName')} (NL)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name_es"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('categoryName')} (ES)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name_de"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('categoryName')} (DE)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sortOrder')}</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormDescription>{t('sortOrderHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t('editCategory') : t('createCategory')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
