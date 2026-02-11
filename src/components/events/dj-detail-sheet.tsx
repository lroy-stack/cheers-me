'use client'

import { useEffect, useState } from 'react'
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
import { Card, CardContent } from '@/components/ui/card'
import {
  Music2,
  Mail,
  Phone,
  Instagram,
  Facebook,
  Globe,
  Edit,
  Trash2,
  Calendar,
  Euro,
  ExternalLink,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DJWithStats } from './dj-types'
import { format } from 'date-fns'

interface DJDetailSheetProps {
  dj: DJWithStats | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (dj: DJWithStats) => void
  onDelete: (id: string) => void
}

export function DJDetailSheet({
  dj,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: DJDetailSheetProps) {
  const t = useTranslations('events')
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [, setIsLoadingEvents] = useState(false)

  // Fetch DJ's upcoming events when sheet opens
  useEffect(() => {
    if (open && dj) {
      fetchUpcomingEvents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dj?.id])

  const fetchUpcomingEvents = async () => {
    if (!dj) return

    setIsLoadingEvents(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const response = await fetch(
        `/api/events?start_date=${today}&dj_id=${dj.id}`
      )
      if (response.ok) {
        const events = await response.json()
        setUpcomingEvents(events.slice(0, 5)) // Show next 5 events
      }
    } catch (error) {
      console.error('Error fetching DJ events:', error)
    } finally {
      setIsLoadingEvents(false)
    }
  }

  if (!dj) return null

  const handleEdit = () => {
    onEdit(dj)
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (confirm(t('djs.confirmDelete', { name: dj.name }))) {
      onDelete(dj.id)
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
              <Music2 className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-2xl">{dj.name}</SheetTitle>
              <SheetDescription>
                {dj.genre ? (
                  <Badge variant="secondary" className="mt-1">
                    {dj.genre}
                  </Badge>
                ) : (
                  t('djs.djProfile')
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">{t('djs.totalEvents')}</span>
                </div>
                <div className="text-2xl font-bold">{dj.total_events || 0}</div>
                {dj.upcoming_events !== undefined && dj.upcoming_events > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('djs.upcomingCount', { count: dj.upcoming_events })}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Euro className="h-4 w-4" />
                  <span className="text-xs">{t('djs.performanceFee')}</span>
                </div>
                <div className="text-2xl font-bold">€{dj.fee.toFixed(0)}</div>
                {dj.total_earnings !== undefined && dj.total_earnings > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    €{dj.total_earnings.toFixed(0)} earned
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{t('djs.contactInformation')}</h3>
            <div className="space-y-3">
              {dj.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${dj.email}`}
                    className="text-sm hover:underline"
                  >
                    {dj.email}
                  </a>
                </div>
              )}
              {dj.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${dj.phone}`}
                    className="text-sm hover:underline"
                  >
                    {dj.phone}
                  </a>
                </div>
              )}
              {!dj.email && !dj.phone && (
                <p className="text-sm text-muted-foreground">{t('djs.noContactInfo')}</p>
              )}
            </div>
          </div>

          {/* Social Media */}
          {dj.social_links && Object.keys(dj.social_links).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3">{t('djs.socialMedia')}</h3>
                <div className="space-y-3">
                  {dj.social_links.instagram && (
                    <a
                      href={dj.social_links.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm hover:underline"
                    >
                      <Instagram className="h-4 w-4 text-muted-foreground" />
                      <span>{t('djs.instagram')}</span>
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </a>
                  )}
                  {dj.social_links.facebook && (
                    <a
                      href={dj.social_links.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm hover:underline"
                    >
                      <Facebook className="h-4 w-4 text-muted-foreground" />
                      <span>{t('djs.facebook')}</span>
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </a>
                  )}
                  {dj.social_links.website && (
                    <a
                      href={dj.social_links.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm hover:underline"
                    >
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>{t('djs.website')}</span>
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </a>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Rider/Technical Requirements */}
          {dj.rider_notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3">{t('djs.riderRequirements')}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {dj.rider_notes}
                </p>
              </div>
            </>
          )}

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3">{t('djs.upcomingSets')}</h3>
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground"
                    >
                      <div>
                        <div className="font-medium text-sm">{event.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(event.event_date), 'MMM d, yyyy')} at{' '}
                          {event.start_time.substring(0, 5)}
                        </div>
                      </div>
                      <Badge
                        variant={
                          event.status === 'confirmed'
                            ? 'default'
                            : event.status === 'pending'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleEdit} className="flex-1">
              <Edit className="mr-2 h-4 w-4" />
              {t('djs.editDj')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex-1"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('djs.delete')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
