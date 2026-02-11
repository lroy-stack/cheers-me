'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { CalendarIcon, Tv } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const sportsEventSchema = z.object({
  sport_name: z.string().min(1, 'Sport name is required'),
  home_team: z.string().min(1, 'Home team is required'),
  away_team: z.string().min(1, 'Away team is required'),
  event_date: z.date({ required_error: 'Event date is required' }),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().optional(),
  broadcast_channel: z.string().min(1, 'Broadcast channel is required'),
  match_info: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
})

export type SportsEventFormData = z.infer<typeof sportsEventSchema>

interface SportsEventFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SportsEventFormData) => Promise<void>
  mode: 'create' | 'edit'
  defaultValues?: Partial<SportsEventFormData>
}

const POPULAR_SPORTS = [
  'Football',
  'Rugby',
  'Formula 1',
  'Basketball',
  'Tennis',
  'Cricket',
  'Boxing/MMA',
  'Other'
]

const COMMON_CHANNELS = [
  'Sky Sports',
  'BT Sport',
  'BBC',
  'ITV',
  'DAZN',
  'ESPN',
  'Other'
]

export function SportsEventForm({
  open,
  onOpenChange,
  onSubmit,
  mode,
  defaultValues,
}: SportsEventFormProps) {
  const t = useTranslations('events')
  const form = useForm<SportsEventFormData>({
    resolver: zodResolver(sportsEventSchema),
    defaultValues: {
      sport_name: defaultValues?.sport_name || '',
      home_team: defaultValues?.home_team || '',
      away_team: defaultValues?.away_team || '',
      event_date: defaultValues?.event_date || new Date(),
      start_time: defaultValues?.start_time || '20:00',
      end_time: defaultValues?.end_time || '',
      broadcast_channel: defaultValues?.broadcast_channel || '',
      match_info: defaultValues?.match_info || '',
      description: defaultValues?.description || '',
      status: defaultValues?.status || 'confirmed',
    },
  })

  const handleSubmit = async (data: SportsEventFormData) => {
    try {
      await onSubmit(data)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Form submission error:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto pb-safe">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5 text-cyan-500" />
            {mode === 'create' ? t('sports.addEvent') : t('sports.title')}
          </DialogTitle>
          <DialogDescription>
            {t('sports.formDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Sport Name */}
            <FormField
              control={form.control}
              name="sport_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sports.sport')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('sports.selectSport')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {POPULAR_SPORTS.map((sport) => (
                        <SelectItem key={sport} value={sport}>
                          {sport}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teams */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="home_team"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sports.homeTeam')} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('sports.homeTeamPlaceholder')} {...field} />
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
                    <FormLabel>{t('sports.awayTeam')} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('sports.awayTeamPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Match Info */}
            <FormField
              control={form.control}
              name="match_info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sports.matchInfo')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('sports.matchInfoPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('sports.leagueDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="event_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('sports.date')} *</FormLabel>
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
                              <span>{t('sports.pickADate')}</span>
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
                    <FormLabel>{t('calendar.startTime')} *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('calendar.endTime')}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {t('sports.optional')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Broadcast Channel */}
            <FormField
              control={form.control}
              name="broadcast_channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sports.channel')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('sports.selectChannel')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMMON_CHANNELS.map((channel) => (
                        <SelectItem key={channel} value={channel}>
                          {channel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('sports.channelDescription')}
                  </FormDescription>
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
                  <FormLabel>{t('sports.additionalNotes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('sports.notesPlaceholder')}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status (only for edit mode) */}
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
                          <SelectValue />
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('sports.cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? t('sports.saving')
                  : mode === 'create'
                  ? t('sports.createEvent')
                  : t('sports.updateEvent')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
