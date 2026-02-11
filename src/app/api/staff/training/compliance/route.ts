import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()

  // Get all employees
  const { data: employees } = await supabase
    .from('employees')
    .select(`
      id,
      profile:profiles(
        id,
        full_name,
        role
      )
    `)
    .eq('employment_status', 'active')

  // Get all assignments (the source of truth for compliance)
  const { data: assignments } = await supabase
    .from('training_assignments')
    .select('*')

  // Build per-employee compliance status based on assignments only
  const employeeStatuses = (employees || []).map((emp) => {
    const profileArr = emp.profile as unknown as Array<{ id: string; full_name: string | null; role: string }>
    const profile = Array.isArray(profileArr) ? profileArr[0] : profileArr as unknown as { id: string; full_name: string | null; role: string }
    const empRole = profile?.role || ''

    // Only count assignments for this employee
    const empAssignments = (assignments || []).filter((a) => a.assigned_to === emp.id)

    const totalRequired = empAssignments.length
    const completed = empAssignments.filter((a) => a.status === 'completed').length
    const overdue = empAssignments.filter((a) => a.status === 'overdue').length
    const pending = empAssignments.filter((a) => a.status === 'pending').length

    // Last activity from assignments
    const sortedAssignments = [...empAssignments].sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    const lastActivity = sortedAssignments[0]?.updated_at || null

    return {
      employeeId: emp.id,
      employeeName: profile?.full_name || 'Unknown',
      role: empRole,
      totalRequired,
      completed,
      pending,
      overdue,
      lastActivity,
      fullyCompliant: totalRequired > 0 ? completed >= totalRequired : false,
    }
  })

  // Aggregate stats
  const totalCompleted = employeeStatuses.reduce((sum, e) => sum + e.completed, 0)
  const totalPending = employeeStatuses.reduce((sum, e) => sum + e.pending, 0)
  const totalOverdue = employeeStatuses.reduce((sum, e) => sum + e.overdue, 0)
  const totalRequired = employeeStatuses.reduce((sum, e) => sum + e.totalRequired, 0)
  const passRate = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0

  return NextResponse.json({
    stats: {
      totalMandatory: totalRequired,
      completedCount: totalCompleted,
      pendingCount: totalPending,
      overdueCount: totalOverdue,
      passRate,
    },
    employeeStatuses,
  })
}
