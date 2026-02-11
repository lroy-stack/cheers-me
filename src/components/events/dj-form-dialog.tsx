'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Instagram, Facebook, Globe } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DJFormData } from './dj-types'

const djFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  genre: z.string().max(100).optional().or(z.literal('')),
  fee: z.coerce.number().min(0, 'Fee must be a positive number'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  instagram: z.string().optional().or(z.literal('')),
  facebook: z.string().optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  rider_notes: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof djFormSchema>

interface DJFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: DJFormData) => Promise<void>
  mode: 'create' | 'edit'
  defaultValues?: Partial<DJFormData>
}

export function DJFormDialog({
  open,
  onOpenChange,
  onSubmit,
  mode,
  defaultValues,
}: DJFormDialogProps) {
  const t = useTranslations('events')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Parse social_links for form
  const parseSocialLinks = (social_links?: Record<string, string>) => {
    if (!social_links) return {}
    return {
      instagram: social_links.instagram || '',
      facebook: social_links.facebook || '',
      website: social_links.website || '',
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(djFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      genre: defaultValues?.genre || '',
      fee: defaultValues?.fee || 0,
      email: defaultValues?.email || '',
      phone: defaultValues?.phone || '',
      rider_notes: defaultValues?.rider_notes || '',
      ...parseSocialLinks(defaultValues?.social_links),
    },
  })

  // Reset form when dialog opens/closes or defaultValues change
  useEffect(() => {
    if (open) {
      form.reset({
        name: defaultValues?.name || '',
        genre: defaultValues?.genre || '',
        fee: defaultValues?.fee || 0,
        email: defaultValues?.email || '',
        phone: defaultValues?.phone || '',
        rider_notes: defaultValues?.rider_notes || '',
        ...parseSocialLinks(defaultValues?.social_links),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultValues])

  const handleSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    try {
      // Build social_links object from individual fields
      const social_links: Record<string, string> = {}
      if (data.instagram) social_links.instagram = data.instagram
      if (data.facebook) social_links.facebook = data.facebook
      if (data.website) social_links.website = data.website

      const djData: DJFormData = {
        name: data.name,
        genre: data.genre || '',
        fee: data.fee,
        email: data.email || undefined,
        phone: data.phone || undefined,
        social_links: Object.keys(social_links).length > 0 ? social_links : undefined,
        rider_notes: data.rider_notes || undefined,
      }

      await onSubmit(djData)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto pb-safe">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? t('djs.addDj') : t('djs.editDj')}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? t('djs.addDescription')
              : t('djs.editDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('djs.basicInformation')}</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('djs.name')} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('djs.namePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="genre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('djs.genre')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('djs.genrePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('djs.performanceFeeLabel')}</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="50" placeholder="300" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('djs.contactInformation')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('djs.email')}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t('djs.emailPlaceholder')} {...field} />
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
                      <FormLabel>{t('djs.phone')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('djs.phonePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('djs.socialMedia')}</h3>

              <FormField
                control={form.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        {t('djs.instagram')}
                      </div>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t('djs.instagramPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="facebook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="flex items-center gap-2">
                        <Facebook className="h-4 w-4" />
                        {t('djs.facebook')}
                      </div>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t('djs.facebookPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        {t('djs.website')}
                      </div>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t('djs.websitePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Rider/Requirements */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="rider_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('djs.riderRequirements')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('djs.riderPlaceholder')}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('djs.equipmentHint')}
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
                {t('djs.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? t('djs.addDj') : t('djs.editDj')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
