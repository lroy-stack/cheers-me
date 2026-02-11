'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReservationStatusBadge } from './reservation-status-badge'
import {
  MoreHorizontal,
  Search,
  Phone,
  Mail,
  MapPin,
  Clock,
  Users,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show'

type ReservationSource =
  | 'walk_in'
  | 'phone'
  | 'website'
  | 'instagram'
  | 'email'
  | 'staff_created'

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

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
}

interface Reservation {
  id: string
  guest_name: string
  guest_email: string | null
  guest_phone: string
  party_size: number
  reservation_date: string
  start_time: string
  reservation_status: ReservationStatus
  source: ReservationSource
  estimated_duration_minutes: number
  special_requests: string | null
  internal_notes: string | null
  table_id: string | null
  customer_id: string | null
  deposit_required: boolean
  deposit_amount: number | null
  deposit_paid: boolean
  actual_arrival_time: string | null
  seated_at: string | null
  actual_departure_time: string | null
  created_at: string
  tables?: Table | null
  customers?: Customer | null
}

interface ReservationListProps {
  reservations: Reservation[]
  onEdit?: (reservation: Reservation) => void
  onDelete?: (id: string) => void
  onStatusChange?: (id: string, status: ReservationStatus) => void
  onViewDetails?: (reservation: Reservation) => void
}

export function ReservationList({
  reservations,
  onEdit,
  onDelete,
  onStatusChange,
  onViewDetails,
}: ReservationListProps) {
  const t = useTranslations('reservations')

  const sourceLabels: Record<ReservationSource, string> = {
    walk_in: t('overview.sourceWalkIn'),
    phone: t('overview.sourcePhone'),
    website: t('overview.sourceWebsite'),
    instagram: t('overview.sourceInstagram'),
    email: t('overview.sourceEmail'),
    staff_created: t('overview.sourceStaff'),
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  // Filter reservations based on search and filters
  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      reservation.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reservation.guest_phone.includes(searchQuery) ||
      (reservation.guest_email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

    const matchesStatus =
      statusFilter === 'all' || reservation.reservation_status === statusFilter

    const matchesSource = sourceFilter === 'all' || reservation.source === sourceFilter

    return matchesSearch && matchesStatus && matchesSource
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('overview.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('overview.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('overview.allStatuses')}</SelectItem>
            <SelectItem value="pending">{t('overview.pending')}</SelectItem>
            <SelectItem value="confirmed">{t('overview.confirmed')}</SelectItem>
            <SelectItem value="seated">{t('overview.seated')}</SelectItem>
            <SelectItem value="completed">{t('overview.completed')}</SelectItem>
            <SelectItem value="cancelled">{t('overview.cancelled')}</SelectItem>
            <SelectItem value="no_show">{t('overview.noShow')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('overview.source')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('overview.allSources')}</SelectItem>
            <SelectItem value="walk_in">{t('overview.sourceWalkIn')}</SelectItem>
            <SelectItem value="phone">{t('overview.sourcePhone')}</SelectItem>
            <SelectItem value="website">{t('overview.sourceWebsite')}</SelectItem>
            <SelectItem value="instagram">{t('overview.sourceInstagram')}</SelectItem>
            <SelectItem value="email">{t('overview.sourceEmail')}</SelectItem>
            <SelectItem value="staff_created">{t('overview.sourceStaff')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {t('overview.showingResults', { count: filteredReservations.length, total: reservations.length })}
      </div>

      {/* Desktop Table View - hidden on mobile */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('overview.guestName')}</TableHead>
              <TableHead>{t('overview.date')} & {t('overview.time')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('overview.partySize')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('overview.table')}</TableHead>
              <TableHead>{t('overview.status')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('overview.source')}</TableHead>
              <TableHead className="text-right">{t('overview.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t('overview.noReservations')}
                </TableCell>
              </TableRow>
            ) : (
              filteredReservations.map((reservation) => (
                <TableRow
                  key={reservation.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onViewDetails?.(reservation)}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{reservation.guest_name}</div>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {reservation.guest_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {reservation.guest_phone}
                          </div>
                        )}
                        {reservation.guest_email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {reservation.guest_email}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {format(parseISO(reservation.reservation_date), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {reservation.start_time.substring(0, 5)}
                        <span className="text-muted-foreground/60">
                          ({reservation.estimated_duration_minutes}min)
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{reservation.party_size}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {reservation.tables ? (
                      <div className="space-y-1">
                        <div className="font-medium">
                          {t('overview.table')} {reservation.tables.table_number}
                        </div>
                        {reservation.tables.floor_sections && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {reservation.tables.floor_sections.name}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">{t('overview.notAssigned')}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ReservationStatusBadge status={reservation.reservation_status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">
                      {sourceLabels[reservation.source]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('overview.actions')}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onViewDetails?.(reservation)
                        }}>
                          {t('overview.viewDetails')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onEdit?.(reservation)
                        }}>
                          {t('overview.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {reservation.reservation_status === 'pending' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            onStatusChange?.(reservation.id, 'confirmed')
                          }}>
                            {t('overview.confirm')}
                          </DropdownMenuItem>
                        )}
                        {reservation.reservation_status === 'confirmed' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            onStatusChange?.(reservation.id, 'seated')
                          }}>
                            {t('overview.seat')}
                          </DropdownMenuItem>
                        )}
                        {reservation.reservation_status === 'seated' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            onStatusChange?.(reservation.id, 'completed')
                          }}>
                            {t('overview.complete')}
                          </DropdownMenuItem>
                        )}
                        {['pending', 'confirmed'].includes(reservation.reservation_status) && (
                          <>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              onStatusChange?.(reservation.id, 'no_show')
                            }}>
                              {t('overview.noShow')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              onStatusChange?.(reservation.id, 'cancelled')
                            }}>
                              {t('overview.cancel')}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(t('overview.confirmDeleteReservation'))) {
                              onDelete?.(reservation.id)
                            }
                          }}
                        >
                          {t('overview.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View - shown only on mobile */}
      <div className="block md:hidden space-y-3">
        {filteredReservations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('overview.noReservations')}
          </div>
        ) : (
          filteredReservations.map((reservation) => (
            <div
              key={reservation.id}
              onClick={() => onViewDetails?.(reservation)}
              className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3 cursor-pointer active:bg-muted/50"
            >
              {/* Header: Date/Time and Status */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-foreground">
                    {format(parseISO(reservation.reservation_date), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    {reservation.start_time.substring(0, 5)}
                    <span className="text-muted-foreground/60">
                      ({reservation.estimated_duration_minutes}min)
                    </span>
                  </div>
                </div>
                <ReservationStatusBadge status={reservation.reservation_status} />
              </div>

              {/* Guest Info */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="font-medium text-foreground">{reservation.guest_name}</div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{reservation.party_size} {reservation.party_size === 1 ? 'guest' : 'guests'}</span>
                  </div>
                  {reservation.tables && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{t('overview.table')} {reservation.tables.table_number}</span>
                    </div>
                  )}
                </div>
                {reservation.guest_phone && (
                  <a
                    href={`tel:${reservation.guest_phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {reservation.guest_phone}
                  </a>
                )}
                {reservation.guest_email && (
                  <a
                    href={`mailto:${reservation.guest_email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {reservation.guest_email}
                  </a>
                )}
              </div>

              {/* Source Badge */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">{t('overview.source')}:</span>
                <Badge variant="outline" className="text-xs">
                  {sourceLabels[reservation.source]}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-border">
                {reservation.reservation_status === 'pending' && (
                  <Button
                    variant="outline"
                    className="flex-1 h-11"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange?.(reservation.id, 'confirmed')
                    }}
                  >
                    {t('overview.confirm')}
                  </Button>
                )}
                {reservation.reservation_status === 'confirmed' && (
                  <Button
                    variant="outline"
                    className="flex-1 h-11"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange?.(reservation.id, 'seated')
                    }}
                  >
                    {t('overview.seat')}
                  </Button>
                )}
                {reservation.reservation_status === 'seated' && (
                  <Button
                    variant="outline"
                    className="flex-1 h-11"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange?.(reservation.id, 'completed')
                    }}
                  >
                    {t('overview.complete')}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" className={cn(
                      ['pending', 'confirmed', 'seated'].includes(reservation.reservation_status) ? 'w-11 p-0' : 'flex-1'
                    )}>
                      <MoreHorizontal className="h-4 w-4" />
                      {!['pending', 'confirmed', 'seated'].includes(reservation.reservation_status) && (
                        <span className="ml-2">{t('overview.actions')}</span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{t('overview.actions')}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      onViewDetails?.(reservation)
                    }}>
                      {t('overview.viewDetails')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      onEdit?.(reservation)
                    }}>
                      {t('overview.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {['pending', 'confirmed'].includes(reservation.reservation_status) && (
                      <>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onStatusChange?.(reservation.id, 'no_show')
                        }}>
                          {t('overview.noShow')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onStatusChange?.(reservation.id, 'cancelled')
                        }}>
                          {t('overview.cancel')}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(t('overview.confirmDeleteReservation'))) {
                          onDelete?.(reservation.id)
                        }
                      }}
                    >
                      {t('overview.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
