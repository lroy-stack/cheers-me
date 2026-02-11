'use client'

import { useEffect, useState, useCallback } from 'react'
import { ShiftWithEmployee, CreateShiftRequest, UpdateShiftRequest } from '@/types'

interface UseShiftsOptions {
  employeeId?: string
  startDate?: string
  endDate?: string
  status?: string
  autoFetch?: boolean
}

export function useShifts(options: UseShiftsOptions = {}) {
  const { employeeId, startDate, endDate, status, autoFetch = true } = options
  const [shifts, setShifts] = useState<ShiftWithEmployee[]>([])
  const [loading, setLoading] = useState(autoFetch)
  const [error, setError] = useState<string | null>(null)

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (employeeId) params.append('employee_id', employeeId)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      if (status) params.append('status', status)

      const response = await fetch(`/api/staff/shifts?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch shifts')
      }

      const data = await response.json()
      setShifts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [employeeId, startDate, endDate, status])

  useEffect(() => {
    if (autoFetch) {
      fetchShifts()
    }
  }, [autoFetch, fetchShifts])

  const createShift = async (shiftData: CreateShiftRequest): Promise<ShiftWithEmployee> => {
    const response = await fetch('/api/staff/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shiftData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create shift')
    }

    const newShift = await response.json()
    setShifts((prev) => [...prev, newShift])
    return newShift
  }

  const updateShift = async (
    shiftId: string,
    updates: UpdateShiftRequest
  ): Promise<ShiftWithEmployee> => {
    const response = await fetch(`/api/staff/shifts/${shiftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update shift')
    }

    const updatedShift = await response.json()
    setShifts((prev) =>
      prev.map((shift) => (shift.id === shiftId ? updatedShift : shift))
    )
    return updatedShift
  }

  const deleteShift = async (shiftId: string): Promise<void> => {
    const response = await fetch(`/api/staff/shifts/${shiftId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete shift')
    }

    setShifts((prev) => prev.filter((shift) => shift.id !== shiftId))
  }

  return {
    shifts,
    loading,
    error,
    refetch: fetchShifts,
    createShift,
    updateShift,
    deleteShift,
  }
}
