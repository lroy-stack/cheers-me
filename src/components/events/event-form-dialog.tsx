'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { EventFormData, DJ } from './types'
import { eventTypeLabels } from './event-utils'

// Validation schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  event_date: z.date({ required_error: 'Event date is required' }),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').optional().or(z.literal('')),
  event_type: z.enum(['dj_night', 'sports', 'themed_night', 'private_event', 'other']),
  dj_id: z.string().optional().or(z.literal('')),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  // Sports fields
  sport_name: z.string().max(100).optional().or(z.literal('')),
  home_team: z.string().max(255).optional().or(z.literal('')),
  away_team: z.string().max(255).optional().or(z.literal('')),
  broadcast_channel: z.string().max(100).optional().or(z.literal('')),
  match_info: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

interface EventFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EventFormData) => Promise<void>
  djs: DJ[]
  mode: 'create' | 'edit'
  defaultValues?: Partial<FormValues>
}

export function EventFormDialog({
  open,
  onOpenChange,
  onSubmit,
  djs,
  mode,
  defaultValues,
}: EventFormDialogProps) {
  const t = useTranslations('events')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      event_date: new Date(),
      start_time: '22:00',
      end_time: '',
      event_type: 'dj_night',
      dj_id: '',
      status: 'pending',
      sport_name: '',
      home_team: '',
      away_team: '',
      broadcast_channel: '',
      match_info: '',
      ...defaultValues,
    },
  })

  // Reset form when dialog opens/closes or default values change
  useEffect(() => {
    if (open && defaultValues) {
      form.reset({
        title: defaultValues.title || '',
        description: defaultValues.description || '',
        event_date: defaultValues.event_date || new Date(),
        start_time: defaultValues.start_time || '22:00',
        end_time: defaultValues.end_time || '',
        event_type: defaultValues.event_type || 'dj_night',
        dj_id: defaultValues.dj_id || '',
        status: defaultValues.status || 'pending',
        sport_name: defaultValues.sport_name || '',
        home_team: defaultValues.home_team || '',
        away_team: defaultValues.away_team || '',
        broadcast_channel: defaultValues.broadcast_channel || '',
        match_info: defaultValues.match_info || '',
      })
    }
  }, [open, defaultValues, form])

  const eventType = form.watch('event_type')

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit(values as EventFormData)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      // Error is handled by parent component
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto pb-safe">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('calendar.addEvent') : t('calendar.editEvent')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? t('calendar.addNewEvent')
              : t('calendar.updateDetails')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('calendar.eventName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('calendar.eventTitlePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('calendar.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('calendar.eventDescriptionPlaceholder')}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Event Type */}
            <FormField
              control={form.control}
              name="event_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('calendar.type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('calendar.selectEventType')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(eventTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Event Date */}
              <FormField
                control={form.control}
                name="event_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('calendar.date')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>{t('calendar.pickADate')}</span>
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Time */}
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('calendar.startTime')}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Time */}
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('calendar.endTime')}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* DJ Selection (only for DJ nights) */}
            {eventType === 'dj_night' && (
              <FormField
                control={form.control}
                name="dj_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DJ</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)} value={field.value || '__none__'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('calendar.selectDj')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">{t('calendar.noDjSelected')}</SelectItem>
                        {djs.map((dj) => (
                          <SelectItem key={dj.id} value={dj.id}>
                            {dj.name} {dj.genre && `(${dj.genre})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('calendar.assignDj')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Sports Fields (only for sports events) */}
            {eventType === 'sports' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium">{t('sports.title')}</h3>

                <FormField
                  control={form.control}
                  name="sport_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('sports.sport')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('sports.sportPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="home_team"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('sports.homeTeam')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('sports.homeTeamFormPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="away_team"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('sports.awayTeam')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('sports.awayTeamFormPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="broadcast_channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('sports.channel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('sports.channelPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="match_info"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('calendar.additionalInfo')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('calendar.additionalMatchInfo')}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Status (for edit mode) */}
            {mode === 'edit' && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('calendar.status')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('calendar.selectStatus')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">{t('eventStatuses.pending')}</SelectItem>
                        <SelectItem value="confirmed">{t('eventStatuses.confirmed')}</SelectItem>
                        <SelectItem value="completed">{t('eventStatuses.completed')}</SelectItem>
                        <SelectItem value="cancelled">{t('eventStatuses.cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('calendar.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? t('calendar.addEvent') : t('calendar.editEvent')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
