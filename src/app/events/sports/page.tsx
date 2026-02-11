'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SportsEventCard } from '@/components/events/sports-event-card'
import { SportsEventForm, SportsEventFormData } from '@/components/events/sports-event-form'
import { EventDetailSheet } from '@/components/events/event-detail-sheet'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Plus, RefreshCw, Calendar as CalendarIcon, List, Trophy, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Event, EventFormData } from '@/components/events/types'

interface SportsKPIData {
  upcomingCount: number
  todayCount: number
  thisWeekCount: number
  thisMonthCount: number
  mostPopularSport: string
}

export default function SportsEventsPage() {
  const t = useTranslations('events')
  const [view, setView] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [events, setEvents] = useState<Event[]>([])
  const [kpiData, setKPIData] = useState<SportsKPIData>({
    upcomingCount: 0,
    todayCount: 0,
    thisWeekCount: 0,
    thisMonthCount: 0,
    mostPopularSport: '-',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Fetch sports events
  const fetchSportsEvents = async () => {
    setIsLoading(true)
    try {
      // Get date range (3 months back to 3 months forward)
      const startDate = format(addMonths(new Date(), -3), 'yyyy-MM-dd')
      const endDate = format(addMonths(new Date(), 3), 'yyyy-MM-dd')

      const response = await fetch(
        `/api/events?start_date=${startDate}&end_date=${endDate}&event_type=sports`
      )
      if (!response.ok) throw new Error('Failed to fetch sports events')

      const data = await response.json()
      setEvents(data)

      // Calculate KPIs
      const today = format(new Date(), 'yyyy-MM-dd')
      const todayEvents = data.filter((e: Event) => e.event_date === today)

      const weekFromNow = new Date()
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      const weekEvents = data.filter((e: Event) => {
        const eventDate = new Date(e.event_date)
        return eventDate >= new Date() && eventDate <= weekFromNow
      })

      const monthStart = startOfMonth(new Date())
      const monthEnd = endOfMonth(new Date())
      const monthEvents = data.filter((e: Event) => {
        const eventDate = new Date(e.event_date)
        return eventDate >= monthStart && eventDate <= monthEnd
      })

      const upcomingEvents = data.filter((e: Event) => new Date(e.event_date) >= new Date(new Date().setHours(0, 0, 0, 0)))

      // Find most popular sport
      const sportCounts: Record<string, number> = {}
      data.forEach((e: Event) => {
        if (e.sport_name) {
          sportCounts[e.sport_name] = (sportCounts[e.sport_name] || 0) + 1
        }
      })
      const mostPopular = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0]

      setKPIData({
        upcomingCount: upcomingEvents.length,
        todayCount: todayEvents.length,
        thisWeekCount: weekEvents.length,
        thisMonthCount: monthEvents.length,
        mostPopularSport: mostPopular ? mostPopular[0] : '-',
      })
    } catch (error) {
      console.error('Error fetching sports events:', error)
      toast({
        title: t('toast.error'),
        description: t('toast.failedLoadSports'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSportsEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('sports_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: 'event_type=eq.sports',
        },
        () => {
          fetchSportsEvents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Convert SportsEventFormData to EventFormData for API
  const convertToEventFormData = (data: SportsEventFormData): EventFormData => {
    return {
      title: `${data.home_team} vs ${data.away_team}`,
      description: data.description || '',
      event_date: data.event_date,
      start_time: data.start_time,
      end_time: data.end_time || '',
      event_type: 'sports',
      status: data.status || 'confirmed',
      sport_name: data.sport_name,
      home_team: data.home_team,
      away_team: data.away_team,
      broadcast_channel: data.broadcast_channel,
      match_info: data.match_info || '',
    }
  }

  const handleCreateEvent = async (data: SportsEventFormData) => {
    try {
      const eventData = convertToEventFormData(data)
      const payload = {
        ...eventData,
        event_date: format(eventData.event_date, 'yyyy-MM-dd'),
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create sports event')
      }

      toast({
        title: t('toast.success'),
        description: t('toast.sportsCreated'),
      })
      fetchSportsEvents()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.sportsCreated')
      toast({
        title: t('toast.error'),
        description: errorMessage,
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleEditEvent = async (data: SportsEventFormData) => {
    if (!selectedEvent) return

    try {
      const eventData = convertToEventFormData(data)
      const payload = {
        ...eventData,
        event_date: format(eventData.event_date, 'yyyy-MM-dd'),
      }

      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update sports event')
      }

      toast({
        title: t('toast.success'),
        description: t('toast.sportsUpdated'),
      })
      fetchSportsEvents()
      setSelectedEvent(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.sportsUpdated')
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
        throw new Error('Failed to delete sports event')
      }

      toast({
        title: t('toast.success'),
        description: t('toast.sportsDeleted'),
      })
      fetchSportsEvents()
      setIsDetailSheetOpen(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.sportsDeleted')
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
    setIsDetailSheetOpen(false)
  }

  // Filter events based on view
  const filteredEvents = events.filter((event) => {
    const eventDate = new Date(event.event_date)
    const today = new Date(new Date().setHours(0, 0, 0, 0))

    if (view === 'upcoming') {
      return eventDate >= today
    } else if (view === 'past') {
      return eventDate < today
    }
    return true // 'all'
  }).sort((a, b) => {
    // Sort upcoming events ascending, past events descending
    if (view === 'past') {
      return new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
    }
    return new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/events">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t('sports.backToEvents')}
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-cyan-500" />
            {t('sports.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('sports.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchSportsEvents}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('sports.addEvent')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:pt-6 sm:px-6">
            <div className="text-2xl font-bold text-cyan-500">{kpiData.todayCount}</div>
            <p className="text-xs text-muted-foreground truncate">{t('calendar.today')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6 sm:px-6">
            <div className="text-2xl font-bold">{kpiData.thisWeekCount}</div>
            <p className="text-xs text-muted-foreground truncate">{t('sports.thisWeek')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6 sm:px-6">
            <div className="text-2xl font-bold">{kpiData.thisMonthCount}</div>
            <p className="text-xs text-muted-foreground truncate">{t('sports.thisMonth')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6 sm:px-6">
            <div className="text-2xl font-bold">{kpiData.upcomingCount}</div>
            <p className="text-xs text-muted-foreground truncate">{t('calendar.upcoming')}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4 sm:pt-6 sm:px-6">
            <div className="text-base font-bold truncate">{kpiData.mostPopularSport}</div>
            <p className="text-xs text-muted-foreground truncate">{t('sports.mostPopular')}</p>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="upcoming">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {t('calendar.upcoming')}
          </TabsTrigger>
          <TabsTrigger value="past">
            <List className="h-4 w-4 mr-2" />
            {t('calendar.past')}
          </TabsTrigger>
          <TabsTrigger value="all">{t('sports.allEvents')}</TabsTrigger>
        </TabsList>

        <TabsContent value={view} className="mt-6">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                {t('sports.loadingEvents')}
              </CardContent>
            </Card>
          ) : filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('sports.noEvents')}</h3>
                <p className="text-muted-foreground mb-4">
                  {view === 'upcoming'
                    ? t('sports.getStarted')
                    : t('sports.noEventsCategory')}
                </p>
                {view === 'upcoming' && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('sports.addEvent')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map((event) => (
                <SportsEventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleEventClick(event)}
                  onEdit={() => handleEditClick(event)}
                  onDelete={() => handleDeleteEvent(event.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Sports Event Dialog */}
      <SportsEventForm
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateEvent}
        mode="create"
        defaultValues={{
          event_date: new Date(),
          start_time: '20:00',
        }}
      />

      {/* Edit Sports Event Dialog */}
      {selectedEvent && (
        <SportsEventForm
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSubmit={handleEditEvent}
          mode="edit"
          defaultValues={{
            sport_name: selectedEvent.sport_name || '',
            home_team: selectedEvent.home_team || '',
            away_team: selectedEvent.away_team || '',
            event_date: new Date(selectedEvent.event_date),
            start_time: selectedEvent.start_time.substring(0, 5),
            end_time: selectedEvent.end_time?.substring(0, 5) || '',
            broadcast_channel: selectedEvent.broadcast_channel || '',
            match_info: selectedEvent.match_info || '',
            description: selectedEvent.description || '',
            status: selectedEvent.status,
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
