'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EventCalendar } from '@/components/events/event-calendar'
import { EventFormDialog } from '@/components/events/event-form-dialog'
import { EventDetailSheet } from '@/components/events/event-detail-sheet'
import { EventKPICards } from '@/components/events/event-kpi-cards'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Plus, RefreshCw, Users, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Event, DJ, EventFormData } from '@/components/events/types'

interface KPIData {
  totalEvents: number
  confirmedCount: number
  pendingCount: number
  todayCount: number
}

export default function EventsPage() {
  const t = useTranslations('events')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'list'>('month')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Compute date range based on view
  const startDate = calendarView === 'list'
    ? format(new Date(), 'yyyy-MM-dd')
    : format(startOfMonth(selectedDate), 'yyyy-MM-dd')
  const endDate = calendarView === 'list'
    ? format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    : format(endOfMonth(selectedDate), 'yyyy-MM-dd')

  // SWR for events
  const {
    data: events = [],
    isLoading,
    mutate: mutateEvents,
  } = useSWR<Event[]>(`/api/events?start_date=${startDate}&end_date=${endDate}`)

  // SWR for DJs (rarely changes)
  const { data: djs = [] } = useSWR<DJ[]>('/api/events/djs', {
    dedupingInterval: 60000,
  })

  // Calculate KPIs from events data
  const today = format(new Date(), 'yyyy-MM-dd')
  const kpiData: KPIData = useMemo(() => ({
    totalEvents: events.length,
    confirmedCount: events.filter(e => e.status === 'confirmed').length,
    pendingCount: events.filter(e => e.status === 'pending').length,
    todayCount: events.filter(e => e.event_date === today).length,
  }), [events, today])

  const fetchEvents = () => mutateEvents()

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          mutateEvents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  const handleCreateEvent = async (data: EventFormData) => {
    try {
      const payload = {
        ...data,
        event_date: format(data.event_date, 'yyyy-MM-dd'),
        dj_id: data.dj_id || null,
        end_time: data.end_time || null,
        // Sports fields
        sport_name: data.sport_name || null,
        home_team: data.home_team || null,
        away_team: data.away_team || null,
        broadcast_channel: data.broadcast_channel || null,
        match_info: data.match_info || null,
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create event')
      }

      toast({
        title: t('toast.success'),
        description: t('toast.eventCreated'),
      })
      fetchEvents()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.failedLoadEvents')
      toast({
        title: t('toast.error'),
        description: errorMessage,
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleEditEvent = async (data: EventFormData) => {
    if (!selectedEvent) return

    try {
      const payload = {
        ...data,
        event_date: format(data.event_date, 'yyyy-MM-dd'),
        dj_id: data.dj_id || null,
        end_time: data.end_time || null,
        // Sports fields
        sport_name: data.sport_name || null,
        home_team: data.home_team || null,
        away_team: data.away_team || null,
        broadcast_channel: data.broadcast_channel || null,
        match_info: data.match_info || null,
      }

      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update event')
      }

      toast({
        title: t('toast.success'),
        description: t('toast.eventUpdated'),
      })
      fetchEvents()
      setSelectedEvent(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.eventUpdated')
      toast({
        title: t('toast.error'),
        description: errorMessage,
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleDeleteEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      toast({
        title: t('toast.success'),
        description: t('toast.eventDeleted'),
      })
      fetchEvents()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.eventDeleted')
      toast({
        title: t('toast.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setIsDetailSheetOpen(true)
  }

  const handleEditClick = (event: Event) => {
    setSelectedEvent(event)
    setIsEditDialogOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('calendar.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/events/sports">
            <Button variant="outline" size="sm" className="h-9">
              <Trophy className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('sports.title')}</span>
            </Button>
          </Link>
          <Link href="/events/djs">
            <Button variant="outline" size="sm" className="h-9">
              <Users className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('djs.title')}</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={fetchEvents}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          <Button size="sm" className="h-9" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('calendar.addEvent')}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <EventKPICards data={kpiData} isLoading={isLoading} />

      {/* Calendar */}
      <Card className="p-6">
        <EventCalendar
          events={events}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onEventClick={handleEventClick}
          view={calendarView}
          onViewChange={setCalendarView}
        />
      </Card>

      {/* Create Event Dialog */}
      <EventFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateEvent}
        djs={djs}
        mode="create"
        defaultValues={{
          event_date: selectedDate,
          start_time: '22:00',
          event_type: 'dj_night',
        }}
      />

      {/* Edit Event Dialog */}
      {selectedEvent && (
        <EventFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSubmit={handleEditEvent}
          djs={djs}
          mode="edit"
          defaultValues={{
            title: selectedEvent.title,
            description: selectedEvent.description || '',
            event_date: new Date(selectedEvent.event_date),
            start_time: selectedEvent.start_time.substring(0, 5),
            end_time: selectedEvent.end_time?.substring(0, 5) || '',
            event_type: selectedEvent.event_type,
            dj_id: selectedEvent.dj_id || '',
            status: selectedEvent.status,
            sport_name: selectedEvent.sport_name || '',
            home_team: selectedEvent.home_team || '',
            away_team: selectedEvent.away_team || '',
            broadcast_channel: selectedEvent.broadcast_channel || '',
            match_info: selectedEvent.match_info || '',
          }}
        />
      )}

      {/* Event Detail Sheet */}
      <EventDetailSheet
        event={selectedEvent}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        onEdit={handleEditClick}
        onDelete={handleDeleteEvent}
      />
    </div>
  )
}
