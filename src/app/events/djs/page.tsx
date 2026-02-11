'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DJTable } from '@/components/events/dj-table'
import { DJFormDialog } from '@/components/events/dj-form-dialog'
import { DJDetailSheet } from '@/components/events/dj-detail-sheet'
import { DJKPICards } from '@/components/events/dj-kpi-cards'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Plus, RefreshCw, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { DJWithStats, DJFormData, DJKPIData } from '@/components/events/dj-types'
import { format } from 'date-fns'

export default function DJsPage() {
  const t = useTranslations('events')
  const [djs, setDJs] = useState<DJWithStats[]>([])
  const [kpiData, setKPIData] = useState<DJKPIData>({
    totalDJs: 0,
    activeDJs: 0,
    totalFees: 0,
    avgFeePerDJ: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedDJ, setSelectedDJ] = useState<DJWithStats | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Fetch all DJs with their stats
  const fetchDJs = async () => {
    setIsLoading(true)
    try {
      // Fetch all DJs
      const djResponse = await fetch('/api/events/djs')
      if (!djResponse.ok) throw new Error('Failed to fetch DJs')

      const djData = await djResponse.json()

      // For each DJ, fetch event stats
      const djsWithStats = await Promise.all(
        djData.map(async (dj: DJWithStats) => {
          try {
            // Fetch all events for this DJ
            const eventsResponse = await fetch(`/api/events?dj_id=${dj.id}`)
            const events = eventsResponse.ok ? await eventsResponse.json() : []

            const today = format(new Date(), 'yyyy-MM-dd')
            const upcomingEvents = events.filter(
              (e: { event_date: string; status: string }) => e.event_date >= today && e.status !== 'cancelled'
            )
            const completedEvents = events.filter((e: { status: string }) => e.status === 'completed')

            return {
              ...dj,
              total_events: events.length,
              upcoming_events: upcomingEvents.length,
              completed_events: completedEvents.length,
              total_earnings: completedEvents.length * dj.fee,
              last_event_date: events.length > 0 ? events[0].event_date : null,
            }
          } catch (error) {
            console.error(`Error fetching stats for DJ ${dj.id}:`, error)
            return {
              ...dj,
              total_events: 0,
              upcoming_events: 0,
              completed_events: 0,
              total_earnings: 0,
              last_event_date: null,
            }
          }
        })
      )

      setDJs(djsWithStats)

      // Calculate KPIs
      const thisMonth = format(new Date(), 'yyyy-MM')
      const activeDJs = djsWithStats.filter(
        (dj) =>
          dj.last_event_date &&
          dj.last_event_date.startsWith(thisMonth)
      ).length

      const totalFees = djsWithStats.reduce((sum, dj) => sum + dj.fee, 0)
      const avgFee = djsWithStats.length > 0 ? totalFees / djsWithStats.length : 0

      setKPIData({
        totalDJs: djsWithStats.length,
        activeDJs,
        totalFees,
        avgFeePerDJ: avgFee,
      })
    } catch (error) {
      console.error('Error fetching DJs:', error)
      toast({
        title: t('toast.error'),
        description: t('toast.failedLoadDjs'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDJs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set up realtime subscription for DJs
  useEffect(() => {
    const channel = supabase
      .channel('djs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'djs',
        },
        () => {
          fetchDJs()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateDJ = async (data: DJFormData) => {
    try {
      const response = await fetch('/api/events/djs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create DJ')
      }

      toast({
        title: t('toast.success'),
        description: t('toast.djAdded'),
      })
      fetchDJs()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.djAdded')
      toast({
        title: t('toast.error'),
        description: errorMessage,
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleEditDJ = async (data: DJFormData) => {
    if (!selectedDJ) return

    try {
      const response = await fetch(`/api/events/djs/${selectedDJ.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update DJ')
      }

      toast({
        title: t('toast.success'),
        description: t('toast.djUpdated'),
      })
      fetchDJs()
      setSelectedDJ(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.djUpdated')
      toast({
        title: t('toast.error'),
        description: errorMessage,
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleDeleteDJ = async (id: string) => {
    try {
      const response = await fetch(`/api/events/djs/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete DJ')
      }

      toast({
        title: t('toast.success'),
        description: t('toast.djDeleted'),
      })
      fetchDJs()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.djDeleted')
      toast({
        title: t('toast.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleViewDJ = (dj: DJWithStats) => {
    setSelectedDJ(dj)
    setIsDetailSheetOpen(true)
  }

  const handleEditClick = (dj: DJWithStats) => {
    setSelectedDJ(dj)
    setIsEditDialogOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/events">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">{t('djs.title')}</h1>
          </div>
          <p className="text-muted-foreground">
            {t('djs.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchDJs}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('djs.addDj')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <DJKPICards data={kpiData} isLoading={isLoading} />

      {/* DJ Table */}
      <Card className="p-6">
        <DJTable
          djs={djs}
          onEdit={handleEditClick}
          onDelete={handleDeleteDJ}
          onView={handleViewDJ}
          isLoading={isLoading}
        />
      </Card>

      {/* Create DJ Dialog */}
      <DJFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateDJ}
        mode="create"
      />

      {/* Edit DJ Dialog */}
      {selectedDJ && (
        <DJFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSubmit={handleEditDJ}
          mode="edit"
          defaultValues={{
            name: selectedDJ.name,
            genre: selectedDJ.genre || '',
            fee: selectedDJ.fee,
            email: selectedDJ.email || '',
            phone: selectedDJ.phone || '',
            social_links: selectedDJ.social_links || undefined,
            rider_notes: selectedDJ.rider_notes || '',
          }}
        />
      )}

      {/* DJ Detail Sheet */}
      <DJDetailSheet
        dj={selectedDJ}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        onEdit={handleEditClick}
        onDelete={handleDeleteDJ}
      />
    </div>
  )
}
