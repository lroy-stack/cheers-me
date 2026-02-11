'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import type { FloorSection, ZoneAssignment, FloorTable, EmployeeWithProfile } from '@/types'
import { FloorPlanSVG } from '@/components/staff/zones/floor-plan-svg'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Save, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface TaskPlanningZoneBarProps {
  sections: FloorSection[]
  employees: EmployeeWithProfile[]
  weekStart: string
  weekDates: string[]
  selectedZoneId?: string | null
  onZoneClick?: (sectionId: string) => void
}

export function TaskPlanningZoneBar({
  sections,
  employees,
  weekStart,
  weekDates,
  selectedZoneId,
  onZoneClick,
}: TaskPlanningZoneBarProps) {
  const t = useTranslations('staff')
  const [tables, setTables] = useState<FloorTable[]>([])
  const [assignments, setAssignments] = useState<ZoneAssignment[]>([])
  const [shiftFilter, setShiftFilter] = useState<'morning' | 'afternoon' | 'night'>('morning')
  const [selectedDate, setSelectedDate] = useState(weekDates[0] || weekStart)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pending local changes: sectionId -> employeeIds
  const [pendingAssignments, setPendingAssignments] = useState<Map<string, string[]>>(new Map())

  // i18n day labels
  const dayLabels = useMemo(() => [
    t('taskPlanning.dayMon'), t('taskPlanning.dayTue'), t('taskPlanning.dayWed'),
    t('taskPlanning.dayThu'), t('taskPlanning.dayFri'), t('taskPlanning.daySat'), t('taskPlanning.daySun'),
  ], [t])

  // Load tables once
  useEffect(() => {
    fetch('/api/tables')
      .then(res => res.ok ? res.json() : [])
      .then(data => setTables(Array.isArray(data) ? data : data.tables || []))
      .catch(() => {})
  }, [])

  // Load assignments when date/shift changes
  useEffect(() => {
    if (!selectedDate) return
    const load = async () => {
      try {
        const res = await fetch(
          `/api/staff/zones/assignments?date=${selectedDate}&shift_type=${shiftFilter}`
        )
        if (res.ok) {
          const data = await res.json()
          const list: ZoneAssignment[] = Array.isArray(data) ? data : []
          setAssignments(list)
          // Init pending from loaded
          const pending = new Map<string, string[]>()
          for (const a of list) {
            if (!pending.has(a.section_id)) pending.set(a.section_id, [])
            pending.get(a.section_id)!.push(a.employee_id)
          }
          setPendingAssignments(pending)
        }
      } catch {
        // Silently fail
      }
    }
    load()
  }, [selectedDate, shiftFilter])

  // Build SVG assignment data from pending state
  const svgAssignments: ZoneAssignment[] = useMemo(() => {
    const result: ZoneAssignment[] = []
    for (const [sectionId, empIds] of pendingAssignments) {
      for (const empId of empIds) {
        const emp = employees.find(e => e.id === empId)
        result.push({
          id: `pending-${sectionId}-${empId}`,
          section_id: sectionId,
          employee_id: empId,
          assignment_date: selectedDate,
          shift_type: shiftFilter,
          created_at: '',
          updated_at: '',
          employee: emp ? {
            id: empId,
            profile: {
              id: emp.profile.id,
              full_name: emp.profile.full_name,
              role: emp.profile.role,
            },
          } as ZoneAssignment['employee'] : undefined,
        } as ZoneAssignment)
      }
    }
    return result
  }, [pendingAssignments, employees, selectedDate, shiftFilter])

  // Employees already assigned
  const assignedEmployeeIds = useMemo(() => {
    const set = new Set<string>()
    for (const empIds of pendingAssignments.values()) {
      for (const id of empIds) set.add(id)
    }
    return set
  }, [pendingAssignments])

  // Available employees (not assigned to any zone for this date/shift)
  const availableEmployees = useMemo(
    () => employees.filter(e => !assignedEmployeeIds.has(e.id)),
    [employees, assignedEmployeeIds]
  )

  const getEmployeeName = useCallback((empId: string) => {
    const emp = employees.find(e => e.id === empId)
    return emp?.profile?.full_name || empId.slice(0, 8)
  }, [employees])

  const assignEmployee = useCallback((sectionId: string, employeeId: string) => {
    setPendingAssignments(prev => {
      const next = new Map(prev)
      const current = next.get(sectionId) || []
      if (!current.includes(employeeId)) {
        next.set(sectionId, [...current, employeeId])
      }
      return next
    })
  }, [])

  const removeAssignment = useCallback((sectionId: string, employeeId: string) => {
    setPendingAssignments(prev => {
      const next = new Map(prev)
      const current = next.get(sectionId) || []
      next.set(sectionId, current.filter(id => id !== employeeId))
      return next
    })
  }, [])

  const saveAssignments = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const assignmentList: Array<{ section_id: string; employee_id: string }> = []
      for (const [sectionId, empIds] of pendingAssignments) {
        for (const empId of empIds) {
          assignmentList.push({ section_id: sectionId, employee_id: empId })
        }
      }

      const res = await fetch('/api/staff/zones/assignments/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          shift_type: shiftFilter,
          assignments: assignmentList,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }))
        throw new Error(err.error)
      }

      const data = await res.json()
      setAssignments(data.assignments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [pendingAssignments, selectedDate, shiftFilter])

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    const savedMap = new Map<string, Set<string>>()
    for (const a of assignments) {
      if (!savedMap.has(a.section_id)) savedMap.set(a.section_id, new Set())
      savedMap.get(a.section_id)!.add(a.employee_id)
    }
    for (const [sectionId, empIds] of pendingAssignments) {
      const saved = savedMap.get(sectionId)
      if (!saved && empIds.length > 0) return true
      if (saved && saved.size !== empIds.length) return true
      if (saved) {
        for (const id of empIds) {
          if (!saved.has(id)) return true
        }
      }
    }
    for (const [sectionId, saved] of savedMap) {
      const pending = pendingAssignments.get(sectionId)
      if (!pending && saved.size > 0) return true
    }
    return false
  }, [assignments, pendingAssignments])

  const shifts = [
    { key: 'morning' as const, label: t('taskPlanning.shiftMorning'), short: 'M' },
    { key: 'afternoon' as const, label: t('taskPlanning.shiftAfternoon'), short: 'T' },
    { key: 'night' as const, label: t('taskPlanning.shiftNight'), short: 'N' },
  ]

  const activeSections = sections.filter(s => s.is_active)

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {/* Header: title + date + shift + save */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t('taskPlanning.zoneAssignment')}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date selector (days of the week) */}
          <div className="flex items-center gap-1">
            {weekDates.map((date, i) => (
              <Button
                key={date}
                variant={selectedDate === date ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-8 p-0 text-xs"
                onClick={() => setSelectedDate(date)}
              >
                {dayLabels[i]?.slice(0, 2)}
              </Button>
            ))}
          </div>

          {/* Shift selector */}
          <div className="flex items-center gap-1 border-l pl-2">
            {shifts.map((s) => (
              <Button
                key={s.key}
                variant={shiftFilter === s.key ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-8 p-0 text-xs"
                onClick={() => setShiftFilter(s.key)}
              >
                {s.short}
              </Button>
            ))}
          </div>

          {/* Save */}
          <Button
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={saveAssignments}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            {t('taskPlanning.saveDraft')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 rounded px-2 py-1">
          {error}
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_320px]">
        {/* Floor plan — full height */}
        {tables.length > 0 && (
          <div className="overflow-hidden rounded-md border min-h-[250px]">
            <FloorPlanSVG
              sections={sections}
              tables={tables}
              assignments={svgAssignments}
              interactive
              selectedSectionId={selectedZoneId}
              onSectionClick={onZoneClick}
              className="h-[250px] sm:h-[300px] lg:h-[350px]"
            />
          </div>
        )}

        {/* Assignment panel — no scroll constraint */}
        <div className="space-y-2">
          {activeSections.map((section) => {
            const empIds = pendingAssignments.get(section.id) || []
            return (
              <div key={section.id} className="space-y-1 p-2 rounded border bg-muted/30">
                <div className="text-xs font-medium">{section.name}</div>
                {empIds.length === 0 ? (
                  <div className="text-xs text-muted-foreground/60 italic">
                    {t('taskPlanning.noAssignment')}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {empIds.map(empId => (
                      <Badge key={empId} variant="secondary" className="text-xs gap-1 pr-1">
                        {getEmployeeName(empId)}
                        <button
                          onClick={() => removeAssignment(section.id, empId)}
                          className="hover:text-destructive ml-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {/* Assign dropdown */}
                {availableEmployees.length > 0 && (
                  <select
                    className="w-full text-xs border rounded px-1.5 py-1 bg-background"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) assignEmployee(section.id, e.target.value)
                    }}
                  >
                    <option value="">+ {t('taskPlanning.assignEmployee')}</option>
                    {availableEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.profile?.full_name || emp.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )
          })}

          {/* Available employees */}
          {availableEmployees.length > 0 && (
            <div className="p-2 rounded border bg-muted/10">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {t('taskPlanning.availableEmployees', { count: availableEmployees.length })}
              </div>
              <div className="flex flex-wrap gap-1">
                {availableEmployees.map(emp => (
                  <Badge key={emp.id} variant="outline" className="text-xs">
                    {emp.profile?.full_name || emp.id.slice(0, 8)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zone summary badges */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {activeSections.map((section) => {
          const empIds = pendingAssignments.get(section.id) || []
          const isSelected = selectedZoneId === section.id

          return (
            <Badge
              key={section.id}
              variant={isSelected ? 'default' : 'outline'}
              className="cursor-pointer text-xs py-1 px-2"
              onClick={() => onZoneClick?.(section.id)}
            >
              {section.name}: {empIds.length > 0
                ? empIds.map(id => getEmployeeName(id)).join(', ')
                : '—'}
            </Badge>
          )
        })}
      </div>
    </div>
  )
}
