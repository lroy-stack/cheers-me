'use client'

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import {
  ScheduleCellType,
  ScheduleGridCell,
  ScheduleGridRow,
  DepartmentGroup,
  SchedulePlan,
  ShiftWithEmployee,
  EmployeeWithProfile,
  ScheduleValidationResult,
  LeaveRequest,
  Availability,
} from '@/types'
import {
  SHIFT_TYPE_CONFIG,
  SHIFT_TYPE_TO_CELL_TYPE,
  CELL_TYPE_TO_SHIFT_TYPE,
  ROLE_DEPARTMENT_MAP,
} from '@/lib/constants/schedule'
import { validateSchedule, calculateShiftHours } from '@/lib/utils/schedule-validation'
import { format, addDays } from 'date-fns'
import { useEmployees } from './use-employees'
import { useRestaurantSettings } from './use-restaurant-settings'

// ============================================================================
// State & Actions
// ============================================================================

interface GridState {
  plan: SchedulePlan | null
  shifts: ShiftWithEmployee[]
  pendingChanges: {
    toCreate: Array<{
      employee_id: string
      date: string
      shift_type: string
      start_time: string
      end_time: string
      break_duration_minutes: number
      is_day_off: boolean
    }>
    toUpdate: Array<{ id: string; [key: string]: unknown }>
    toDelete: string[]
  }
  isDirty: boolean
  undoStack: Array<{ shifts: ShiftWithEmployee[]; pendingChanges: GridState['pendingChanges'] }>
  redoStack: Array<{ shifts: ShiftWithEmployee[]; pendingChanges: GridState['pendingChanges'] }>
}

type GridAction =
  | { type: 'LOAD_DATA'; plan: SchedulePlan | null; shifts: ShiftWithEmployee[] }
  | { type: 'SET_CELL'; employeeId: string; date: string; cellType: ScheduleCellType; employee: EmployeeWithProfile }
  | { type: 'CLEAR_CELL'; employeeId: string; date: string }
  | { type: 'MARK_SAVED'; plan: SchedulePlan; shifts: ShiftWithEmployee[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }

function pushUndo(state: GridState): GridState {
  return {
    ...state,
    undoStack: [
      ...state.undoStack.slice(-19), // Keep max 20
      { shifts: state.shifts, pendingChanges: state.pendingChanges },
    ],
    redoStack: [],
  }
}

function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case 'LOAD_DATA':
      return {
        ...state,
        plan: action.plan,
        shifts: action.shifts,
        pendingChanges: { toCreate: [], toUpdate: [], toDelete: [] },
        isDirty: false,
        undoStack: [],
        redoStack: [],
      }

    case 'SET_CELL': {
      const stateWithUndo = pushUndo(state)
      const { employeeId, date, cellType, employee } = action

      // Find existing shift for this employee+date
      const existingShift = state.shifts.find(
        (s) => s.employee_id === employeeId && s.date === date
      )

      if (cellType === null) {
        // Clear the cell
        if (existingShift) {
          return {
            ...stateWithUndo,
            shifts: state.shifts.filter((s) => s.id !== existingShift.id),
            pendingChanges: {
              ...stateWithUndo.pendingChanges,
              toDelete: [...stateWithUndo.pendingChanges.toDelete, existingShift.id],
              toUpdate: stateWithUndo.pendingChanges.toUpdate.filter(
                (u) => u.id !== existingShift.id
              ),
            },
            isDirty: true,
          }
        }
        return stateWithUndo
      }

      const isDayOff = cellType === 'D'
      // Use shift_templates from settings if available in action, fallback to hardcoded config
      const config = (action as any)._shiftConfig || SHIFT_TYPE_CONFIG[cellType]
      const shiftType = isDayOff ? 'morning' : CELL_TYPE_TO_SHIFT_TYPE[cellType]

      if (existingShift) {
        // Update existing shift
        const updatedShift = {
          ...existingShift,
          shift_type: shiftType as ShiftWithEmployee['shift_type'],
          start_time: config.start || '00:00',
          end_time: config.end || '00:00',
          second_start_time: config.secondStart || null,
          second_end_time: config.secondEnd || null,
          break_duration_minutes: config.break,
          is_day_off: isDayOff,
        }

        return {
          ...stateWithUndo,
          shifts: state.shifts.map((s) => (s.id === existingShift.id ? updatedShift : s)),
          pendingChanges: {
            ...stateWithUndo.pendingChanges,
            toUpdate: [
              ...stateWithUndo.pendingChanges.toUpdate.filter((u) => u.id !== existingShift.id),
              {
                id: existingShift.id,
                shift_type: shiftType,
                start_time: config.start || '00:00',
                end_time: config.end || '00:00',
                second_start_time: config.secondStart || null,
                second_end_time: config.secondEnd || null,
                break_duration_minutes: config.break,
                is_day_off: isDayOff,
              },
            ],
          },
          isDirty: true,
        }
      } else {
        // Create new shift (temp ID)
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const newShift: ShiftWithEmployee = {
          id: tempId,
          employee_id: employeeId,
          date,
          shift_type: shiftType as ShiftWithEmployee['shift_type'],
          start_time: config.start || '00:00',
          end_time: config.end || '00:00',
          break_duration_minutes: config.break,
          status: 'scheduled',
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_day_off: isDayOff,
          employee: {
            id: employeeId,
            profile: {
              id: employee.profile.id,
              full_name: employee.profile.full_name,
              role: employee.profile.role,
            },
          },
        } as ShiftWithEmployee & { is_day_off: boolean }

        return {
          ...stateWithUndo,
          shifts: [...state.shifts, newShift],
          pendingChanges: {
            ...stateWithUndo.pendingChanges,
            toCreate: [
              ...stateWithUndo.pendingChanges.toCreate,
              {
                employee_id: employeeId,
                date,
                shift_type: shiftType,
                start_time: config.start || '00:00',
                end_time: config.end || '00:00',
                ...(config.secondStart ? { second_start_time: config.secondStart, second_end_time: config.secondEnd } : {}),
                break_duration_minutes: config.break,
                is_day_off: isDayOff,
              },
            ],
          },
          isDirty: true,
        }
      }
    }

    case 'CLEAR_CELL': {
      const stateWithUndo = pushUndo(state)
      const existing = state.shifts.find(
        (s) => s.employee_id === action.employeeId && s.date === action.date
      )
      if (!existing) return stateWithUndo

      return {
        ...stateWithUndo,
        shifts: state.shifts.filter((s) => s.id !== existing.id),
        pendingChanges: {
          ...stateWithUndo.pendingChanges,
          toDelete: [...stateWithUndo.pendingChanges.toDelete, existing.id],
        },
        isDirty: true,
      }
    }

    case 'MARK_SAVED':
      return {
        ...state,
        plan: action.plan,
        shifts: action.shifts,
        pendingChanges: { toCreate: [], toUpdate: [], toDelete: [] },
        isDirty: false,
      }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state
      const prev = state.undoStack[state.undoStack.length - 1]
      return {
        ...state,
        shifts: prev.shifts,
        pendingChanges: prev.pendingChanges,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [
          ...state.redoStack,
          { shifts: state.shifts, pendingChanges: state.pendingChanges },
        ],
        isDirty: true,
      }
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state
      const next = state.redoStack[state.redoStack.length - 1]
      return {
        ...state,
        shifts: next.shifts,
        pendingChanges: next.pendingChanges,
        undoStack: [
          ...state.undoStack,
          { shifts: state.shifts, pendingChanges: state.pendingChanges },
        ],
        redoStack: state.redoStack.slice(0, -1),
        isDirty: true,
      }
    }

    default:
      return state
  }
}

const initialState: GridState = {
  plan: null,
  shifts: [],
  pendingChanges: { toCreate: [], toUpdate: [], toDelete: [] },
  isDirty: false,
  undoStack: [],
  redoStack: [],
}

// ============================================================================
// Hook
// ============================================================================

export function useScheduleGrid(weekStart: Date) {
  const [state, dispatch] = useReducer(gridReducer, initialState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])

  const { employees, loading: employeesLoading } = useEmployees(true)
  const { settings } = useRestaurantSettings()

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd')

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [planRes, leaveRes, availRes] = await Promise.all([
        fetch(`/api/staff/schedule-plans?week_start_date=${weekStartStr}`),
        fetch(`/api/staff/leave?status=approved&year=${weekStart.getFullYear()}`),
        fetch(`/api/staff/availability?start_date=${weekStartStr}&end_date=${weekEndStr}`),
      ])

      if (planRes.ok) {
        const planData = await planRes.json()
        dispatch({ type: 'LOAD_DATA', plan: planData.plan, shifts: planData.shifts || [] })
      } else {
        dispatch({ type: 'LOAD_DATA', plan: null, shifts: [] })
      }

      if (leaveRes.ok) {
        const leaveData = await leaveRes.json()
        setLeaveRequests(leaveData)
      }

      if (availRes.ok) {
        const availData = await availRes.json()
        setAvailability(availData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }, [weekStartStr, weekEndStr, weekStart])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Create plan if needed and save
  const saveDraft = useCallback(async () => {
    if (!state.isDirty) return

    try {
      setSaving(true)
      setError(null)

      let planId = state.plan?.id

      // Create a new plan if none exists OR if the current plan is already published
      if (!planId || state.plan?.status === 'published') {
        const res = await fetch('/api/staff/schedule-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week_start_date: weekStartStr }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to create plan')
        }
        const data = await res.json()
        planId = data.plan.id
      }

      // Build the full list of shifts to create (includes all current grid shifts for new plans)
      let shiftsToCreate = state.pendingChanges.toCreate
      let shiftsToUpdate = state.pendingChanges.toUpdate
      let shiftsToDelete = state.pendingChanges.toDelete.filter((id) => !id.startsWith('temp-'))

      // If we created a new version from a published plan, we need to re-create ALL shifts
      // because the new plan has no shifts yet
      if (state.plan?.status === 'published') {
        shiftsToCreate = state.shifts
          .filter((s) => !s.id.startsWith('temp-'))
          .map((s) => ({
            employee_id: s.employee_id,
            date: s.date,
            shift_type: s.shift_type,
            start_time: s.start_time,
            end_time: s.end_time,
            break_duration_minutes: s.break_duration_minutes,
            is_day_off: ('is_day_off' in s && (s as ShiftWithEmployee & { is_day_off?: boolean }).is_day_off) || false,
            ...(s.second_start_time ? { second_start_time: s.second_start_time, second_end_time: s.second_end_time } : {}),
          }))
        // Also include pending temp shifts
        shiftsToCreate = [...shiftsToCreate, ...state.pendingChanges.toCreate]
        shiftsToUpdate = []
        shiftsToDelete = []
      }

      const res = await fetch(`/api/staff/schedule-plans/${planId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shifts_to_create: shiftsToCreate,
          shifts_to_update: shiftsToUpdate,
          shifts_to_delete: shiftsToDelete,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to sync changes')
      }

      await res.json()

      // Reload plan data
      const planRes = await fetch(`/api/staff/schedule-plans/${planId}`)
      if (planRes.ok) {
        const planData = await planRes.json()
        dispatch({ type: 'MARK_SAVED', plan: planData.plan, shifts: planData.shifts })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [state.isDirty, state.plan, state.pendingChanges, state.shifts, weekStartStr])

  // Publish
  const publish = useCallback(async () => {
    // Save first if dirty (this may create a new draft version)
    if (state.isDirty) await saveDraft()

    // Re-read the plan after potential saveDraft (which may have changed the plan)
    const currentPlanRes = await fetch(`/api/staff/schedule-plans?week_start_date=${weekStartStr}`)
    if (!currentPlanRes.ok) {
      setError('Failed to find plan for publishing')
      return
    }
    const currentPlanData = await currentPlanRes.json()
    const currentPlan = currentPlanData.plan

    if (!currentPlan) {
      setError('No plan found to publish')
      return
    }

    if (currentPlan.status === 'published') {
      // Already published — nothing to do
      dispatch({ type: 'MARK_SAVED', plan: currentPlan, shifts: currentPlanData.shifts || [] })
      return
    }

    try {
      setSaving(true)
      const res = await fetch(`/api/staff/schedule-plans/${currentPlan.id}/publish`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to publish')
      }
      const data = await res.json()

      // Reload shifts for the published plan
      const planRes = await fetch(`/api/staff/schedule-plans/${currentPlan.id}`)
      if (planRes.ok) {
        const planData = await planRes.json()
        dispatch({ type: 'MARK_SAVED', plan: planData.plan, shifts: planData.shifts })
      } else {
        dispatch({ type: 'MARK_SAVED', plan: data.plan, shifts: currentPlanData.shifts || [] })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setSaving(false)
    }
  }, [state.isDirty, weekStartStr, saveDraft])

  // Copy previous week
  const copyPreviousWeek = useCallback(async (sourceWeekStart: string) => {
    try {
      setSaving(true)
      // First find the source plan
      const sourceRes = await fetch(`/api/staff/schedule-plans?week_start_date=${sourceWeekStart}`)
      if (!sourceRes.ok) throw new Error('No plan found for previous week')
      const sourceData = await sourceRes.json()
      if (!sourceData.plan) throw new Error('No plan found for previous week')

      const res = await fetch(`/api/staff/schedule-plans/${sourceData.plan.id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_week_start_date: weekStartStr }),
      })

      if (!res.ok) throw new Error('Failed to copy plan')
      const data = await res.json()
      dispatch({ type: 'LOAD_DATA', plan: data.plan, shifts: data.shifts })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy')
    } finally {
      setSaving(false)
    }
  }, [weekStartStr])

  // Set cell type — merges DB shift_templates with hardcoded config for colors
  const setCellType = useCallback(
    (employeeId: string, date: string, cellType: ScheduleCellType) => {
      const employee = employees.find((e) => e.id === employeeId)
      if (!employee) return
      if (cellType === null) {
        dispatch({ type: 'CLEAR_CELL', employeeId, date })
      } else {
        // Merge shift_templates from DB settings with hardcoded visual config
        const hardcoded = SHIFT_TYPE_CONFIG[cellType]
        const dbTemplate = settings.shift_templates?.[cellType]
        const mergedConfig = dbTemplate
          ? {
              ...hardcoded,
              start: dbTemplate.start || hardcoded.start,
              end: dbTemplate.end || hardcoded.end,
              break: dbTemplate.break ?? hardcoded.break,
              secondStart: dbTemplate.secondStart || hardcoded.secondStart,
              secondEnd: dbTemplate.secondEnd || hardcoded.secondEnd,
            }
          : hardcoded
        dispatch({
          type: 'SET_CELL',
          employeeId,
          date,
          cellType,
          employee,
          _shiftConfig: mergedConfig,
        } as any)
      }
    },
    [employees, settings.shift_templates]
  )

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [])
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [])

  // Build week dates
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      return format(date, 'yyyy-MM-dd')
    })
  }, [weekStart])

  // Build grid rows grouped by department
  const departmentGroups = useMemo((): DepartmentGroup[] => {
    const groups: Record<string, ScheduleGridRow[]> = {}

    for (const employee of employees) {
      const role = employee.profile.role
      if (!groups[role]) groups[role] = []

      const cells: Record<string, ScheduleGridCell> = {}
      let totalHours = 0

      for (const date of weekDates) {
        const shift = state.shifts.find(
          (s) => s.employee_id === employee.id && s.date === date
        )

        let cellType: ScheduleCellType = null
        if (shift) {
          const isDayOff = 'is_day_off' in shift && (shift as ShiftWithEmployee & { is_day_off?: boolean }).is_day_off
          cellType = isDayOff ? 'D' : (SHIFT_TYPE_TO_CELL_TYPE[shift.shift_type] || null)
        }

        // Check leave
        const isOnLeave = leaveRequests.some(
          (lr) => lr.employee_id === employee.id && date >= lr.start_date && date <= lr.end_date
        )

        cells[date] = {
          date,
          shift: shift || null,
          cellType,
          isOnLeave,
          leaveType: isOnLeave
            ? leaveRequests.find(
                (lr) => lr.employee_id === employee.id && date >= lr.start_date && date <= lr.end_date
              )?.leave_type
            : undefined,
          hasViolation: false,
        }

        if (shift && cellType && cellType !== 'D') {
          totalHours += calculateShiftHours(
            shift.start_time,
            shift.end_time,
            shift.break_duration_minutes,
            shift.second_start_time,
            shift.second_end_time,
          )
        }
      }

      groups[role].push({
        employee,
        cells,
        totalHours,
        totalCost: totalHours * employee.hourly_rate,
      })
    }

    // Sort and structure into DepartmentGroup array
    return Object.entries(groups)
      .map(([role, empRows]) => {
        const dept = ROLE_DEPARTMENT_MAP[role as keyof typeof ROLE_DEPARTMENT_MAP] || {
          label: role.toUpperCase(),
          order: 99,
        }
        const totalHours = empRows.reduce((sum, r) => sum + r.totalHours, 0)
        const totalCost = empRows.reduce((sum, r) => sum + r.totalCost, 0)
        return {
          role: role as EmployeeWithProfile['profile']['role'],
          label: dept.label,
          employees: empRows.sort((a, b) =>
            (a.employee.profile.full_name || '').localeCompare(b.employee.profile.full_name || '')
          ),
          totalHours,
          totalCost,
          _order: dept.order,
        }
      })
      .filter((g) => g.employees.length > 0)
      .sort((a, b) => (a as typeof a & { _order: number })._order - (b as typeof b & { _order: number })._order)
  }, [employees, state.shifts, weekDates, leaveRequests])

  // Daily totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, { hours: number; count: number }> = {}
    for (const date of weekDates) {
      let hours = 0
      let count = 0
      for (const shift of state.shifts) {
        if (shift.date === date) {
          const isDayOff = 'is_day_off' in shift && (shift as ShiftWithEmployee & { is_day_off?: boolean }).is_day_off
          if (!isDayOff) {
            hours += calculateShiftHours(shift.start_time, shift.end_time, shift.break_duration_minutes, shift.second_start_time, shift.second_end_time)
            count++
          }
        }
      }
      totals[date] = { hours, count }
    }
    return totals
  }, [state.shifts, weekDates])

  // Validation — uses labor_constraints from restaurant settings (DB)
  const validation = useMemo((): ScheduleValidationResult => {
    if (employees.length === 0) return { valid: true, errors: [], warnings: [] }
    return validateSchedule(state.shifts, employees, leaveRequests, availability, settings.labor_constraints)
  }, [state.shifts, employees, leaveRequests, availability, settings.labor_constraints])

  // Grand total
  const grandTotal = useMemo(() => {
    return {
      hours: Object.values(dailyTotals).reduce((s, d) => s + d.hours, 0),
      cost: departmentGroups.reduce((s, g) => s + g.totalCost, 0),
      employees: new Set(state.shifts.map((s) => s.employee_id)).size,
    }
  }, [dailyTotals, departmentGroups, state.shifts])

  return {
    // State
    plan: state.plan,
    shifts: state.shifts,
    loading: loading || employeesLoading,
    saving,
    error,
    isDirty: state.isDirty,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,

    // Settings from DB
    settings,

    // Derived
    departmentGroups,
    dailyTotals,
    validation,
    grandTotal,
    weekDates,
    employees,

    // Actions
    setCellType,
    saveDraft,
    publish,
    copyPreviousWeek,
    undo,
    redo,
    refetch: fetchData,
  }
}
