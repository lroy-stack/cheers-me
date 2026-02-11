'use client'

import { useRef } from 'react'
import { useZoneAssignments } from '@/hooks/use-zone-assignments'
import { useEmployees } from '@/hooks/use-employees'
import { FloorPlanSVG } from './floor-plan-svg'
import { downloadFloorPlan } from '@/lib/utils/floor-plan-export'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Save, Download, X, MapPin, Users } from 'lucide-react'
import type { ZoneAssignment } from '@/types'

export function ZoneAssignmentView() {
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const {
    sections,
    tables,
    assignments: _assignments,
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
  } = useZoneAssignments()

  const { employees } = useEmployees(true)

  const handleDownload = async (format: 'svg' | 'png') => {
    const svgEl = svgContainerRef.current?.querySelector('svg')
    if (svgEl) {
      await downloadFloorPlan(svgEl, format, `zones-${selectedDate}-${selectedShift}`)
    }
  }

  // Get employee name by id
  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id)
    return emp?.profile?.full_name || id.slice(0, 8)
  }

  // Build assignment data for SVG (with employee info)
  const svgAssignments: ZoneAssignment[] = []
  for (const [sectionId, employeeIds] of pendingAssignments) {
    for (const empId of employeeIds) {
      svgAssignments.push({
        id: `pending-${sectionId}-${empId}`,
        section_id: sectionId,
        employee_id: empId,
        assignment_date: selectedDate,
        shift_type: selectedShift,
        created_at: '',
        updated_at: '',
        employee: {
          id: empId,
          profile: {
            id: empId,
            full_name: getEmployeeName(empId),
            role: 'waiter',
          },
        } as ZoneAssignment['employee'],
      })
    }
  }

  // Employees not assigned to any zone
  const assignedEmployeeIds = new Set<string>()
  for (const empIds of pendingAssignments.values()) {
    for (const id of empIds) assignedEmployeeIds.add(id)
  }
  const availableEmployees = employees.filter(e => !assignedEmployeeIds.has(e.id))

  const shiftOptions = [
    { value: 'morning' as const, label: 'M' },
    { value: 'afternoon' as const, label: 'T' },
    { value: 'night' as const, label: 'N' },
  ]

  if (loading && sections.length === 0) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="w-40"
        />
        <div className="flex rounded-md border">
          {shiftOptions.map(opt => (
            <Button
              key={opt.value}
              variant={selectedShift === opt.value ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none first:rounded-l-md last:rounded-r-md"
              onClick={() => setSelectedShift(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <Button onClick={saveAssignments} disabled={saving} size="sm" className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleDownload('png')} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          PNG
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleDownload('svg')} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          SVG
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Main layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Floor Plan */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              Floor Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={svgContainerRef}>
              <FloorPlanSVG
                sections={sections}
                tables={tables}
                assignments={svgAssignments}
                interactive
                onSectionClick={(sectionId) => {
                  // Open a section selector - for now just highlight
                  console.log('Section clicked:', sectionId)
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Assignment Panel */}
        <div className="space-y-3">
          {/* Current Assignments by Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Zone Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sections.filter(s => s.is_active).map(section => {
                const empIds = pendingAssignments.get(section.id) || []
                return (
                  <div key={section.id} className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">{section.name}</div>
                    {empIds.length === 0 ? (
                      <div className="text-xs text-muted-foreground/60 italic">No one assigned</div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {empIds.map(empId => (
                          <Badge key={empId} variant="secondary" className="text-xs gap-1">
                            {getEmployeeName(empId)}
                            <button onClick={() => removeAssignment(section.id, empId)} className="hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    {/* Quick assign dropdown */}
                    {availableEmployees.length > 0 && (
                      <select
                        className="w-full text-xs border rounded px-1.5 py-1 bg-background"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) assignEmployee(section.id, e.target.value)
                        }}
                      >
                        <option value="">+ Assign employee...</option>
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
            </CardContent>
          </Card>

          {/* Available Employees */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">
                Available ({availableEmployees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {availableEmployees.map(emp => (
                  <Badge key={emp.id} variant="outline" className="text-xs">
                    {emp.profile?.full_name || emp.id.slice(0, 8)}
                  </Badge>
                ))}
                {availableEmployees.length === 0 && (
                  <div className="text-xs text-muted-foreground italic">All assigned</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
