'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Calendar, Clock, Users, Mail, Phone, User, CheckCircle2, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface BookingFormData {
  guest_name: string
  guest_email: string
  guest_phone: string
  party_size: number
  reservation_date: string
  start_time: string
  special_requests: string
  language: 'en' | 'nl' | 'es' | 'de'
}

interface AvailabilityResponse {
  available: boolean
  reason?: string
  available_tables?: number
  suggested_times?: string[]
  available_slots?: Array<{ start_time: string; end_time: string }>
}

interface BookingResponse {
  success: boolean
  message: string
  reservation?: {
    id: string
    guest_name: string
    party_size: number
    date: string
    time: string
    status: string
    table_number?: string
    section?: string
  }
  error?: string
  details?: Array<{ field: string; message: string }>
}

export default function PublicBookingForm() {
  const t = useTranslations('reservations')
  const tb = useTranslations('common')
  const [formData, setFormData] = useState<BookingFormData>({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    party_size: 2,
    reservation_date: '',
    start_time: '',
    special_requests: '',
    language: 'en',
  })

  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookingResult, setBookingResult] = useState<BookingResponse | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Get maximum date (30 days from now by default)
  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    return maxDate.toISOString().split('T')[0]
  }

  // Check availability when date, time, and party size are selected
  const checkAvailability = async () => {
    if (!formData.reservation_date || !formData.start_time || !formData.party_size) {
      return
    }

    setCheckingAvailability(true)
    setAvailability(null)

    try {
      const params = new URLSearchParams({
        date: formData.reservation_date,
        time: formData.start_time,
        party_size: formData.party_size.toString(),
      })

      const response = await fetch(`/api/reservations/availability?${params}`)

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const data = await response.json()
      setAvailability(data)
    } catch (error) {
      console.error('Error checking availability:', error)
      setAvailability({
        available: false,
        reason: tb('booking.availabilityError'),
      })
    } finally {
      setCheckingAvailability(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setBookingResult(null)

    // Basic validation
    const newErrors: Record<string, string> = {}

    if (!formData.guest_name.trim()) {
      newErrors.guest_name = tb('booking.nameRequired')
    }

    if (!formData.guest_phone.trim()) {
      newErrors.guest_phone = tb('booking.phoneRequired')
    }

    if (!formData.reservation_date) {
      newErrors.reservation_date = tb('booking.dateRequired')
    }

    if (!formData.start_time) {
      newErrors.start_time = tb('booking.timeRequired')
    }

    if (formData.party_size < 1) {
      newErrors.party_size = tb('booking.partySizeMin')
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/public/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      let data
      try {
        data = await response.json()
      } catch {
        throw new Error(`Server error: ${response.status}`)
      }

      if (response.ok) {
        setBookingResult(data)
        // Reset form on success
        setFormData({
          guest_name: '',
          guest_email: '',
          guest_phone: '',
          party_size: 2,
          reservation_date: '',
          start_time: '',
          special_requests: '',
          language: 'en',
        })
        setAvailability(null)
      } else {
        setBookingResult({
          success: false,
          message: data.message || data.error || tb('booking.bookingFailed'),
          error: data.error,
          details: data.details,
        })

        // Map field-specific errors
        if (data.details) {
          const fieldErrors: Record<string, string> = {}
          data.details.forEach((detail: { field: string; message: string }) => {
            fieldErrors[detail.field] = detail.message
          })
          setErrors(fieldErrors)
        }
      }
    } catch (error) {
      console.error('Error creating reservation:', error)
      setBookingResult({
        success: false,
        message: tb('booking.submissionError'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Show success message if booking was successful
  if (bookingResult?.success) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            <CardTitle>{tb('booking.reservationReceived')}</CardTitle>
          </div>
          <CardDescription>
            {tb('booking.thankYou')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{tb('booking.confirmationPending')}</AlertTitle>
            <AlertDescription>{bookingResult.message}</AlertDescription>
          </Alert>

          {bookingResult.reservation && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">{tb('booking.reservationDetailsTitle')}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('overview.guestName')}:</span>{' '}
                  <span className="font-medium">{bookingResult.reservation.guest_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('overview.partySize')}:</span>{' '}
                  <span className="font-medium">{bookingResult.reservation.party_size}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('overview.date')}:</span>{' '}
                  <span className="font-medium">{bookingResult.reservation.date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('overview.time')}:</span>{' '}
                  <span className="font-medium">{bookingResult.reservation.time}</span>
                </div>
                {bookingResult.reservation.table_number && (
                  <div>
                    <span className="text-muted-foreground">{t('overview.table')}:</span>{' '}
                    <span className="font-medium">{bookingResult.reservation.table_number}</span>
                  </div>
                )}
                {bookingResult.reservation.section && (
                  <div>
                    <span className="text-muted-foreground">{t('floorplan.section')}:</span>{' '}
                    <span className="font-medium">{bookingResult.reservation.section}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              {tb('booking.confirmationEmail')}
            </p>
            <p>
              {tb('booking.contactQuestion')}{' '}
              <a href="tel:+34971XXXXXX" className="text-primary hover:underline">
                +34 971 XXX XXX
              </a>
            </p>
          </div>

          <Button
            onClick={() => setBookingResult(null)}
            variant="outline"
            className="w-full"
          >
            {tb('booking.makeAnother')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{tb('booking.reserveTable')}</CardTitle>
        <CardDescription>
          {tb('booking.reserveTableDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error message */}
          {bookingResult && !bookingResult.success && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{tb('booking.bookingFailed')}</AlertTitle>
              <AlertDescription>{bookingResult.message}</AlertDescription>
            </Alert>
          )}

          {/* Guest Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
              {tb('booking.guestInformation')}
            </h3>

            <div className="space-y-2">
              <Label htmlFor="guest_name">
                {tb('booking.fullName')} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guest_name"
                  name="guest_name"
                  placeholder={t('booking.namePlaceholder')}
                  value={formData.guest_name}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                  className={`pl-10 ${errors.guest_name ? 'border-destructive' : ''}`}
                  required
                />
              </div>
              {errors.guest_name && (
                <p className="text-sm text-destructive">{errors.guest_name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guest_email">{tb('booking.emailOptional')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest_email"
                    name="guest_email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.guest_email}
                    onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                    className={`pl-10 ${errors.guest_email ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.guest_email && (
                  <p className="text-sm text-destructive">{errors.guest_email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest_phone">
                  {tb('booking.phoneNumber')} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest_phone"
                    name="guest_phone"
                    type="tel"
                    placeholder={t('booking.phonePlaceholder')}
                    value={formData.guest_phone}
                    onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                    className={`pl-10 ${errors.guest_phone ? 'border-destructive' : ''}`}
                    required
                  />
                </div>
                {errors.guest_phone && (
                  <p className="text-sm text-destructive">{errors.guest_phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Reservation Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
              {tb('booking.reservationDetails')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reservation_date">
                  {t('overview.date')} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Input
                    id="reservation_date"
                    name="reservation_date"
                    type="date"
                    min={getMinDate()}
                    max={getMaxDate()}
                    value={formData.reservation_date}
                    onChange={(e) => {
                      setFormData({ ...formData, reservation_date: e.target.value })
                      setAvailability(null)
                    }}
                    className={`pl-10 ${errors.reservation_date ? 'border-destructive' : ''}`}
                    required
                  />
                </div>
                {errors.reservation_date && (
                  <p className="text-sm text-destructive">{errors.reservation_date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_time">
                  {t('overview.time')} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Input
                    id="start_time"
                    name="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => {
                      setFormData({ ...formData, start_time: e.target.value })
                      setAvailability(null)
                    }}
                    className={`pl-10 ${errors.start_time ? 'border-destructive' : ''}`}
                    required
                  />
                </div>
                {errors.start_time && (
                  <p className="text-sm text-destructive">{errors.start_time}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="party_size">
                  {t('overview.partySize')} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Select
                    value={formData.party_size.toString()}
                    onValueChange={(value) => {
                      setFormData({ ...formData, party_size: parseInt(value) })
                      setAvailability(null)
                    }}
                  >
                    <SelectTrigger className="pl-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size} {size === 1 ? tb('booking.guest') : tb('booking.guests')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.party_size && (
                  <p className="text-sm text-destructive">{errors.party_size}</p>
                )}
              </div>
            </div>

            {/* Check Availability Button */}
            {formData.reservation_date && formData.start_time && formData.party_size && (
              <Button
                type="button"
                onClick={checkAvailability}
                disabled={checkingAvailability}
                variant="outline"
                className="w-full"
              >
                {checkingAvailability ? tb('booking.checkingAvailability') : tb('booking.checkAvailability')}
              </Button>
            )}

            {/* Availability Result */}
            {availability && (
              <Alert variant={availability.available ? 'default' : 'destructive'}>
                {availability.available ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>{tb('booking.available')}</AlertTitle>
                    <AlertDescription>
                      {tb('booking.tablesAvailable', { count: availability.available_tables ?? 0 })}
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{tb('booking.notAvailable')}</AlertTitle>
                    <AlertDescription>
                      {availability.reason}
                      {availability.suggested_times && availability.suggested_times.length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold">{tb('booking.alternativeTimes')}</p>
                          <ul className="list-disc list-inside">
                            {availability.suggested_times.map((time) => (
                              <li key={time}>{time}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}
          </div>

          {/* Special Requests */}
          <div className="space-y-2">
            <Label htmlFor="special_requests">{tb('booking.specialRequests')}</Label>
            <Textarea
              id="special_requests"
              name="special_requests"
              placeholder={tb('booking.specialRequestsPlaceholder')}
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* Language Preference */}
          <div className="space-y-2">
            <Label htmlFor="language">{tb('booking.preferredLanguage')}</Label>
            <Select
              value={formData.language}
              onValueChange={(value) =>
                setFormData({ ...formData, language: value as 'en' | 'nl' | 'es' | 'de' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('booking.languageEnglish')}</SelectItem>
                <SelectItem value="nl">{t('booking.languageNederlands')}</SelectItem>
                <SelectItem value="es">{t('booking.languageEspanol')}</SelectItem>
                <SelectItem value="de">{t('booking.languageDeutsch')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting || (availability !== null && !availability.available)}
            className="w-full"
            size="lg"
          >
            {submitting ? tb('booking.submitting') : tb('booking.reserveTableButton')}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {tb('booking.policyNote')}
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
