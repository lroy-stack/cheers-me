'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReservationKPICards } from '@/components/reservations/reservation-kpi-cards'
import { ReservationList } from '@/components/reservations/reservation-list'
import { ReservationFormDialog } from '@/components/reservations/reservation-form-dialog'
import { ReservationDetailSheet } from '@/components/reservations/reservation-detail-sheet'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Plus, CalendarIcon, RefreshCw, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
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

interface KPIData {
  totalReservations: number
  totalCovers: number
  confirmedCount: number
  pendingCount: number
  seatedCount: number
  completedCount: number
  noShowCount: number
  occupancyRate?: number
}

export default function ReservationsPage() {
  const t = useTranslations('reservations')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // SWR for selected date's reservations (used in "Day View" tab and KPIs)
  const {
    data: dayReservations = [],
    isLoading: isDayLoading,
    mutate: mutateDayReservations,
  } = useSWR<Reservation[]>(`/api/reservations?date=${dateStr}`)

  // SWR for ALL upcoming reservations (pending + confirmed from today onward)
  const {
    data: upcomingReservations = [],
    isLoading: isUpcomingLoading,
    mutate: mutateUpcoming,
  } = useSWR<Reservation[]>(`/api/reservations?from_date=${todayStr}&limit=200`)

  // SWR for tables (rarely changes, long dedup)
  const { data: tables = [] } = useSWR<Table[]>(
    '/api/reservations/tables',
    async () => {
      const { data, error } = await supabase
        .from('tables')
        .select(`
          id, table_number, capacity, section_id,
          floor_sections ( id, name )
        `)
        .eq('is_active', true)
        .order('table_number')
      if (error) throw error
      return (data || []) as unknown as Table[]
    },
    { dedupingInterval: 60000 }
  )

  // Derived lists from upcoming data
  const pendingConfirmedReservations = upcomingReservations.filter((r) =>
    ['pending', 'confirmed'].includes(r.reservation_status)
  )
  const activeReservations = upcomingReservations.filter(
    (r) => r.reservation_status === 'seated'
  )
  const pastReservations = upcomingReservations.filter((r) =>
    ['completed', 'cancelled', 'no_show'].includes(r.reservation_status)
  )

  // Calculate KPIs from day view data
  const kpiData: KPIData = {
    totalReservations: dayReservations.length,
    totalCovers: dayReservations.reduce((sum, r) => sum + r.party_size, 0),
    confirmedCount: dayReservations.filter(r => r.reservation_status === 'confirmed').length,
    pendingCount: dayReservations.filter(r => r.reservation_status === 'pending').length,
    seatedCount: dayReservations.filter(r => r.reservation_status === 'seated').length,
    completedCount: dayReservations.filter(r => r.reservation_status === 'completed').length,
    noShowCount: dayReservations.filter(r => r.reservation_status === 'no_show').length,
  }

  // Refresh both SWR caches
  const refreshAll = useCallback(() => {
    mutateDayReservations()
    mutateUpcoming()
  }, [mutateDayReservations, mutateUpcoming])

  // Sync selectedReservation when data changes (so detail sheet reflects updates)
  useEffect(() => {
    if (selectedReservation) {
      const allReservations = [...dayReservations, ...upcomingReservations]
      const updated = allReservations.find(r => r.id === selectedReservation.id)
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedReservation)) {
        setSelectedReservation(updated)
      }
    }
  }, [dayReservations, upcomingReservations, selectedReservation])

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('reservations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
        },
        () => {
          refreshAll()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateReservation = async (data: {
    reservation_date: Date
    [key: string]: unknown
  }) => {
    try {
      const payload = {
        ...data,
        reservation_date: format(data.reservation_date, 'yyyy-MM-dd'),
      }

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create reservation')
      }

      toast({
        title: t('overview.confirm'),
        description: t('overview.addReservation'),
      })
      refreshAll()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create reservation'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleEditReservation = async (data: {
    reservation_date: Date
    [key: string]: unknown
  }) => {
    if (!selectedReservation) return

    try {
      const payload = {
        ...data,
        reservation_date: format(data.reservation_date, 'yyyy-MM-dd'),
      }

      const response = await fetch(`/api/reservations/${selectedReservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update reservation')
      }

      toast({
        title: t('overview.confirm'),
        description: t('overview.editReservation'),
      })
      refreshAll()
      setSelectedReservation(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update reservation'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleDeleteReservation = async (id: string) => {
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete reservation')
      }

      toast({
        title: t('overview.confirm'),
        description: t('overview.delete'),
      })
      refreshAll()
      setSelectedReservation(null)
      setIsDetailSheetOpen(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete reservation'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleStatusChange = async (id: string, status: ReservationStatus) => {
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_status: status }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // Update selectedReservation immediately for responsive UI
      if (selectedReservation?.id === id) {
        const updated = await response.json()
        setSelectedReservation(prev => prev ? { ...prev, ...updated } : null)
      }

      toast({
        title: t('overview.confirm'),
        description: `${t('overview.status')}: ${t(`overview.${status === 'no_show' ? 'noShow' : status}`)}`,
      })
      refreshAll()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update status'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleAddToCRM = async (reservation: Reservation) => {
    try {
      const payload: Record<string, string> = {
        name: reservation.guest_name,
      }
      if (reservation.guest_email) payload.email = reservation.guest_email
      if (reservation.guest_phone) payload.phone = reservation.guest_phone

      const response = await fetch('/api/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let customerId: string | null = null

      if (response.status === 409) {
        const data = await response.json()
        customerId = data.existing?.id
      } else if (response.status === 201) {
        const data = await response.json()
        customerId = data.id
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create customer')
      }

      if (customerId) {
        const linkResponse = await fetch(`/api/reservations/${reservation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_id: customerId }),
        })

        if (linkResponse.ok) {
          const updatedReservation = await linkResponse.json()
          // Immediately update selectedReservation so UI reflects the change
          setSelectedReservation(prev => prev ? { ...prev, customer_id: customerId, customers: updatedReservation.customers } : null)
        }

        toast({
          title: t('overview.confirm'),
          description: t('detail.addToCRM'),
        })
        refreshAll()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add to CRM'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleSendConfirmationEmail = async (reservation: Reservation) => {
    try {
      const response = await fetch(`/api/reservations/${reservation.id}/send-confirmation`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send confirmation email')
      }

      toast({
        title: t('overview.confirm'),
        description: t('detail.sendConfirmation'),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send email'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleViewDetails = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setIsDetailSheetOpen(true)
  }

  const handleEdit = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setIsEditDialogOpen(true)
  }

  const isLoading = isDayLoading || isUpcomingLoading

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('overview.title')}</h1>
          <p className="text-muted-foreground">
            {t('overview.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/reservations/floorplan">
            <Button variant="outline">
              <LayoutGrid className="mr-2 h-4 w-4" />
              {t('floorplan.title')}
            </Button>
          </Link>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            onClick={refreshAll}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('overview.addReservation')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <ReservationKPICards data={kpiData} isLoading={isDayLoading} />

      {/* Reservations List with Tabs */}
      <Card className="p-6">
        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">
              {t('overview.tabUpcoming')} ({pendingConfirmedReservations.length})
            </TabsTrigger>
            <TabsTrigger value="day">
              {t('overview.tabDay')} ({dayReservations.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              {t('overview.tabActive')} ({activeReservations.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              {t('overview.tabPast')} ({pastReservations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            <ReservationList
              reservations={pendingConfirmedReservations}
              onEdit={handleEdit}
              onDelete={handleDeleteReservation}
              onStatusChange={handleStatusChange}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>

          <TabsContent value="day" className="space-y-4">
            <ReservationList
              reservations={dayReservations}
              onEdit={handleEdit}
              onDelete={handleDeleteReservation}
              onStatusChange={handleStatusChange}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <ReservationList
              reservations={activeReservations}
              onEdit={handleEdit}
              onDelete={handleDeleteReservation}
              onStatusChange={handleStatusChange}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            <ReservationList
              reservations={pastReservations}
              onEdit={handleEdit}
              onDelete={handleDeleteReservation}
              onStatusChange={handleStatusChange}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Create Reservation Dialog */}
      <ReservationFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateReservation}
        tables={tables}
        mode="create"
        defaultValues={{
          reservation_date: selectedDate,
          start_time: '19:00',
        }}
      />

      {/* Edit Reservation Dialog */}
      {selectedReservation && (
        <ReservationFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSubmit={handleEditReservation}
          tables={tables}
          mode="edit"
          defaultValues={{
            guest_name: selectedReservation.guest_name,
            guest_email: selectedReservation.guest_email || '',
            guest_phone: selectedReservation.guest_phone,
            party_size: selectedReservation.party_size,
            reservation_date: new Date(selectedReservation.reservation_date),
            start_time: selectedReservation.start_time.substring(0, 5),
            table_id: selectedReservation.table_id || undefined,
            source: selectedReservation.source,
            estimated_duration_minutes: selectedReservation.estimated_duration_minutes,
            special_requests: selectedReservation.special_requests || '',
            internal_notes: selectedReservation.internal_notes || '',
            deposit_required: selectedReservation.deposit_required,
            deposit_amount: selectedReservation.deposit_amount || undefined,
          }}
        />
      )}

      {/* Reservation Detail Sheet */}
      <ReservationDetailSheet
        reservation={selectedReservation}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        onEdit={handleEdit}
        onDelete={handleDeleteReservation}
        onStatusChange={handleStatusChange}
        onAddToCRM={handleAddToCRM}
        onSendConfirmationEmail={handleSendConfirmationEmail}
      />
    </div>
  )
}
