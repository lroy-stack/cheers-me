'use client'

import { useState, useCallback, useEffect } from 'react'
import { startOfWeek } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import { useScheduleGrid } from '@/hooks/use-schedule-grid'
import { useTranslations } from 'next-intl'
import { ShiftWithEmployee, CreateShiftRequest } from '@/types'
import { ShiftFormDialog } from '@/components/staff/shift-form-dialog'
import { SHIFT_TYPE_CONFIG } from '@/lib/constants/schedule'
import { PrintSector } from '@/components/staff/schedule/schedule-toolbar'
import { exportScheduleToExcel } from '@/lib/utils/schedule-excel-export'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/providers/auth-provider'

// Schedule components
import { SchedulePageHeader } from '@/components/staff/schedule/schedule-page-header'
import { ScheduleStatsPanel } from '@/components/staff/schedule/schedule-stats-panel'
import { ScheduleViolationsPanel } from '@/components/staff/schedule/schedule-violations-panel'
import { ScheduleToolbar } from '@/components/staff/schedule/schedule-toolbar'
import { ScheduleGrid } from '@/components/staff/schedule/schedule-grid'
import { SchedulePrintView } from '@/components/staff/schedule/schedule-print-view'
import { MonthlyRegistryView } from '@/components/staff/schedule/monthly-registry-view'
import { LeaveManagementView } from '@/components/staff/schedule/leave-management-view'

export default function SchedulePage() {
  const { profile } = useAuthContext()
  const router = useRouter()

  // Only admin, manager, owner can access schedule page
  if (profile && !['admin', 'manager', 'owner'].includes(profile.role)) {
    router.replace('/dashboard')
    return null
  }
  const { toast } = useToast()
  const t = useTranslations('staff')

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [printSector, setPrintSector] = useState<PrintSector>('all')

  const {
    plan,
    shifts,
    loading,
    saving,
    error,
    isDirty,
    canUndo,
    canRedo,
    departmentGroups,
    dailyTotals,
    validation,
    grandTotal,
    weekDates,
    employees,
    settings,
    setCellType,
    saveDraft,
    publish,
    copyPreviousWeek,
    undo,
    redo,
    refetch,
  } = useScheduleGrid(weekStart)

  // Shift form dialog state
  const [shiftFormOpen, setShiftFormOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<ShiftWithEmployee | null>(null)
  const [defaultDate, setDefaultDate] = useState<string | undefined>()
  const [, setDefaultEmployeeId] = useState<string | undefined>()

  const handleOpenShiftForm = useCallback((employeeId: string, date: string) => {
    // Find existing shift
    const existingShift = shifts.find(
      (s) => s.employee_id === employeeId && s.date === date
    )
    if (existingShift && !existingShift.id.startsWith('temp-')) {
      setSelectedShift(existingShift)
      setDefaultDate(undefined)
      setDefaultEmployeeId(undefined)
    } else {
      setSelectedShift(null)
      setDefaultDate(date)
      setDefaultEmployeeId(employeeId)
    }
    setShiftFormOpen(true)
  }, [shifts])

  const handleFormSubmit = async (data: CreateShiftRequest) => {
    try {
      // Include schedule_plan_id if a plan exists for this week
      const payload = plan ? { ...data, schedule_plan_id: plan.id } : data

      if (selectedShift) {
        const res = await fetch(`/api/staff/shifts/${selectedShift.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Failed to update shift')
        toast({ title: 'Success', description: 'Shift updated' })
      } else {
        const res = await fetch('/api/staff/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to create shift')
        toast({ title: 'Success', description: 'Shift created' })
      }
      refetch()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save shift',
        variant: 'destructive',
      })
      throw err
    }
  }

  const handleSave = useCallback(async () => {
    try {
      await saveDraft()
      toast({ title: 'Saved', description: 'Draft saved successfully' })
    } catch {
      toast({ title: 'Error', description: 'Failed to save draft', variant: 'destructive' })
    }
  }, [saveDraft, toast])

  const handlePublish = useCallback(async () => {
    if (!confirm('Publish this schedule? Staff will be able to see it.')) return
    try {
      await publish()
      toast({ title: 'Published', description: 'Schedule published successfully' })
    } catch {
      toast({ title: 'Error', description: 'Failed to publish', variant: 'destructive' })
    }
  }, [publish, toast])

  const handleCopyPreviousWeek = useCallback(async (sourceWeek: string) => {
    try {
      await copyPreviousWeek(sourceWeek)
      toast({ title: 'Copied', description: 'Previous week copied successfully' })
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to copy',
        variant: 'destructive',
      })
    }
  }, [copyPreviousWeek, toast])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleExportExcel = useCallback(() => {
    const dayLabels = [
      t('schedule.dayMon'), t('schedule.dayTue'), t('schedule.dayWed'),
      t('schedule.dayThu'), t('schedule.dayFri'), t('schedule.daySat'), t('schedule.daySun'),
    ]
    exportScheduleToExcel({
      departmentGroups,
      weekDates,
      dailyTotals,
      grandTotal,
      weekStart,
      dayLabels,
      shiftTemplates: settings.shift_templates,
    })
  }, [departmentGroups, weekDates, dailyTotals, grandTotal, weekStart, t, settings.shift_templates])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, handleSave])

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 no-print">
        {/* Header */}
        <SchedulePageHeader
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          plan={plan}
        />

        {/* Tabs */}
        <Tabs defaultValue="weekly">
          <TabsList>
            <TabsTrigger value="weekly">{t('schedule.weeklyTab')}</TabsTrigger>
            <TabsTrigger value="monthly">{t('schedule.monthlyTab')}</TabsTrigger>
            <TabsTrigger value="leave">{t('schedule.leaveTab')}</TabsTrigger>
          </TabsList>

          {/* ============ WEEKLY TAB ============ */}
          <TabsContent value="weekly" className="space-y-4">
            {/* Error State */}
            {error && (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    <div>
                      <p className="font-medium">{t('schedule.failedToLoadShifts')}</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                    {t('schedule.tryAgain')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {loading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center gap-2 py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">{t('schedule.loadingSchedule')}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stats */}
                <ScheduleStatsPanel
                  grandTotal={grandTotal}
                  validation={validation}
                  shiftsCount={shifts.length}
                />

                {/* Toolbar */}
                <ScheduleToolbar
                  plan={plan}
                  weekStart={weekStart}
                  isDirty={isDirty}
                  saving={saving}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onSave={handleSave}
                  onPublish={handlePublish}
                  onCopyPreviousWeek={handleCopyPreviousWeek}
                  onUndo={undo}
                  onRedo={redo}
                  onPrint={handlePrint}
                  onExportExcel={handleExportExcel}
                  printSector={printSector}
                  onPrintSectorChange={setPrintSector}
                />

                {/* Violations */}
                <ScheduleViolationsPanel validation={validation} />

                {/* Main Grid */}
                <ScheduleGrid
                  departmentGroups={departmentGroups}
                  weekDates={weekDates}
                  dailyTotals={dailyTotals}
                  grandTotal={grandTotal}
                  onSetType={setCellType}
                  onOpenShiftForm={handleOpenShiftForm}
                />

                {/* Legend */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4">
                      {(['M', 'T', 'N', 'P', 'D'] as const).map((type) => {
                        const visualConfig = SHIFT_TYPE_CONFIG[type]
                        const dbTemplate = settings.shift_templates?.[type]
                        const start = dbTemplate?.start || visualConfig.start
                        const end = dbTemplate?.end || visualConfig.end
                        const secondStart = dbTemplate?.secondStart || visualConfig.secondStart
                        const secondEnd = dbTemplate?.secondEnd || visualConfig.secondEnd
                        const labelKey = type === 'M' ? 'schedule.morning'
                          : type === 'T' ? 'schedule.afternoon'
                          : type === 'N' ? 'schedule.night'
                          : type === 'P' ? 'schedule.splitShift'
                          : 'schedule.dayOff'
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${visualConfig.bg} border-l-4 ${visualConfig.border} flex items-center justify-center text-xs font-bold ${visualConfig.text}`}>
                              {type}
                            </div>
                            <span className="text-sm">
                              {t(labelKey)}
                              {start && type !== 'P' && ` (${start}-${end})`}
                              {type === 'P' && secondStart && ` (${start}-${end} / ${secondStart}-${secondEnd})`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ============ MONTHLY TAB ============ */}
          <TabsContent value="monthly">
            <MonthlyRegistryView />
          </TabsContent>

          {/* ============ LEAVE TAB ============ */}
          <TabsContent value="leave">
            <LeaveManagementView />
          </TabsContent>
        </Tabs>
      </div>

      {/* Print View (hidden on screen, shown when printing) */}
      <SchedulePrintView
        departmentGroups={departmentGroups}
        weekDates={weekDates}
        dailyTotals={dailyTotals}
        grandTotal={grandTotal}
        weekStart={weekStart}
        mode="weekly"
        printSector={printSector}
        shiftTemplates={settings.shift_templates}
      />

      {/* Shift Form Dialog (for custom times) */}
      <ShiftFormDialog
        open={shiftFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedShift(null)
            setDefaultDate(undefined)
            setDefaultEmployeeId(undefined)
          }
          setShiftFormOpen(open)
        }}
        shift={selectedShift}
        defaultDate={defaultDate}
        employees={employees}
        onSubmit={handleFormSubmit}
      />

      <Toaster />
    </>
  )
}
