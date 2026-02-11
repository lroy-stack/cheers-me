'use client'

import { useCallback, useEffect, useState } from 'react'
import { LeaveRequestWithEmployee, LeaveEntitlement, LeaveType, LeaveRequestStatus } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Check, X, Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEmployees } from '@/hooks/use-employees'
import { useTranslations } from 'next-intl'

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  vacation: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  sick_leave: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  personal_day: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  maternity: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  unpaid: 'bg-muted text-foreground dark:bg-muted dark:text-muted-foreground',
}

const LEAVE_TYPE_KEYS: Record<LeaveType, string> = {
  vacation: 'leave.vacation',
  sick_leave: 'leave.sickLeave',
  personal_day: 'leave.personalDay',
  maternity: 'leave.maternity',
  unpaid: 'leave.unpaid',
}

const STATUS_KEYS: Record<LeaveRequestStatus, { key: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { key: 'leave.pending', variant: 'secondary' },
  approved: { key: 'leave.approved', variant: 'default' },
  rejected: { key: 'leave.rejected', variant: 'destructive' },
  cancelled: { key: 'leave.cancelled', variant: 'outline' },
}

export function LeaveManagementView() {
  const t = useTranslations('staff')
  const [requests, setRequests] = useState<LeaveRequestWithEmployee[]>([])
  const [entitlements, setEntitlements] = useState<(LeaveEntitlement & { employee?: { id: string; profile: { full_name: string | null; role: string } } })[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const { employees } = useEmployees(true)

  const currentYear = new Date().getFullYear()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [reqRes, entRes] = await Promise.all([
        fetch(`/api/staff/leave?year=${currentYear}`),
        fetch(`/api/staff/leave/entitlements?year=${currentYear}`),
      ])

      if (reqRes.ok) setRequests(await reqRes.json())
      if (entRes.ok) setEntitlements(await entRes.json())
    } catch (err) {
      console.error('Failed to load leave data:', err)
    } finally {
      setLoading(false)
    }
  }, [currentYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/staff/leave/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error('Failed to approve:', err)
    }
  }

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/staff/leave/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error('Failed to reject:', err)
    }
  }

  const handleCreateRequest = async (data: {
    employee_id: string
    leave_type: LeaveType
    start_date: string
    end_date: string
    total_days: number
    reason: string
  }) => {
    try {
      const res = await fetch('/api/staff/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setShowForm(false)
        fetchData()
      }
    } catch (err) {
      console.error('Failed to create request:', err)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              {t('leave.pendingRequests')}
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('leave.employee')}</TableHead>
                  <TableHead>{t('leave.leaveType')}</TableHead>
                  <TableHead>{t('leave.dates')}</TableHead>
                  <TableHead>{t('leave.totalDays')}</TableHead>
                  <TableHead>{t('leave.reason')}</TableHead>
                  <TableHead className="text-right">{t('leave.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.employee?.profile?.full_name || '-'}
                    </TableCell>
                    <TableCell>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', LEAVE_TYPE_COLORS[req.leave_type])}>
                        {t(LEAVE_TYPE_KEYS[req.leave_type])}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(parseISO(req.start_date), 'dd/MM')} - {format(parseISO(req.end_date), 'dd/MM')}
                    </TableCell>
                    <TableCell>{req.total_days}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {req.reason || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleApprove(req.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => handleReject(req.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{t('leave.leaveRequests')} — {currentYear}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('leave.newRequest')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('leave.noRequests')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('leave.employee')}</TableHead>
                  <TableHead>{t('leave.leaveType')}</TableHead>
                  <TableHead>{t('leave.dates')}</TableHead>
                  <TableHead>{t('leave.totalDays')}</TableHead>
                  <TableHead>{t('leave.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const statusInfo = STATUS_KEYS[req.status]
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">
                        {req.employee?.profile?.full_name || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', LEAVE_TYPE_COLORS[req.leave_type])}>
                          {t(LEAVE_TYPE_KEYS[req.leave_type])}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(parseISO(req.start_date), 'dd/MM/yy')} - {format(parseISO(req.end_date), 'dd/MM/yy')}
                      </TableCell>
                      <TableCell>{req.total_days}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{t(statusInfo.key)}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Entitlements */}
      {entitlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('leave.leaveEntitlements')} — {currentYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('leave.employee')}</TableHead>
                  <TableHead>{t('leave.leaveType')}</TableHead>
                  <TableHead className="text-right">{t('leave.totalDays')}</TableHead>
                  <TableHead className="text-right">{t('leave.used')}</TableHead>
                  <TableHead className="text-right">{t('leave.remaining')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entitlements.map((ent) => (
                  <TableRow key={ent.id}>
                    <TableCell className="font-medium">
                      {(ent as typeof ent & { employee?: { profile: { full_name: string | null } } }).employee?.profile?.full_name || '-'}
                    </TableCell>
                    <TableCell>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', LEAVE_TYPE_COLORS[ent.leave_type])}>
                        {t(LEAVE_TYPE_KEYS[ent.leave_type])}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{ent.total_days}</TableCell>
                    <TableCell className="text-right">{ent.used_days}</TableCell>
                    <TableCell className="text-right font-medium">
                      {ent.total_days - ent.used_days}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Request Dialog */}
      <LeaveRequestForm
        open={showForm}
        onOpenChange={setShowForm}
        employees={employees}
        onSubmit={handleCreateRequest}
      />
    </div>
  )
}

function LeaveRequestForm({
  open,
  onOpenChange,
  employees,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: { id: string; profile: { full_name: string | null; role: string } }[]
  onSubmit: (data: { employee_id: string; leave_type: LeaveType; start_date: string; end_date: string; total_days: number; reason: string }) => void
}) {
  const t = useTranslations('staff')
  const [employeeId, setEmployeeId] = useState('')
  const [leaveType, setLeaveType] = useState<LeaveType>('vacation')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  const totalDays = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 0

  const handleSubmit = () => {
    if (!employeeId || !startDate || !endDate) return
    onSubmit({
      employee_id: employeeId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      reason,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('leave.newLeaveRequest')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('leave.employee')}</Label>
            <Select onValueChange={setEmployeeId} value={employeeId}>
              <SelectTrigger>
                <SelectValue placeholder={t('leave.selectEmployee')} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.profile.full_name || emp.profile.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('leave.leaveType')}</Label>
            <Select onValueChange={(v) => setLeaveType(v as LeaveType)} value={leaveType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LEAVE_TYPE_KEYS) as LeaveType[]).map((key) => (
                  <SelectItem key={key} value={key}>{t(LEAVE_TYPE_KEYS[key])}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('leave.startDate')}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>{t('leave.endDate')}</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          {totalDays > 0 && (
            <p className="text-sm text-muted-foreground">{t('leave.days', { count: totalDays })}</p>
          )}
          <div>
            <Label>{t('leave.reason')}</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('leave.reasonPlaceholder')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('leave.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!employeeId || !startDate || !endDate}>
            {t('leave.submitRequest')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
