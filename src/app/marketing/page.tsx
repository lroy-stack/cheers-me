'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ContentFilters as Filters, ContentCalendarEntry } from '@/types/marketing'
import { CalendarView } from '@/components/marketing/calendar-view'
import { ContentFilters } from '@/components/marketing/content-filters'
import { useContentCalendar } from '@/hooks/use-content-calendar'
import { Megaphone, TrendingUp, Calendar, Zap, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

export default function MarketingPage() {
  const t = useTranslations('marketing')
  const [filters, setFilters] = useState<Filters>({})
  const router = useRouter()
  const { toast } = useToast()

  // Fetch content calendar entries with realtime updates
  const { entries, loading, error } = useContentCalendar()

  // Show error toast if fetch fails
  useEffect(() => {
    if (error) {
      toast({
        title: t('common.error'),
        description: error,
        variant: 'destructive',
      })
    }
  }, [error, toast])

  // Apply filters to entries
  const filteredEntries = useMemo(() => {
    let filtered = [...entries]

    if (filters.status) {
      filtered = filtered.filter((entry) => entry.status === filters.status)
    }

    if (filters.platform) {
      filtered = filtered.filter((entry) => entry.platform === filters.platform)
    }

    if (filters.language) {
      filtered = filtered.filter((entry) => entry.language === filters.language)
    }

    return filtered
  }, [entries, filters])

  // Calculate stats
  const stats = {
    total: entries.length,
    scheduled: entries.filter((e) => e.status === 'scheduled').length,
    published: entries.filter((e) => e.status === 'published').length,
    draft: entries.filter((e) => e.status === 'draft').length,
  }

  const handleCreatePost = (_date?: string) => {
    router.push('/marketing/create')
  }

  const handleEditEntry = (entry: ContentCalendarEntry) => {
    toast({
      title: t('common.editPost'),
      description: t('common.editingPost', { title: entry.title }),
    })
    // TODO: Open post editor dialog/sheet
  }

  const handleDeleteEntry = async (entry: ContentCalendarEntry) => {
    if (!confirm(t('common.confirmDelete', { title: entry.title }))) return

    try {
      const response = await fetch(`/api/marketing/content-calendar/${entry.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete entry')
      }

      toast({
        title: t('common.success'),
        description: t('common.postDeletedSuccess'),
      })
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast({
        title: t('common.error'),
        description: t('common.postDeleteFailed'),
        variant: 'destructive',
      })
    }
  }

  const handlePublishEntry = async (entry: ContentCalendarEntry) => {
    toast({
      title: t('common.publishPost'),
      description: t('common.publishingPost', { title: entry.title }),
    })
    // TODO: Implement publish functionality
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-indigo-500" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('contentCalendar.subtitle')}
          </p>
        </div>
        <Button onClick={() => handleCreatePost()} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('contentCalendar.addPost')}
        </Button>
      </div>

      {/* Stats KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('contentCalendar.totalPosts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {t('contentCalendar.scheduled')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.scheduled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {t('contentCalendar.published')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.published}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {t('contentCalendar.draft')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.draft}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <ContentFilters filters={filters} onFiltersChange={setFilters} />

      {/* Calendar View */}
      <CalendarView
        entries={filteredEntries}
        onEntryEdit={handleEditEntry}
        onEntryDelete={handleDeleteEntry}
        onEntryPublish={handlePublishEntry}
        onCreatePost={handleCreatePost}
        loading={loading}
      />
    </div>
  )
}
