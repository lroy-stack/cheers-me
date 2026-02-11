'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WaitlistKPICards } from '@/components/reservations/waitlist-kpi-cards'
import { WaitlistEntryCard } from '@/components/reservations/waitlist-entry-card'
import { WaitlistFormDialog, WaitlistFormValues } from '@/components/reservations/waitlist-form-dialog'
import { WaitlistSeatDialog } from '@/components/reservations/waitlist-seat-dialog'
import { WaitlistEmptyState } from '@/components/reservations/waitlist-empty-state'
import { Plus, RefreshCw, AlertCircle, Bell, Check } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
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
    id: string
    table_number: string
    capacity: number
  }
}

interface Table {
  id: string
  table_number: string
  capacity: number
  status: string
  section?: string
}

interface KPIData {
  total_waiting: number
  total_notified: number
  total_seated_today: number
  average_wait_minutes: number | null
}

export default function WaitlistPage() {
  const t = useTranslations('reservations')
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [kpiData, setKpiData] = useState<KPIData>({
    total_waiting: 0,
    total_notified: 0,
    total_seated_today: 0,
    average_wait_minutes: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSeatDialogOpen, setIsSeatDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null)
  const [activeTab, setActiveTab] = useState('waiting')

  const supabase = createClient()

  // Fetch waitlist entries
  const fetchWaitlist = async () => {
    try {
      const { data, error } = await supabase
        .from('waitlist_entries')
        .select(`
          *,
          tables (
            id,
            table_number,
            capacity
          )
        `)
        .order('position', { ascending: true })

      if (error) throw error

      setWaitlist(data || [])
      calculateKPIs(data || [])
    } catch (error) {
      console.error('Error fetching waitlist:', error)
      toast({
        title: 'Error',
        description: 'Failed to load waitlist',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch available tables
  const fetchTables = async () => {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('id, table_number, capacity, status, floor_sections(name)')
        .order('table_number', { ascending: true })

      if (error) throw error

      const formattedTables = (data || []).map((table: any) => ({
        id: table.id,
        table_number: table.table_number,
        capacity: table.capacity,
        status: table.status,
        section: table.floor_sections?.name,
      }))

      setTables(formattedTables)
    } catch (error) {
      console.error('Error fetching tables:', error)
    }
  }

  // Calculate KPIs from waitlist data
  const calculateKPIs = (entries: WaitlistEntry[]) => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const todayEntries = entries.filter(
      (e) => new Date(e.created_at) >= startOfDay
    )

    const waiting = entries.filter((e) => e.waitlist_status === 'waiting').length
    const notified = entries.filter((e) => e.waitlist_status === 'notified').length
    const seated = todayEntries.filter((e) => e.waitlist_status === 'seated')

    // Calculate average wait time for seated guests today
    let avgWait = null
    if (seated.length > 0) {
      const totalWait = seated.reduce((sum, entry) => {
        const waitMs =
          new Date(entry.seated_at!).getTime() -
          new Date(entry.created_at).getTime()
        return sum + waitMs / 1000 / 60 // Convert to minutes
      }, 0)
      avgWait = totalWait / seated.length
    }

    setKpiData({
      total_waiting: waiting,
      total_notified: notified,
      total_seated_today: seated.length,
      average_wait_minutes: avgWait,
    })
  }

  // Add new waitlist entry
  const handleAddToWaitlist = async (data: WaitlistFormValues) => {
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to add to waitlist')

      toast({
        title: 'Success',
        description: `${data.guest_name} added to waitlist`,
      })

      fetchWaitlist()
    } catch (error) {
      console.error('Error adding to waitlist:', error)
      toast({
        title: 'Error',
        description: 'Failed to add guest to waitlist',
        variant: 'destructive',
      })
      throw error
    }
  }

  // Notify guest (update status to notified)
  const handleNotify = async (id: string) => {
    try {
      const response = await fetch(`/api/waitlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waitlist_status: 'notified' }),
      })

      if (!response.ok) throw new Error('Failed to notify guest')

      toast({
        title: 'Guest Notified',
        description: 'Guest has been notified their table is ready',
      })

      fetchWaitlist()
    } catch (error) {
      console.error('Error notifying guest:', error)
      toast({
        title: 'Error',
        description: 'Failed to notify guest',
        variant: 'destructive',
      })
    }
  }

  // Seat guest (open table selection dialog)
  const handleSeatClick = (entry: WaitlistEntry) => {
    setSelectedEntry(entry)
    setIsSeatDialogOpen(true)
  }

  // Confirm seating with table assignment
  const handleConfirmSeat = async (tableId: string) => {
    if (!selectedEntry) return

    try {
      const response = await fetch(`/api/waitlist/${selectedEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waitlist_status: 'seated',
          table_id: tableId,
        }),
      })

      if (!response.ok) throw new Error('Failed to seat guest')

      // Update table status to occupied
      await fetch(`/api/tables/${tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'occupied' }),
      })

      toast({
        title: 'Guest Seated',
        description: `${selectedEntry.guest_name} has been seated`,
      })

      fetchWaitlist()
      fetchTables()
    } catch (error) {
      console.error('Error seating guest:', error)
      toast({
        title: 'Error',
        description: 'Failed to seat guest',
        variant: 'destructive',
      })
      throw error
    }
  }

  // Cancel waitlist entry
  const handleCancel = async (id: string) => {
    try {
      const response = await fetch(`/api/waitlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waitlist_status: 'cancelled' }),
      })

      if (!response.ok) throw new Error('Failed to cancel')

      toast({
        title: 'Entry Cancelled',
        description: 'Waitlist entry has been cancelled',
      })

      fetchWaitlist()
    } catch (error) {
      console.error('Error cancelling entry:', error)
      toast({
        title: 'Error',
        description: 'Failed to cancel entry',
        variant: 'destructive',
      })
    }
  }

  // Remove from waitlist
  const handleRemove = async (id: string) => {
    try {
      const response = await fetch(`/api/waitlist/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to remove')

      toast({
        title: 'Removed',
        description: 'Entry removed from waitlist',
      })

      fetchWaitlist()
    } catch (error) {
      console.error('Error removing entry:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove entry',
        variant: 'destructive',
      })
    }
  }

  // Set up real-time subscription
  useEffect(() => {
    fetchWaitlist()
    fetchTables()

    const channel = supabase
      .channel('waitlist_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waitlist_entries' },
        () => {
          fetchWaitlist()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => {
          fetchTables()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filter entries by status
  const filterByStatus = (status?: WaitlistStatus) => {
    if (!status) return waitlist
    return waitlist.filter((e) => e.waitlist_status === status)
  }

  const waitingEntries = filterByStatus('waiting')
  const notifiedEntries = filterByStatus('notified')
  const completedEntries = waitlist.filter((e) =>
    ['seated', 'cancelled', 'expired'].includes(e.waitlist_status)
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('waitlist.title')}</h1>
          <p className="text-muted-foreground">
            {t('waitlist.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchWaitlist}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('waitlist.addToWaitlist')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <WaitlistKPICards data={kpiData} isLoading={isLoading} />

      {/* Alert for no available tables */}
      {tables.filter((t) => t.status === 'available').length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Available Tables</AlertTitle>
          <AlertDescription>
            All tables are currently occupied. Guests added to the waitlist will need
            to wait until a table becomes available.
          </AlertDescription>
        </Alert>
      )}

      {/* Waitlist Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="waiting">
            Waiting ({waitingEntries.length})
          </TabsTrigger>
          <TabsTrigger value="notified">
            Notified ({notifiedEntries.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedEntries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="waiting" className="space-y-4 mt-4">
          {waitingEntries.length === 0 ? (
            <WaitlistEmptyState onAddGuest={() => setIsFormOpen(true)} />
          ) : (
            waitingEntries.map((entry) => (
              <WaitlistEntryCard
                key={entry.id}
                entry={entry}
                onNotify={handleNotify}
                onSeat={() => handleSeatClick(entry)}
                onCancel={handleCancel}
                onRemove={handleRemove}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="notified" className="space-y-4 mt-4">
          {notifiedEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="mx-auto h-12 w-12 mb-4 opacity-20" />
              <p>No guests have been notified</p>
            </div>
          ) : (
            notifiedEntries.map((entry) => (
              <WaitlistEntryCard
                key={entry.id}
                entry={entry}
                onSeat={() => handleSeatClick(entry)}
                onCancel={handleCancel}
                onRemove={handleRemove}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Check className="mx-auto h-12 w-12 mb-4 opacity-20" />
              <p>No completed entries today</p>
            </div>
          ) : (
            completedEntries.map((entry) => (
              <WaitlistEntryCard
                key={entry.id}
                entry={entry}
                onRemove={handleRemove}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <WaitlistFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleAddToWaitlist}
      />

      {selectedEntry && (
        <WaitlistSeatDialog
          open={isSeatDialogOpen}
          onOpenChange={setIsSeatDialogOpen}
          onSubmit={handleConfirmSeat}
          tables={tables}
          partySize={selectedEntry.party_size}
          guestName={selectedEntry.guest_name}
        />
      )}
    </div>
  )
}
