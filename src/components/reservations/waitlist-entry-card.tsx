'use client'

import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WaitlistStatusBadge } from './waitlist-status-badge'
import {
  Users,
  Phone,
  Clock,
  MapPin,
  Bell,
  Check,
  X,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslations } from 'next-intl'

type WaitlistStatus = 'waiting' | 'notified' | 'seated' | 'cancelled' | 'expired'

interface WaitlistEntry {
  id: string
  position: number
  guest_name: string
  guest_phone: string
  party_size: number
  waitlist_status: WaitlistStatus
  quote_time_minutes?: number
  preferred_section?: string
  notes?: string
  created_at: string
  notified_at?: string
  seated_at?: string
  table_id?: string
  tables?: {
    table_number: string
    capacity: number
  }
}

interface WaitlistEntryCardProps {
  entry: WaitlistEntry
  onNotify?: (id: string) => void
  onSeat?: (id: string) => void
  onCancel?: (id: string) => void
  onRemove?: (id: string) => void
}

export function WaitlistEntryCard({
  entry,
  onNotify,
  onSeat,
  onCancel,
  onRemove,
}: WaitlistEntryCardProps) {
  const t = useTranslations('reservations')
  const isWaiting = entry.waitlist_status === 'waiting'
  const isNotified = entry.waitlist_status === 'notified'
  const waitTime = formatDistanceToNow(new Date(entry.created_at), {
    addSuffix: true,
  })

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Position Badge */}
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-500 font-bold text-lg">
              #{entry.position}
            </div>
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold text-lg truncate">
                  {entry.guest_name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{entry.guest_phone}</span>
                </div>
              </div>
              <WaitlistStatusBadge status={entry.waitlist_status} />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{t('overview.guests', { count: entry.party_size })}</span>
              </div>
              {entry.quote_time_minutes && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>~{entry.quote_time_minutes} min</span>
                </div>
              )}
              {entry.preferred_section && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{entry.preferred_section}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="text-xs">Added {waitTime}</span>
              </div>
            </div>

            {/* Notes */}
            {entry.notes && (
              <div className="text-sm text-muted-foreground italic border-l-2 border-border pl-2 mb-2">
                {entry.notes}
              </div>
            )}

            {/* Seated Info */}
            {entry.tables && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500">
                Seated at Table {entry.tables.table_number}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {isWaiting && onNotify && (
                  <DropdownMenuItem onClick={() => onNotify(entry.id)}>
                    <Bell className="mr-2 h-4 w-4" />
                    {t('waitlist.notify')}
                  </DropdownMenuItem>
                )}

                {(isWaiting || isNotified) && onSeat && (
                  <DropdownMenuItem onClick={() => onSeat(entry.id)}>
                    <Check className="mr-2 h-4 w-4" />
                    {t('waitlist.seat')}
                  </DropdownMenuItem>
                )}

                {(isWaiting || isNotified) && onCancel && (
                  <DropdownMenuItem onClick={() => onCancel(entry.id)}>
                    <X className="mr-2 h-4 w-4" />
                    {t('overview.cancel')}
                  </DropdownMenuItem>
                )}

                {onRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onRemove(entry.id)}
                      className="text-red-500"
                    >
                      <X className="mr-2 h-4 w-4" />
                      {t('waitlist.remove')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Quick Actions */}
        <div className="flex gap-2 mt-3 md:hidden">
          {isWaiting && onNotify && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onNotify(entry.id)}
            >
              <Bell className="mr-1 h-3 w-3" />
              {t('waitlist.notify')}
            </Button>
          )}
          {(isWaiting || isNotified) && onSeat && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onSeat(entry.id)}
            >
              <Check className="mr-1 h-3 w-3" />
              {t('waitlist.seat')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
