'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useTasks } from '@/hooks/use-tasks'
import { useTaskTemplates } from '@/hooks/use-task-templates'
import { useEmployees } from '@/hooks/use-employees'
import { useTaskPlanGrid } from '@/hooks/use-task-plan-grid'
import { TaskDataTable } from '@/components/staff/tasks/task-data-table'
import { TaskForm } from '@/components/staff/tasks/task-form'
import { TaskDetail } from '@/components/staff/tasks/task-detail'
import { TaskTemplateForm } from '@/components/staff/tasks/task-template-form'
import { TaskPlanDialog } from '@/components/staff/tasks/task-plan-dialog'
import { ComplianceTypeSelector } from '@/components/staff/compliance/compliance-type-selector'
import { ComplianceRecordForm } from '@/components/staff/compliance/compliance-record-form'
import { ComplianceRecordList } from '@/components/staff/compliance/compliance-record-list'
import { ComplianceRecordDetail } from '@/components/staff/compliance/compliance-record-detail'
import { ComplianceRecordFilters } from '@/components/staff/compliance/compliance-record-filters'
import { TaskPlanningGrid } from '@/components/staff/tasks/task-planning-grid'
import { TaskPlanningHeader } from '@/components/staff/tasks/task-planning-header'
import { TaskPlanningStats } from '@/components/staff/tasks/task-planning-stats'
import { TaskPlanToolbar, type PrintSector } from '@/components/staff/tasks/task-plan-toolbar'
import { TaskPlanningZoneBar } from '@/components/staff/tasks/task-planning-zone-bar'
import { TaskPlanningPrintView } from '@/components/staff/tasks/task-planning-print-view'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Toaster } from '@/components/ui/toaster'
import {
  Plus,
  AlertTriangle,
  ClipboardCheck,
  CalendarDays,
  ClipboardList,
  Settings,
} from 'lucide-react'
import {
  StaffTaskWithDetails,
  StaffTaskTemplate,
  TaskStatus,
  TaskPriority,
  ComplianceFichaType,
  ComplianceFichaCategory,
  ComplianceRecordStatus,
  ComplianceRecordWithDetails,
  PlannedTask,
} from '@/types'
import { useTranslations } from 'next-intl'
import { useAuthContext } from '@/components/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { startOfWeek } from 'date-fns'
import { useRestaurantSettings } from '@/hooks/use-restaurant-settings'

interface ComplianceFiltersState {
  type_code?: string
  category?: ComplianceFichaCategory
  status?: ComplianceRecordStatus
  date_from?: string
  date_to?: string
}

interface FiltersState {
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: string
  due_date?: string
  role?: string
}

export default function TasksPage() {
  const { profile } = useAuthContext()
  const t = useTranslations('staff')
  const { toast } = useToast()

  const canManage =
    profile !== null &&
    ['admin', 'manager', 'owner'].includes(profile.role)

  // --- ACTIVE TAB ---
  const [activeTab, setActiveTab] = useState('planning')

  // --- TASKS STATE ---
  const [filters] = useState<FiltersState>({})
  const { tasks, loading, error, refetch } = useTasks(filters)
  const { templates, loading: templatesLoading, refetch: refetchTemplates } =
    useTaskTemplates()
  const { employees } = useEmployees(true)

  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<StaffTaskWithDetails | null>(null)
  const [editingTask, setEditingTask] = useState<StaffTaskWithDetails | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<StaffTaskTemplate | null>(null)
  const [templateFormOpen, setTemplateFormOpen] = useState(false)

  // Tasks sub-toggle: 'all' or 'my'
  const [tasksSubView, setTasksSubView] = useState<'all' | 'my'>('all')

  // Compliance sub-toggle: 'new' or 'records'
  const [complianceSubView, setComplianceSubView] = useState<'new' | 'records'>('new')

  // --- PLANNING STATE ---
  const grid = useTaskPlanGrid()
  const { settings } = useRestaurantSettings()
  const [planningSubView, setPlanningSubView] = useState<'grid' | 'zones'>('grid')
  const [printSector, setPrintSector] = useState<PrintSector>('all')
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [planDialogEmployee, setPlanDialogEmployee] = useState<string>('')
  const [planDialogDay, setPlanDialogDay] = useState<number>(0)
  const [planDialogTask, setPlanDialogTask] = useState<PlannedTask | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // --- COMPLIANCE STATE ---
  const [complianceTypes, setComplianceTypes] = useState<ComplianceFichaType[]>([])
  const [complianceTypesLoading, setComplianceTypesLoading] = useState(false)
  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecordWithDetails[]>([])
  const [complianceRecordsLoading, setComplianceRecordsLoading] = useState(false)
  const [complianceFilters, setComplianceFilters] = useState<ComplianceFiltersState>({})
  const [selectedFichaType, setSelectedFichaType] = useState<ComplianceFichaType | null>(null)
  const [complianceFormOpen, setComplianceFormOpen] = useState(false)
  const [selectedComplianceRecord, setSelectedComplianceRecord] = useState<ComplianceRecordWithDetails | null>(null)
  const [complianceDetailOpen, setComplianceDetailOpen] = useState(false)

  // Fetch compliance data when needed
  const fetchComplianceTypes = async () => {
    setComplianceTypesLoading(true)
    try {
      const res = await fetch('/api/staff/compliance/types')
      if (res.ok) {
        const data = await res.json()
        setComplianceTypes(Array.isArray(data) ? data : [])
      }
    } finally {
      setComplianceTypesLoading(false)
    }
  }

  const fetchComplianceRecords = async () => {
    setComplianceRecordsLoading(true)
    try {
      const params = new URLSearchParams()
      if (complianceFilters.type_code) params.append('type_code', complianceFilters.type_code)
      if (complianceFilters.category) params.append('category', complianceFilters.category)
      if (complianceFilters.status) params.append('status', complianceFilters.status)
      if (complianceFilters.date_from) params.append('date_from', complianceFilters.date_from)
      if (complianceFilters.date_to) params.append('date_to', complianceFilters.date_to)

      const res = await fetch(`/api/staff/compliance?${params}`)
      if (res.ok) {
        const data = await res.json()
        setComplianceRecords(Array.isArray(data) ? data : [])
      }
    } finally {
      setComplianceRecordsLoading(false)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'compliance') {
      if (complianceTypes.length === 0) fetchComplianceTypes()
      if (complianceSubView === 'records') fetchComplianceRecords()
    }
  }

  // Find current employee
  const currentEmployee = useMemo(
    () => employees.find((emp) => emp.profile.id === profile?.id),
    [employees, profile?.id]
  )

  // Filtered tasks for the tasks tab
  const displayedTasks = useMemo(() => {
    if (tasksSubView === 'my' && currentEmployee) {
      return tasks.filter((t) => t.assigned_to === currentEmployee.id)
    }
    return tasks
  }, [tasks, tasksSubView, currentEmployee])

  // Zones covered count
  const zonesCovered = useMemo(() => {
    const sectionIds = new Set(grid.tasks.map((t) => t.section_id).filter(Boolean))
    return sectionIds.size
  }, [grid.tasks])

  // Task handlers
  const handleTaskClick = (task: StaffTaskWithDetails) => {
    setSelectedTask(task)
    setDetailOpen(true)
  }

  const handleEditTask = (task: StaffTaskWithDetails) => {
    setEditingTask(task)
    setFormOpen(true)
  }

  const handleCreateTask = () => {
    setEditingTask(null)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    if (!open) setEditingTask(null)
    setFormOpen(open)
  }

  const handleDetailClose = (open: boolean) => {
    if (!open) setSelectedTask(null)
    setDetailOpen(open)
  }

  const handleEditTemplate = (template: StaffTaskTemplate) => {
    setEditingTemplate(template)
    setTemplateFormOpen(true)
  }

  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setTemplateFormOpen(true)
  }

  const handleTemplateFormClose = (open: boolean) => {
    if (!open) setEditingTemplate(null)
    setTemplateFormOpen(open)
  }

  const handleDeleteTemplate = async (template: StaffTaskTemplate) => {
    if (!confirm(t('tasks.deleteTemplateConfirm'))) return
    try {
      const res = await fetch(`/api/staff/tasks/templates/${template.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete template')
      toast({ title: t('tasks.templateDeleted'), description: t('tasks.templateDeletedDesc') })
      refetchTemplates()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  const handleSuccess = () => {
    refetch()
    refetchTemplates()
  }

  // Planning handlers
  const handleOpenCustomTask = useCallback((employeeId: string, dayOfWeek: number) => {
    setPlanDialogEmployee(employeeId)
    setPlanDialogDay(dayOfWeek)
    setPlanDialogTask(null)
    setPlanDialogOpen(true)
  }, [])

  const handleEditPlanTask = useCallback((task: PlannedTask) => {
    setPlanDialogEmployee(task.assigned_to || '')
    setPlanDialogDay(task.day_of_week)
    setPlanDialogTask(task)
    setPlanDialogOpen(true)
  }, [])

  const handlePlanDialogSave = useCallback((data: Partial<PlannedTask> & { title: string; day_of_week: number }) => {
    if (planDialogTask) {
      grid.updateTask(planDialogTask.id, data)
    } else {
      grid.addTask({
        ...data,
        assigned_to: planDialogEmployee || undefined,
      })
    }
  }, [planDialogTask, planDialogEmployee, grid])

  const handleSaveDraft = useCallback(async () => {
    const ok = await grid.saveDraft()
    if (ok) toast({ title: t('taskPlanning.taskPlanSaved') })
  }, [grid, toast, t])

  const handlePublish = useCallback(async () => {
    if (!confirm(t('taskPlanning.confirmPublish'))) return
    const ok = await grid.publish()
    if (ok) toast({ title: t('taskPlanning.taskPlanPublished') })
  }, [grid, toast, t])

  const handleCopyPrev = useCallback(async () => {
    const ok = await grid.copyPreviousWeek()
    if (ok) toast({ title: t('taskPlanning.taskPlanSaved') })
  }, [grid, toast, t])

  const handleExportExcel = useCallback(async () => {
    if (!grid.plan?.id) return
    try {
      const res = await fetch(`/api/staff/task-plans/${grid.plan.id}/export`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `task-plan-${grid.weekStartStr}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'Error', description: 'Failed to export', variant: 'destructive' })
    }
  }, [grid.plan?.id, grid.weekStartStr, toast])

  const handleWeekChange = useCallback((date: Date) => {
    const ws = startOfWeek(date, { weekStartsOn: 1 })
    // We need to navigate to the correct week — use the grid navigation
    const diff = ws.getTime() - grid.weekStart.getTime()
    if (diff > 0) {
      const weeks = Math.round(diff / (7 * 24 * 60 * 60 * 1000))
      for (let i = 0; i < weeks; i++) grid.goToNextWeek()
    } else if (diff < 0) {
      const weeks = Math.round(-diff / (7 * 24 * 60 * 60 * 1000))
      for (let i = 0; i < weeks; i++) grid.goToPrevWeek()
    }
  }, [grid])

  // Compliance handlers
  const handleSelectFichaType = (type: ComplianceFichaType) => {
    setSelectedFichaType(type)
    setComplianceFormOpen(true)
  }

  const handleViewComplianceRecord = (record: ComplianceRecordWithDetails) => {
    setSelectedComplianceRecord(record)
    setComplianceDetailOpen(true)
  }

  const handleDownloadBlankTemplate = async (type: ComplianceFichaType, format: 'pdf' | 'xlsx', lang?: string) => {
    const downloadLang = lang || locale
    try {
      const res = await fetch(
        `/api/staff/compliance/export/blank-template?code=${type.code}&format=${format}&lang=${downloadLang}`
      )
      if (!res.ok) throw new Error('Failed to download template')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `blank-${type.code}-${downloadLang}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'Error', description: 'Failed to download blank template', variant: 'destructive' })
    }
  }

  const handleExportCompliancePDF = async (record: ComplianceRecordWithDetails) => {
    try {
      const res = await fetch(`/api/staff/compliance/export/pdf?id=${record.id}`)
      if (!res.ok) throw new Error('Failed to export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compliance_${record.ficha_type_code}_${record.id.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'Error', description: 'Failed to export PDF', variant: 'destructive' })
    }
  }

  const handleComplianceSuccess = () => {
    fetchComplianceRecords()
  }

  const locale = profile?.language || 'en'

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 no-print">
        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-medium">{t('tasks.failedToLoad')}</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header with back button + title + week navigation — OUTSIDE tabs */}
        <TaskPlanningHeader
          weekStart={grid.weekStart}
          onWeekChange={handleWeekChange}
          plan={grid.plan}
        />

        {/* 3 Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="h-auto gap-1">
            {canManage && (
              <TabsTrigger value="planning" className="gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {t('taskPlanning.planningTab')}
              </TabsTrigger>
            )}
            <TabsTrigger value="tasks" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              {t('taskPlanning.tasksTab')}
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" />
              {t('taskPlanning.complianceTab')}
            </TabsTrigger>
          </TabsList>

          {/* ============================================================ */}
          {/* TAB: PLANNING — Weekly grid */}
          {/* ============================================================ */}
          {canManage && (
            <TabsContent value="planning" className="space-y-4">
              {/* Sub-toggle: Task Grid / Zone Assignment */}
              <div className="inline-flex items-center rounded-lg border bg-muted p-0.5">
                <button
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    planningSubView === 'grid'
                      ? 'bg-background shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setPlanningSubView('grid')}
                >
                  {t('taskPlanning.taskGrid')}
                </button>
                <button
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    planningSubView === 'zones'
                      ? 'bg-background shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setPlanningSubView('zones')}
                >
                  {t('taskPlanning.zoneAssignment')}
                </button>
              </div>

              {planningSubView === 'grid' ? (
                <>
                  {/* Stats */}
                  <TaskPlanningStats
                    grandTotal={grid.grandTotal}
                    zonesCovered={zonesCovered}
                  />

                  {/* Toolbar */}
                  <TaskPlanToolbar
                    plan={grid.plan}
                    isDirty={grid.isDirty}
                    saving={grid.saving}
                    canUndo={grid.canUndo}
                    canRedo={grid.canRedo}
                    onSave={handleSaveDraft}
                    onPublish={handlePublish}
                    onCopyPrev={handleCopyPrev}
                    onUndo={grid.undo}
                    onRedo={grid.redo}
                    onPrint={handlePrint}
                    onExport={grid.plan?.id ? handleExportExcel : undefined}
                    printSector={printSector}
                    onPrintSectorChange={setPrintSector}
                  />

                  {/* The Grid */}
                  {grid.loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-64 w-full" />
                    </div>
                  ) : (
                    <TaskPlanningGrid
                      departmentGroups={grid.departmentGroups}
                      weekDates={grid.weekDates}
                      dailyTotals={grid.dailyTotals}
                      grandTotal={grid.grandTotal}
                      templates={grid.templates}
                      onAddFromTemplate={grid.addFromTemplate}
                      onOpenCustomTask={handleOpenCustomTask}
                      onEditTask={handleEditPlanTask}
                      onRemoveTask={grid.removeTask}
                    />
                  )}
                </>
              ) : (
                /* Zone Assignment full view */
                <TaskPlanningZoneBar
                  sections={grid.sections}
                  employees={grid.employees}
                  weekStart={grid.weekStartStr}
                  weekDates={grid.weekDates}
                />
              )}
            </TabsContent>
          )}

          {/* ============================================================ */}
          {/* TAB: TASKS — Operational task list */}
          {/* ============================================================ */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Sub-toggle: All / My */}
              <div className="inline-flex items-center rounded-lg border bg-muted p-0.5">
                <button
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    tasksSubView === 'all'
                      ? 'bg-background shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setTasksSubView('all')}
                >
                  {t('taskPlanning.allTasks')}
                </button>
                <button
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    tasksSubView === 'my'
                      ? 'bg-background shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setTasksSubView('my')}
                >
                  {t('taskPlanning.myTasks')}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {canManage && (
                  <Button variant="outline" size="sm" onClick={() => setTemplateSheetOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t('taskPlanning.manageTemplates')}
                  </Button>
                )}
                {canManage && (
                  <Button onClick={handleCreateTask} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('tasks.createTask')}
                  </Button>
                )}
              </div>
            </div>

            <TaskDataTable
              tasks={displayedTasks}
              employees={employees}
              loading={loading}
              canManage={canManage}
              onView={handleTaskClick}
              onEdit={handleEditTask}
              onRefetch={refetch}
            />
          </TabsContent>

          {/* ============================================================ */}
          {/* TAB: COMPLIANCE — New record + records list */}
          {/* ============================================================ */}
          <TabsContent value="compliance" className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Sub-toggle: New Record / All Records */}
              <div className="inline-flex items-center rounded-lg border bg-muted p-0.5">
                <button
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    complianceSubView === 'new'
                      ? 'bg-background shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setComplianceSubView('new')}
                >
                  {t('taskPlanning.newRecord')}
                </button>
                <button
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    complianceSubView === 'records'
                      ? 'bg-background shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                    setComplianceSubView('records')
                    fetchComplianceRecords()
                  }}
                >
                  {t('taskPlanning.allRecords')}
                </button>
              </div>
            </div>

            {complianceSubView === 'new' ? (
              <ComplianceTypeSelector
                types={complianceTypes}
                loading={complianceTypesLoading}
                onSelect={handleSelectFichaType}
                onDownloadTemplate={handleDownloadBlankTemplate}
                locale={locale}
              />
            ) : (
              <>
                <ComplianceRecordFilters
                  filters={complianceFilters}
                  onFiltersChange={(f) => {
                    setComplianceFilters(f)
                    setTimeout(() => fetchComplianceRecords(), 0)
                  }}
                  types={complianceTypes}
                />
                <ComplianceRecordList
                  records={complianceRecords}
                  loading={complianceRecordsLoading}
                  onView={handleViewComplianceRecord}
                  onExportPDF={handleExportCompliancePDF}
                  locale={locale}
                />
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* ============================================================ */}
        {/* SHEETS & DIALOGS */}
        {/* ============================================================ */}

        {/* Task CRUD sheets */}
        <TaskForm
          open={formOpen}
          onOpenChange={handleFormClose}
          task={editingTask}
          templates={templates}
          employees={employees}
          onSuccess={handleSuccess}
        />

        <TaskDetail
          open={detailOpen}
          onOpenChange={handleDetailClose}
          task={selectedTask}
          onSuccess={handleSuccess}
          canManage={canManage}
        />

        {/* Templates Sheet */}
        <Sheet open={templateSheetOpen} onOpenChange={setTemplateSheetOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{t('taskPlanning.manageTemplates')}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              <Button variant="outline" size="sm" onClick={handleCreateTemplate}>
                <Plus className="mr-2 h-4 w-4" />
                {t('tasks.createTemplate')}
              </Button>

              {templatesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {t('tasks.noTemplates')}
                </p>
              ) : (
                templates.map((template) => (
                  <Card key={template.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{template.title}</h4>
                          {template.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{template.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {template.estimated_minutes && (
                              <span className="text-xs text-muted-foreground">~{template.estimated_minutes}min</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { handleEditTemplate(template); setTemplateSheetOpen(false) }}>
                            <Settings className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteTemplate(template)}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>

        <TaskTemplateForm
          open={templateFormOpen}
          onOpenChange={handleTemplateFormClose}
          template={editingTemplate}
          onSuccess={handleSuccess}
        />

        {/* Planning task dialog */}
        <TaskPlanDialog
          open={planDialogOpen}
          onOpenChange={setPlanDialogOpen}
          task={planDialogTask}
          dayOfWeek={planDialogDay}
          employees={grid.employees}
          sections={grid.sections}
          templates={grid.templates}
          onSave={handlePlanDialogSave}
        />

        {/* Compliance Sheets */}
        <ComplianceRecordForm
          open={complianceFormOpen}
          onOpenChange={setComplianceFormOpen}
          fichaType={selectedFichaType}
          onSuccess={handleComplianceSuccess}
          locale={locale}
        />

        <ComplianceRecordDetail
          open={complianceDetailOpen}
          onOpenChange={(open) => {
            setComplianceDetailOpen(open)
            if (!open) setSelectedComplianceRecord(null)
          }}
          record={selectedComplianceRecord}
          canManage={canManage}
          onSuccess={handleComplianceSuccess}
          onExportPDF={handleExportCompliancePDF}
          locale={locale}
        />

        <Toaster />
      </div>

      {/* Print view — OUTSIDE no-print wrapper */}
      <TaskPlanningPrintView
        ref={printRef}
        plan={grid.plan}
        departmentGroups={grid.departmentGroups}
        weekDates={grid.weekDates}
        grandTotal={grid.grandTotal}
        printSector={printSector}
        printGroups={settings.print_groups}
      />
    </>
  )
}
