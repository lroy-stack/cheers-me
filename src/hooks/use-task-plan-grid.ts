'use client'

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import type {
  WeeklyTaskPlan,
  PlannedTask,
  PlannedTaskStatus,
  StaffTaskTemplate,
  EmployeeWithProfile,
  FloorSection,
  TaskGridCell,
  TaskGridRow,
  TaskDepartmentGroup,
} from '@/types'
import { format, addDays, startOfWeek } from 'date-fns'
import { useEmployees } from './use-employees'
import { useTaskTemplates } from './use-task-templates'

// ============================================================================
// State & Actions
// ============================================================================

interface TaskGridState {
  plan: WeeklyTaskPlan | null
  tasks: PlannedTask[]
  pendingChanges: {
    toCreate: Array<Omit<PlannedTask, 'id' | 'plan_id' | 'created_at' | 'updated_at' | 'assigned_employee' | 'section' | 'template'> & { _tempId: string }>
    toUpdate: Array<{ id: string; [key: string]: unknown }>
    toDelete: string[]
  }
  isDirty: boolean
  undoStack: Array<{ tasks: PlannedTask[]; pendingChanges: TaskGridState['pendingChanges'] }>
  redoStack: Array<{ tasks: PlannedTask[]; pendingChanges: TaskGridState['pendingChanges'] }>
}

type TaskGridAction =
  | { type: 'LOAD_DATA'; plan: WeeklyTaskPlan | null; tasks: PlannedTask[] }
  | { type: 'ADD_TASK'; task: PlannedTask & { _tempId?: string } }
  | { type: 'UPDATE_TASK'; taskId: string; updates: Partial<PlannedTask> }
  | { type: 'REMOVE_TASK'; taskId: string }
  | { type: 'MOVE_TASK'; taskId: string; dayOfWeek: number }
  | { type: 'REORDER_TASK'; taskId: string; sortOrder: number }
  | { type: 'MARK_SAVED'; plan: WeeklyTaskPlan; tasks: PlannedTask[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }

function pushUndo(state: TaskGridState): TaskGridState {
  return {
    ...state,
    undoStack: [
      ...state.undoStack.slice(-19),
      { tasks: state.tasks, pendingChanges: state.pendingChanges },
    ],
    redoStack: [],
  }
}

const emptyChanges = { toCreate: [] as TaskGridState['pendingChanges']['toCreate'], toUpdate: [] as TaskGridState['pendingChanges']['toUpdate'], toDelete: [] as string[] }

function taskGridReducer(state: TaskGridState, action: TaskGridAction): TaskGridState {
  switch (action.type) {
    case 'LOAD_DATA':
      return {
        ...state,
        plan: action.plan,
        tasks: action.tasks,
        pendingChanges: { ...emptyChanges },
        isDirty: false,
        undoStack: [],
        redoStack: [],
      }

    case 'ADD_TASK': {
      const withUndo = pushUndo(state)
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const newTask = { ...action.task, id: action.task.id || tempId }
      return {
        ...withUndo,
        tasks: [...withUndo.tasks, newTask],
        pendingChanges: {
          ...withUndo.pendingChanges,
          toCreate: [...withUndo.pendingChanges.toCreate, {
            _tempId: tempId,
            title: newTask.title,
            description: newTask.description || null,
            assigned_to: newTask.assigned_to || null,
            assigned_role: newTask.assigned_role || null,
            day_of_week: newTask.day_of_week,
            shift_type: newTask.shift_type || null,
            priority: newTask.priority || 'medium',
            estimated_minutes: newTask.estimated_minutes || null,
            section_id: newTask.section_id || null,
            sort_order: newTask.sort_order ?? state.tasks.filter(t => t.day_of_week === newTask.day_of_week).length,
            status: 'pending' as PlannedTaskStatus,
            completed_at: null,
            completed_by: null,
            task_id: null,
            template_id: newTask.template_id || null,
          }],
        },
        isDirty: true,
      }
    }

    case 'UPDATE_TASK': {
      const withUndo = pushUndo(state)
      const isTemp = action.taskId.startsWith('temp-')
      return {
        ...withUndo,
        tasks: withUndo.tasks.map(t =>
          t.id === action.taskId ? { ...t, ...action.updates } : t
        ),
        pendingChanges: isTemp
          ? {
              ...withUndo.pendingChanges,
              toCreate: withUndo.pendingChanges.toCreate.map(c =>
                c._tempId === action.taskId ? { ...c, ...action.updates } : c
              ),
            }
          : {
              ...withUndo.pendingChanges,
              toUpdate: [
                ...withUndo.pendingChanges.toUpdate.filter(u => u.id !== action.taskId),
                { id: action.taskId, ...action.updates },
              ],
            },
        isDirty: true,
      }
    }

    case 'REMOVE_TASK': {
      const withUndo = pushUndo(state)
      const isTemp = action.taskId.startsWith('temp-')
      return {
        ...withUndo,
        tasks: withUndo.tasks.filter(t => t.id !== action.taskId),
        pendingChanges: isTemp
          ? {
              ...withUndo.pendingChanges,
              toCreate: withUndo.pendingChanges.toCreate.filter(c => c._tempId !== action.taskId),
            }
          : {
              ...withUndo.pendingChanges,
              toUpdate: withUndo.pendingChanges.toUpdate.filter(u => u.id !== action.taskId),
              toDelete: [...withUndo.pendingChanges.toDelete, action.taskId],
            },
        isDirty: true,
      }
    }

    case 'MOVE_TASK': {
      const withUndo = pushUndo(state)
      return {
        ...withUndo,
        tasks: withUndo.tasks.map(t =>
          t.id === action.taskId ? { ...t, day_of_week: action.dayOfWeek } : t
        ),
        pendingChanges: {
          ...withUndo.pendingChanges,
          toUpdate: [
            ...withUndo.pendingChanges.toUpdate.filter(u => u.id !== action.taskId),
            ...(action.taskId.startsWith('temp-') ? [] : [{ id: action.taskId, day_of_week: action.dayOfWeek }]),
          ],
          toCreate: withUndo.pendingChanges.toCreate.map(c =>
            c._tempId === action.taskId ? { ...c, day_of_week: action.dayOfWeek } : c
          ),
        },
        isDirty: true,
      }
    }

    case 'REORDER_TASK': {
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.taskId ? { ...t, sort_order: action.sortOrder } : t
        ),
      }
    }

    case 'MARK_SAVED':
      return {
        ...state,
        plan: action.plan,
        tasks: action.tasks,
        pendingChanges: { ...emptyChanges },
        isDirty: false,
      }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state
      const prev = state.undoStack[state.undoStack.length - 1]
      return {
        ...state,
        tasks: prev.tasks,
        pendingChanges: prev.pendingChanges,
        isDirty: true,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [
          ...state.redoStack,
          { tasks: state.tasks, pendingChanges: state.pendingChanges },
        ],
      }
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state
      const next = state.redoStack[state.redoStack.length - 1]
      return {
        ...state,
        tasks: next.tasks,
        pendingChanges: next.pendingChanges,
        isDirty: true,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [
          ...state.undoStack,
          { tasks: state.tasks, pendingChanges: state.pendingChanges },
        ],
      }
    }

    default:
      return state
  }
}

const initialState: TaskGridState = {
  plan: null,
  tasks: [],
  pendingChanges: { ...emptyChanges },
  isDirty: false,
  undoStack: [],
  redoStack: [],
}

// ============================================================================
// Hook
// ============================================================================

export function useTaskPlanGrid(initialWeekStart?: Date) {
  const [state, dispatch] = useReducer(taskGridReducer, initialState)
  const [weekStart, setWeekStart] = useState<Date>(
    initialWeekStart || startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sections, setSections] = useState<FloorSection[]>([])

  const { employees } = useEmployees(true)
  const { templates } = useTaskTemplates()

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd')),
    [weekStart]
  )
  const dayLabels = useMemo(
    () => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    []
  )

  // Load plan and sections
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [planRes, sectionsRes] = await Promise.all([
          fetch(`/api/staff/task-plans?week=${weekStartStr}`),
          fetch('/api/floor-sections'),
        ])

        let plan: WeeklyTaskPlan | null = null
        let tasks: PlannedTask[] = []

        if (planRes.ok) {
          const data = await planRes.json()
          if (data && data.id) {
            plan = data
            tasks = data.planned_tasks || []
          }
        }

        if (sectionsRes.ok) {
          const sData = await sectionsRes.json()
          setSections(Array.isArray(sData) ? sData : sData.sections || [])
        }

        dispatch({ type: 'LOAD_DATA', plan, tasks })
      } catch {
        dispatch({ type: 'LOAD_DATA', plan: null, tasks: [] })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [weekStartStr])

  // Actions
  const addTask = useCallback((task: Partial<PlannedTask> & { title: string; day_of_week: number }) => {
    dispatch({
      type: 'ADD_TASK',
      task: {
        id: '',
        plan_id: state.plan?.id || '',
        title: task.title,
        description: task.description || null,
        assigned_to: task.assigned_to || null,
        assigned_role: task.assigned_role || null,
        day_of_week: task.day_of_week,
        shift_type: task.shift_type || null,
        priority: task.priority || 'medium',
        estimated_minutes: task.estimated_minutes || null,
        section_id: task.section_id || null,
        sort_order: task.sort_order ?? 0,
        status: 'pending',
        completed_at: null,
        completed_by: null,
        task_id: null,
        template_id: task.template_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })
  }, [state.plan?.id])

  const updateTask = useCallback((taskId: string, updates: Partial<PlannedTask>) => {
    dispatch({ type: 'UPDATE_TASK', taskId, updates })
  }, [])

  const removeTask = useCallback((taskId: string) => {
    dispatch({ type: 'REMOVE_TASK', taskId })
  }, [])

  const moveTask = useCallback((taskId: string, dayOfWeek: number) => {
    dispatch({ type: 'MOVE_TASK', taskId, dayOfWeek })
  }, [])

  const applyTemplate = useCallback((template: StaffTaskTemplate, dayOfWeek: number) => {
    addTask({
      title: template.title,
      description: template.description,
      assigned_role: template.default_assigned_role || undefined,
      day_of_week: dayOfWeek,
      priority: template.default_priority as PlannedTask['priority'],
      estimated_minutes: template.estimated_minutes,
      template_id: template.id,
    })
  }, [addTask])

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [])
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [])

  // Save draft
  const saveDraft = useCallback(async () => {
    setSaving(true)
    try {
      let planId = state.plan?.id

      // Create plan if needed
      if (!planId) {
        const createRes = await fetch('/api/staff/task-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week_start_date: weekStartStr }),
        })

        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({}))
          // If conflict, use existing plan
          if (err.existing_id) {
            planId = err.existing_id
          } else {
            throw new Error(err.error || 'Failed to create plan')
          }
        } else {
          const newPlan = await createRes.json()
          planId = newPlan.id
        }
      }

      // Sync changes
      const syncRes = await fetch(`/api/staff/task-plans/${planId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks_to_create: state.pendingChanges.toCreate.map(({ _tempId, ...rest }) => rest),
          tasks_to_update: state.pendingChanges.toUpdate,
          tasks_to_delete: state.pendingChanges.toDelete,
        }),
      })

      if (!syncRes.ok) {
        throw new Error('Failed to sync changes')
      }

      // Reload plan
      const reloadRes = await fetch(`/api/staff/task-plans/${planId}`)
      if (reloadRes.ok) {
        const fullPlan = await reloadRes.json()
        dispatch({
          type: 'MARK_SAVED',
          plan: fullPlan,
          tasks: fullPlan.planned_tasks || [],
        })
      }

      return true
    } catch (error) {
      console.error('Save error:', error)
      return false
    } finally {
      setSaving(false)
    }
  }, [state.plan?.id, state.pendingChanges, weekStartStr])

  // Publish
  const publish = useCallback(async () => {
    // Save first if dirty
    if (state.isDirty) {
      const saved = await saveDraft()
      if (!saved) return false
    }

    if (!state.plan?.id) return false

    setSaving(true)
    try {
      const res = await fetch(`/api/staff/task-plans/${state.plan.id}/publish`, {
        method: 'POST',
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to publish')
      }

      // Reload
      const reloadRes = await fetch(`/api/staff/task-plans/${state.plan.id}`)
      if (reloadRes.ok) {
        const fullPlan = await reloadRes.json()
        dispatch({
          type: 'MARK_SAVED',
          plan: fullPlan,
          tasks: fullPlan.planned_tasks || [],
        })
      }

      return true
    } catch (error) {
      console.error('Publish error:', error)
      return false
    } finally {
      setSaving(false)
    }
  }, [state.plan?.id, state.isDirty, saveDraft])

  // Copy previous week
  const copyPreviousWeek = useCallback(async () => {
    const prevWeek = format(addDays(weekStart, -7), 'yyyy-MM-dd')

    // Find previous week's plan
    const res = await fetch(`/api/staff/task-plans?week=${prevWeek}`)
    if (!res.ok) return false

    const prevPlan = await res.json()
    if (!prevPlan?.id) return false

    setSaving(true)
    try {
      const copyRes = await fetch(`/api/staff/task-plans/${prevPlan.id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_week_start: weekStartStr }),
      })

      if (!copyRes.ok) {
        throw new Error('Failed to copy plan')
      }

      const newPlan = await copyRes.json()
      dispatch({
        type: 'MARK_SAVED',
        plan: newPlan,
        tasks: newPlan.planned_tasks || [],
      })

      return true
    } catch {
      return false
    } finally {
      setSaving(false)
    }
  }, [weekStart, weekStartStr])

  // Navigate weeks
  const goToNextWeek = useCallback(() => {
    setWeekStart(prev => addDays(prev, 7))
  }, [])

  const goToPrevWeek = useCallback(() => {
    setWeekStart(prev => addDays(prev, -7))
  }, [])

  const goToThisWeek = useCallback(() => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }, [])

  // Computed: tasks by day
  const tasksByDay = useMemo(() => {
    const map: Record<number, PlannedTask[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
    for (const task of state.tasks) {
      if (map[task.day_of_week]) {
        map[task.day_of_week].push(task)
      }
    }
    // Sort by sort_order within each day
    for (const day in map) {
      map[day].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }
    return map
  }, [state.tasks])

  // Daily stats
  const dailyStats = useMemo(() => {
    const stats: Record<number, { count: number; minutes: number }> = {}
    for (let d = 0; d < 7; d++) {
      const dayTasks = tasksByDay[d] || []
      stats[d] = {
        count: dayTasks.length,
        minutes: dayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0),
      }
    }
    return stats
  }, [tasksByDay])

  // Priority order for comparison
  const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

  // Computed: department groups for grid display
  const departmentGroups: TaskDepartmentGroup[] = useMemo(() => {
    if (employees.length === 0) return []

    // Group employees by role
    const roleMap = new Map<string, EmployeeWithProfile[]>()
    for (const emp of employees) {
      const role = emp.profile?.role || 'waiter'
      if (!roleMap.has(role)) roleMap.set(role, [])
      roleMap.get(role)!.push(emp)
    }

    // Build grid rows
    const groups: TaskDepartmentGroup[] = []

    for (const [role, roleEmployees] of roleMap) {
      const rows: TaskGridRow[] = roleEmployees.map((employee) => {
        const cells: Record<string, TaskGridCell> = {}
        let totalTasks = 0
        let totalMinutes = 0

        for (let d = 0; d < 7; d++) {
          const date = weekDates[d]
          const dayTasks = state.tasks.filter(
            (t) => t.day_of_week === d && t.assigned_to === employee.id
          )

          let highestPriority: TaskGridCell['highestPriority'] = null
          for (const task of dayTasks) {
            const p = task.priority || 'medium'
            if (!highestPriority || PRIORITY_ORDER[p] < PRIORITY_ORDER[highestPriority]) {
              highestPriority = p as TaskGridCell['highestPriority']
            }
          }

          const mins = dayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0)
          cells[date] = {
            date,
            tasks: dayTasks,
            taskCount: dayTasks.length,
            totalMinutes: mins,
            highestPriority,
          }
          totalTasks += dayTasks.length
          totalMinutes += mins
        }

        return { employee, cells, totalTasks, totalMinutes }
      })

      // Only include groups with employees
      if (rows.length > 0) {
        groups.push({
          role,
          label: role.toUpperCase(),
          employees: rows,
          totalTasks: rows.reduce((s, r) => s + r.totalTasks, 0),
          totalMinutes: rows.reduce((s, r) => s + r.totalMinutes, 0),
        })
      }
    }

    return groups
  }, [employees, state.tasks, weekDates])

  // Computed: daily totals for footer
  const dailyTotals: Record<string, { taskCount: number; minutes: number }> = useMemo(() => {
    const totals: Record<string, { taskCount: number; minutes: number }> = {}
    for (let d = 0; d < 7; d++) {
      const date = weekDates[d]
      const dayTasks = state.tasks.filter((t) => t.day_of_week === d)
      totals[date] = {
        taskCount: dayTasks.length,
        minutes: dayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0),
      }
    }
    return totals
  }, [state.tasks, weekDates])

  // Computed: grand total
  const grandTotal = useMemo(() => {
    const assignedEmployeeIds = new Set(state.tasks.map((t) => t.assigned_to).filter(Boolean))
    return {
      tasks: state.tasks.length,
      minutes: state.tasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0),
      employees: assignedEmployeeIds.size,
    }
  }, [state.tasks])

  // Add task from template for specific employee and day
  const addFromTemplate = useCallback(
    (employeeId: string, dayOfWeek: number, templateId: string) => {
      const template = templates.find((t) => t.id === templateId)
      if (!template) return
      addTask({
        title: template.title,
        description: template.description,
        assigned_to: employeeId,
        assigned_role: template.default_assigned_role || undefined,
        day_of_week: dayOfWeek,
        priority: template.default_priority as PlannedTask['priority'],
        estimated_minutes: template.estimated_minutes,
        template_id: template.id,
      })
    },
    [addTask, templates]
  )

  return {
    // State
    plan: state.plan,
    tasks: state.tasks,
    tasksByDay,
    dailyStats,
    isDirty: state.isDirty,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    loading,
    saving,

    // Week data
    weekStart,
    weekStartStr,
    weekDates,
    dayLabels,

    // Reference data
    employees,
    templates,
    sections,

    // Grid data
    departmentGroups,
    dailyTotals,
    grandTotal,

    // Actions
    addTask,
    updateTask,
    removeTask,
    moveTask,
    applyTemplate,
    addFromTemplate,
    saveDraft,
    publish,
    copyPreviousWeek,
    undo,
    redo,
    goToNextWeek,
    goToPrevWeek,
    goToThisWeek,
  }
}
