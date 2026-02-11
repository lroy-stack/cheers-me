'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Loader2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const reservationFormSchema = z.object({
  guest_name: z.string().min(1, 'Guest name is required').max(255),
  guest_email: z.string().email('Invalid email').optional().or(z.literal('')),
  guest_phone: z.string().min(1, 'Phone number is required').max(20),
  party_size: z.coerce.number().int().min(1, 'At least 1 guest').max(50, 'Maximum 50 guests'),
  reservation_date: z.date({
    required_error: 'Reservation date is required',
  }),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  table_id: z.string().optional(),
  source: z.enum(['walk_in', 'phone', 'website', 'instagram', 'email', 'staff_created']),
  estimated_duration_minutes: z.coerce
    .number()
    .int()
    .min(15)
    .max(480)
    .default(90),
  special_requests: z.string().max(1000).optional(),
  internal_notes: z.string().max(1000).optional(),
  deposit_required: z.boolean().default(false),
  deposit_amount: z.coerce.number().min(0).optional(),
})

type ReservationFormValues = z.infer<typeof reservationFormSchema>

interface Table {
  id: string
  table_number: string
  capacity: number
  section_id: string | null
  floor_sections?: {
    id: string
    name: string
  } | null
}

interface ReservationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ReservationFormValues) => Promise<void>
  defaultValues?: Partial<ReservationFormValues>
  tables?: Table[]
  mode?: 'create' | 'edit'
}

export function ReservationFormDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  tables = [],
  mode = 'create',
}: ReservationFormDialogProps) {
  const t = useTranslations('reservations')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      party_size: 2,
      source: 'staff_created',
      estimated_duration_minutes: 90,
      special_requests: '',
      internal_notes: '',
      deposit_required: false,
      ...defaultValues,
    },
  })

  // Reset form when dialog opens with new default values
  useEffect(() => {
    if (open && defaultValues) {
      form.reset({
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        party_size: 2,
        source: 'staff_created',
        estimated_duration_minutes: 90,
        special_requests: '',
        internal_notes: '',
        deposit_required: false,
        ...defaultValues,
      })
    }
  }, [open, defaultValues, form])

  const handleSubmit = async (data: ReservationFormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting reservation:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const depositRequired = form.watch('deposit_required')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('overview.addReservation') : t('overview.editReservation')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? t('form.createDescription')
              : t('form.editDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Guest Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('form.guestInformation')}</h3>

              <FormField
                control={form.control}
                name="guest_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('overview.guestName')} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('form.namePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="guest_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('overview.phone')} *</FormLabel>
                      <FormControl>
                        <Input placeholder={t('form.phonePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guest_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('overview.email')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('form.emailPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Reservation Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('form.reservationDetails')}</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reservation_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('overview.date')} *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>{t('form.pickDate')}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('overview.time')} *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="party_size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('overview.partySize')} *</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('form.durationLabel')}</FormLabel>
                      <FormControl>
                        <Input type="number" min="15" max="480" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="table_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('overview.table')}</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === '__none__' ? undefined : val)}
                        defaultValue={field.value || '__none__'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('form.selectTable')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">{t('form.noTableAssigned')}</SelectItem>
                          {tables.map((table) => (
                            <SelectItem key={table.id} value={table.id}>
                              {t('overview.table')} {table.table_number}
                              {table.floor_sections && ` (${table.floor_sections.name})`}
                              {' '}• {table.capacity} {t('overview.seats')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('overview.source')} *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="staff_created">{t('overview.sourceStaffCreated')}</SelectItem>
                          <SelectItem value="walk_in">{t('overview.sourceWalkIn')}</SelectItem>
                          <SelectItem value="phone">{t('overview.sourcePhone')}</SelectItem>
                          <SelectItem value="website">{t('overview.sourceWebsite')}</SelectItem>
                          <SelectItem value="instagram">{t('overview.sourceInstagram')}</SelectItem>
                          <SelectItem value="email">{t('overview.sourceEmail')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('form.additionalInformation')}</h3>

              <FormField
                control={form.control}
                name="special_requests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.specialRequests')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('form.specialRequestsPlaceholder')}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('form.guestFacingNotes')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="internal_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.internalNotes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('form.internalNotesPlaceholder')}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('form.internalNotesDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Deposit */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="deposit_required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t('form.depositRequired')}</FormLabel>
                      <FormDescription>
                        {t('form.depositDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {depositRequired && (
                <FormField
                  control={form.control}
                  name="deposit_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('form.depositAmount')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={t('form.depositPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('overview.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? t('overview.addReservation') : t('overview.editReservation')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
