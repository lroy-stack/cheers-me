'use client'

import { format } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Event } from './types'
import { EventStatusBadge } from './event-status-badge'
import { eventTypeColors, eventTypeLabels, formatTime } from './event-utils'
import { Calendar, Clock, Tv, Edit, Trash2, Music, Mail, Phone, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface EventDetailSheetProps {
  event: Event | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (event: Event) => void
  onDelete: (id: string) => void
}

export function EventDetailSheet({
  event,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: EventDetailSheetProps) {
  const t = useTranslations('events')

  if (!event) return null

  const colors = eventTypeColors[event.event_type]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl">{event.title}</SheetTitle>
              <SheetDescription>
                <Badge variant="outline" className={cn('mt-2', colors.bg, colors.text)}>
                  {eventTypeLabels[event.event_type]}
                </Badge>
              </SheetDescription>
            </div>
            <EventStatusBadge status={event.status} />
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Description */}
          {event.description && (
            <div>
              <h3 className="font-medium mb-2">{t('calendar.description')}</h3>
              <p className="text-sm text-muted-foreground">{event.description}</p>
            </div>
          )}

          <Separator />

          {/* Date and Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{t('calendar.date')}</p>
                <p className="text-muted-foreground">
                  {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{t('sports.time')}</p>
                <p className="text-muted-foreground">
                  {formatTime(event.start_time)}
                  {event.end_time && ` - ${formatTime(event.end_time)}`}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* DJ Information (for DJ nights) */}
          {event.event_type === 'dj_night' && event.dj && (
            <>
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  {t('detail.djInformation')}
                </h3>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium">{event.dj.name}</p>
                    {event.dj.genre && (
                      <p className="text-muted-foreground">{t('djs.genre')}: {event.dj.genre}</p>
                    )}
                  </div>

                  {event.dj.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <a href={`mailto:${event.dj.email}`} className="hover:underline">
                        {event.dj.email}
                      </a>
                    </div>
                  )}

                  {event.dj.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <a href={`tel:${event.dj.phone}`} className="hover:underline">
                        {event.dj.phone}
                      </a>
                    </div>
                  )}

                  {event.dj.social_links && Object.keys(event.dj.social_links).length > 0 && (
                    <div className="space-y-1">
                      <p className="font-medium">{t('detail.socialMedia')}</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(event.dj.social_links).map(([platform, url]) => (
                          <a
                            key={platform}
                            href={url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs flex items-center gap-1 text-primary hover:underline"
                          >
                            <LinkIcon className="h-3 w-3" />
                            {platform}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {event.dj.rider_notes && (
                    <div>
                      <p className="font-medium">{t('detail.riderRequirements')}</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {event.dj.rider_notes}
                      </p>
                    </div>
                  )}

                  {event.dj.fee && (
                    <div>
                      <p className="font-medium">{t('detail.fee')}</p>
                      <p className="text-muted-foreground">€{event.dj.fee.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Sports Information (for sports events) */}
          {event.event_type === 'sports' && (
            <>
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Tv className="h-4 w-4" />
                  {t('detail.sportsDetails')}
                </h3>

                <div className="space-y-2 text-sm">
                  {event.sport_name && (
                    <div>
                      <p className="font-medium">{t('sports.sport')}</p>
                      <p className="text-muted-foreground">{event.sport_name}</p>
                    </div>
                  )}

                  {event.home_team && event.away_team && (
                    <div>
                      <p className="font-medium">{t('detail.match')}</p>
                      <p className="text-muted-foreground">
                        {event.home_team} vs {event.away_team}
                      </p>
                    </div>
                  )}

                  {event.broadcast_channel && (
                    <div>
                      <p className="font-medium">{t('sports.channel')}</p>
                      <p className="text-muted-foreground">{event.broadcast_channel}</p>
                    </div>
                  )}

                  {event.match_info && (
                    <div>
                      <p className="font-medium">{t('detail.additionalInformation')}</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {event.match_info}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Metadata */}
          <div className="space-y-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">{t('detail.created')} </span>
              {format(new Date(event.created_at), 'PPp')}
            </div>
            <div>
              <span className="font-medium">{t('detail.lastUpdated')} </span>
              {format(new Date(event.updated_at), 'PPp')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6 pt-6 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onEdit(event)
              onOpenChange(false)
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            {t('calendar.editEvent')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm(t('detail.confirmDelete'))) {
                onDelete(event.id)
                onOpenChange(false)
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
