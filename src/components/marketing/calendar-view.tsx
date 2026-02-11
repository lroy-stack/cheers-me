'use client'

import { useState, useMemo } from 'react'
import { ContentCalendarEntry } from '@/types/marketing'
import { ContentCalendarCard } from './content-calendar-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  List,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  startOfDay,
  parseISO,
} from 'date-fns'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface CalendarViewProps {
  entries: ContentCalendarEntry[]
  onEntryEdit?: (entry: ContentCalendarEntry) => void
  onEntryDelete?: (entry: ContentCalendarEntry) => void
  onEntryPublish?: (entry: ContentCalendarEntry) => void
  onCreatePost?: (date?: string) => void
  loading?: boolean
}

export function CalendarView({
  entries,
  onEntryEdit,
  onEntryDelete,
  onEntryPublish,
  onCreatePost,
  loading,
}: CalendarViewProps) {
  const t = useTranslations('marketing')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [view, setView] = useState<'month' | 'list'>('month')

  // Generate calendar days (including padding days from prev/next month)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days: Date[] = []
    let currentDate = startDate

    while (currentDate <= endDate) {
      days.push(currentDate)
      currentDate = addDays(currentDate, 1)
    }

    return days
  }, [currentMonth])

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, ContentCalendarEntry[]> = {}

    entries.forEach((entry) => {
      if (!entry.scheduled_date) return

      const dateKey = format(startOfDay(parseISO(entry.scheduled_date)), 'yyyy-MM-dd')
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(entry)
    })

    // Sort entries within each date by scheduled time
    Object.keys(grouped).forEach((dateKey) => {
      grouped[dateKey].sort((a, b) => {
        const timeA = a.scheduled_date || ''
        const timeB = b.scheduled_date || ''
        return timeA.localeCompare(timeB)
      })
    })

    return grouped
  }, [entries])

  // Get entries for a specific date
  const getEntriesForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return entriesByDate[dateKey] || []
  }

  // List view: all entries sorted by scheduled date
  const sortedEntries = useMemo(() => {
    return [...entries]
      .filter((e) => e.scheduled_date)
      .sort((a, b) => {
        const dateA = a.scheduled_date || ''
        const dateB = b.scheduled_date || ''
        return dateA.localeCompare(dateB)
      })
  }, [entries])

  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1))
  }

  const handleThisMonth = () => {
    setCurrentMonth(new Date())
  }

  const isToday = (date: Date) => isSameDay(date, new Date())
  const isCurrentMonth = (date: Date) => isSameMonth(date, currentMonth)

  return (
    <div className="space-y-4">
      {/* Header with Navigation */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{t('contentCalendar.title')}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(currentMonth, 'MMMM yyyy')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'list')}>
                <TabsList className="grid w-[200px] grid-cols-2">
                  <TabsTrigger value="month" className="text-xs">
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {t('calendarView.month')}
                  </TabsTrigger>
                  <TabsTrigger value="list" className="text-xs">
                    <List className="mr-1 h-3 w-3" />
                    {t('calendarView.list')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Month Navigation */}
              {view === 'month' && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleThisMonth}>
                    {t('calendarView.today')}
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Create Post Button */}
              {onCreatePost && (
                <Button onClick={() => onCreatePost()} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('contentCalendar.newPost')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid View */}
      {view === 'month' && (
        <Card>
          <CardContent className="p-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {[t('calendarView.dayMon'), t('calendarView.dayTue'), t('calendarView.dayWed'), t('calendarView.dayThu'), t('calendarView.dayFri'), t('calendarView.daySat'), t('calendarView.daySun')].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const dayEntries = getEntriesForDate(day)
                const isCurrentMonthDay = isCurrentMonth(day)
                const isTodayDay = isToday(day)

                return (
                  <div
                    key={index}
                    className={cn(
                      'min-h-[120px] p-2 rounded-lg border transition-colors',
                      !isCurrentMonthDay && 'bg-muted/50 text-muted-foreground',
                      isTodayDay && 'ring-2 ring-primary ring-offset-1',
                      dayEntries.length > 0 && 'bg-accent/20'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isTodayDay && 'text-primary font-bold'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {isCurrentMonthDay && onCreatePost && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 hover:opacity-100 transition-opacity"
                          onClick={() => onCreatePost(format(day, 'yyyy-MM-dd'))}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1">
                      {loading ? (
                        <div className="text-xs text-muted-foreground">{t('contentCalendar.loading')}</div>
                      ) : (
                        dayEntries.slice(0, 3).map((entry) => (
                          <button
                            key={entry.id}
                            onClick={() => onEntryEdit?.(entry)}
                            className={cn(
                              'w-full text-left text-xs p-1.5 rounded truncate transition-colors',
                              'hover:bg-accent cursor-pointer',
                              entry.status === 'published' && 'bg-green-500/10 text-green-700 dark:text-green-400',
                              entry.status === 'scheduled' && 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
                              entry.status === 'draft' && 'bg-muted0/10 text-foreground dark:text-muted-foreground',
                              entry.status === 'failed' && 'bg-red-500/10 text-red-700 dark:text-red-400'
                            )}
                          >
                            {entry.title}
                          </button>
                        ))
                      )}
                      {dayEntries.length > 3 && (
                        <div className="text-xs text-muted-foreground pl-1">
                          {t('contentCalendar.moreEntries', { count: dayEntries.length - 3 })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-3">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {t('contentCalendar.loadingContent')}
              </CardContent>
            </Card>
          ) : sortedEntries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {t('contentCalendar.noPosts')}
              </CardContent>
            </Card>
          ) : (
            sortedEntries.map((entry) => (
              <ContentCalendarCard
                key={entry.id}
                entry={entry}
                onEdit={onEntryEdit}
                onDelete={onEntryDelete}
                onPublish={onEntryPublish}
              />
            ))
          )}
        </div>
      )}

      {/* Draft Posts (Unscheduled) */}
      {entries.filter((e) => !e.scheduled_date).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('contentCalendar.unscheduledDrafts')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries
              .filter((e) => !e.scheduled_date)
              .map((entry) => (
                <ContentCalendarCard
                  key={entry.id}
                  entry={entry}
                  onEdit={onEntryEdit}
                  onDelete={onEntryDelete}
                  compact
                />
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
