'use client'

import { format, parseISO } from 'date-fns'
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
import { ReservationStatusBadge } from './reservation-status-badge'
import {
  Calendar,
  Check,
  Clock,
  Users,
  Phone,
  Mail,
  MapPin,
  FileText,
  StickyNote,
  Euro,
  Globe,
  Edit,
  Trash2,
  Armchair,
  CheckCircle,
  Send,
  MessageCircle,
  UserPlus,
  Link2,
  XCircle,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

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
  created_at: string
  actual_arrival_time: string | null
  seated_at: string | null
  actual_departure_time: string | null
  tables?: Table | null
  customers?: Customer | null
}

interface ReservationDetailSheetProps {
  reservation: Reservation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (reservation: Reservation) => void
  onDelete?: (id: string) => void
  onStatusChange?: (id: string, status: ReservationStatus) => void
  onAddToCRM?: (reservation: Reservation) => void
  onSendConfirmationEmail?: (reservation: Reservation) => void
}

function getWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}`
}

export function ReservationDetailSheet({
  reservation,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onStatusChange,
  onAddToCRM,
  onSendConfirmationEmail,
}: ReservationDetailSheetProps) {
  const t = useTranslations('reservations')

  const sourceLabels: Record<ReservationSource, string> = {
    walk_in: t('overview.sourceWalkIn'),
    phone: t('overview.sourcePhone'),
    website: t('overview.sourceWebsite'),
    instagram: t('overview.sourceInstagram'),
    email: t('overview.sourceEmail'),
    staff_created: t('overview.sourceStaffCreated'),
  }

  if (!reservation) return null

  const handleDelete = () => {
    if (confirm(t('overview.confirmDeleteReservation'))) {
      onDelete?.(reservation.id)
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle>{reservation.guest_name}</SheetTitle>
              <SheetDescription>{t('detail.reservationDetails')}</SheetDescription>
            </div>
            <ReservationStatusBadge status={reservation.reservation_status} />
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Guest Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t('detail.guestInformation')}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{reservation.guest_phone}</span>
              </div>
              {reservation.guest_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{reservation.guest_email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">{sourceLabels[reservation.source]}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reservation Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t('detail.reservationDetails')}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(parseISO(reservation.reservation_date), 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {reservation.start_time.substring(0, 5)}
                  <span className="text-muted-foreground">
                    {' '}
                    ({reservation.estimated_duration_minutes} {t('detail.minutes')})
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{t('overview.guests', { count: reservation.party_size })}</span>
              </div>
              {reservation.tables && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {t('overview.table')} {reservation.tables.table_number}
                    {reservation.tables.floor_sections &&
                      ` — ${reservation.tables.floor_sections.name}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Special Requests */}
          {reservation.special_requests && (
            <>
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4" />
                  {t('detail.specialRequests')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {reservation.special_requests}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Internal Notes */}
          {reservation.internal_notes && (
            <>
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <StickyNote className="h-4 w-4" />
                  {t('detail.internalNotes')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {reservation.internal_notes}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Deposit Information */}
          {reservation.deposit_required && (
            <>
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Euro className="h-4 w-4" />
                  {t('detail.depositInformation')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('detail.amount')}</span>
                    <span className="font-medium">
                      €{reservation.deposit_amount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('overview.status')}:</span>
                    <Badge
                      variant={reservation.deposit_paid ? 'default' : 'secondary'}
                    >
                      {reservation.deposit_paid ? t('detail.paid') : t('overview.pending')}
                    </Badge>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Timing Information */}
          {(reservation.actual_arrival_time ||
            reservation.seated_at ||
            reservation.actual_departure_time) && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">{t('detail.timing')}</h3>
                <div className="space-y-2 text-sm">
                  {reservation.actual_arrival_time && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('detail.arrived')}</span>
                      <span>
                        {format(
                          parseISO(reservation.actual_arrival_time),
                          'HH:mm'
                        )}
                      </span>
                    </div>
                  )}
                  {reservation.seated_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('detail.seated')}</span>
                      <span>
                        {format(parseISO(reservation.seated_at), 'HH:mm')}
                      </span>
                    </div>
                  )}
                  {reservation.actual_departure_time && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('detail.departed')}</span>
                      <span>
                        {format(
                          parseISO(reservation.actual_departure_time),
                          'HH:mm'
                        )}
                      </span>
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
              {t('detail.created')} {format(parseISO(reservation.created_at), 'PPp')}
            </div>
            <div>{t('detail.id')} {reservation.id}</div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t('detail.actions')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {/* Accept (pending only) */}
              {reservation.reservation_status === 'pending' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    onStatusChange?.(reservation.id, 'confirmed')
                    onOpenChange(false)
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {t('overview.confirm')}
                </Button>
              )}

              {/* Seat (confirmed only) */}
              {reservation.reservation_status === 'confirmed' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    onStatusChange?.(reservation.id, 'seated')
                    onOpenChange(false)
                  }}
                >
                  <Armchair className="mr-2 h-4 w-4" />
                  {t('overview.seat')}
                </Button>
              )}

              {/* Complete (seated only) */}
              {reservation.reservation_status === 'seated' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    onStatusChange?.(reservation.id, 'completed')
                    onOpenChange(false)
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('overview.complete')}
                </Button>
              )}

              {/* Send Confirmation Email (confirmed + has email) */}
              {reservation.reservation_status === 'confirmed' &&
                reservation.guest_email && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSendConfirmationEmail?.(reservation)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {t('detail.sendConfirmation')}
                  </Button>
                )}

              {/* WhatsApp (if has phone) */}
              {reservation.guest_phone && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={getWhatsAppUrl(reservation.guest_phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>
              )}

              {/* Add to CRM (if no customer_id) */}
              {!reservation.customer_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddToCRM?.(reservation)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('detail.addToCRM')}
                </Button>
              )}

              {/* Linked to CRM (if customer_id exists) */}
              {reservation.customer_id && (
                <Button variant="outline" size="sm" disabled>
                  <Link2 className="mr-2 h-4 w-4" />
                  {t('detail.linkedToCRM')}
                </Button>
              )}

              {/* Edit */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit?.(reservation)}
              >
                <Edit className="mr-2 h-4 w-4" />
                {t('overview.edit')}
              </Button>

              {/* Cancel (pending/confirmed only) */}
              {['pending', 'confirmed'].includes(reservation.reservation_status) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => {
                    onStatusChange?.(reservation.id, 'cancelled')
                    onOpenChange(false)
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {t('overview.cancel')}
                </Button>
              )}

              {/* Delete */}
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('overview.delete')}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
