'use client'

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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useTranslations } from 'next-intl'

const waitlistFormSchema = z.object({
  guest_name: z.string().min(1, 'Name is required').max(255),
  guest_phone: z.string().min(1, 'Phone is required').max(20),
  party_size: z.coerce.number().int().min(1, 'At least 1 guest').max(50),
  quote_time_minutes: z.coerce.number().int().min(5).max(240).optional(),
  preferred_section: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})

export type WaitlistFormValues = z.infer<typeof waitlistFormSchema>

interface WaitlistFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: WaitlistFormValues) => Promise<void>
  defaultValues?: Partial<WaitlistFormValues>
}

export function WaitlistFormDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: WaitlistFormDialogProps) {
  const t = useTranslations('reservations')
  const form = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistFormSchema),
    defaultValues: {
      guest_name: '',
      guest_phone: '',
      party_size: 2,
      quote_time_minutes: 30,
      preferred_section: '',
      notes: '',
      ...defaultValues,
    },
  })

  const handleSubmit = async (data: WaitlistFormValues) => {
    try {
      await onSubmit(data)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to submit waitlist entry:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('waitlist.addToWaitlist')}</DialogTitle>
          <DialogDescription>
            Add a walk-in guest to the waitlist. They&apos;ll be notified when a table becomes available.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guest_name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t('waitlist.guestName')} *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guest_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('overview.phone')} *</FormLabel>
                    <FormControl>
                      <Input placeholder="+34 123 456 789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="party_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('waitlist.partySize')} *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={50} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quote_time_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('waitlist.estimatedWait')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={5}
                        max={240}
                        placeholder="30"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Optional quote time</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Section</FormLabel>
                    <FormControl>
                      <Input placeholder="Terrace, Indoor, Bar..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t('waitlist.notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special requests or notes..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
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
              >
                {t('overview.cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Adding...' : t('waitlist.addToWaitlist')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
