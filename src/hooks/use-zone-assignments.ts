'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ZoneAssignment, FloorSection, FloorTable } from '@/types'

interface UseZoneAssignmentsReturn {
  sections: FloorSection[]
  tables: FloorTable[]
  assignments: ZoneAssignment[]
  loading: boolean
  saving: boolean
  error: string | null
  selectedDate: string
  selectedShift: 'morning' | 'afternoon' | 'night'
  setSelectedDate: (date: string) => void
  setSelectedShift: (shift: 'morning' | 'afternoon' | 'night') => void
  assignEmployee: (sectionId: string, employeeId: string) => void
  removeAssignment: (sectionId: string, employeeId: string) => void
  saveAssignments: () => Promise<void>
  pendingAssignments: Map<string, string[]>  // sectionId -> employeeIds
}

export function useZoneAssignments(): UseZoneAssignmentsReturn {
  const [sections, setSections] = useState<FloorSection[]>([])
  const [tables, setTables] = useState<FloorTable[]>([])
  const [assignments, setAssignments] = useState<ZoneAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Default to today
  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon' | 'night'>('morning')

  // Pending changes (local state before save)
  const [pendingAssignments, setPendingAssignments] = useState<Map<string, string[]>>(new Map())

  // Load floor plan data
  useEffect(() => {
    const loadFloorPlan = async () => {
      try {
        const [sectionsRes, tablesRes] = await Promise.all([
          fetch('/api/floor-sections'),
          fetch('/api/tables'),
        ])

        if (sectionsRes.ok) {
          const data = await sectionsRes.json()
          setSections(Array.isArray(data) ? data : data.sections || [])
        }
        if (tablesRes.ok) {
          const data = await tablesRes.json()
          setTables(Array.isArray(data) ? data : data.tables || [])
        }
      } catch {
        setError('Failed to load floor plan')
      }
    }
    loadFloorPlan()
  }, [])

  // Load assignments when date/shift changes
  useEffect(() => {
    const loadAssignments = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/staff/zones/assignments?date=${selectedDate}&shift_type=${selectedShift}`
        )
        if (res.ok) {
          const data = await res.json()
          setAssignments(data || [])
          // Initialize pending state from existing assignments
          const pending = new Map<string, string[]>()
          for (const a of (data || []) as ZoneAssignment[]) {
            if (!pending.has(a.section_id)) pending.set(a.section_id, [])
            pending.get(a.section_id)!.push(a.employee_id)
          }
          setPendingAssignments(pending)
        }
      } catch {
        setError('Failed to load assignments')
      } finally {
        setLoading(false)
      }
    }
    loadAssignments()
  }, [selectedDate, selectedShift])

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
      for (const [sectionId, employeeIds] of pendingAssignments) {
        for (const employeeId of employeeIds) {
          assignmentList.push({ section_id: sectionId, employee_id: employeeId })
        }
      }

      const res = await fetch('/api/staff/zones/assignments/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          shift_type: selectedShift,
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
  }, [pendingAssignments, selectedDate, selectedShift])

  return {
    sections,
    tables,
    assignments,
    loading,
    saving,
    error,
    selectedDate,
    selectedShift,
    setSelectedDate,
    setSelectedShift,
    assignEmployee,
    removeAssignment,
    saveAssignments,
    pendingAssignments,
  }
}
