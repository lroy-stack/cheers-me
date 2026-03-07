'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { CalendarOff, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

type LeaveType = 'vacation' | 'sick_leave' | 'personal_day' | 'maternity' | 'unpaid'
type LeaveStatus = 'pending' | 'approved' | 'rejected'

interface LeaveRequest {
  id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  total_days: number
  reason?: string
  status: LeaveStatus
  created_at: string
}

interface MyLeaveRequestsProps {
  employeeId: string
}

export function MyLeaveRequests({ employeeId }: MyLeaveRequestsProps) {
  const t = useTranslations('staff.mySchedule')
  const { toast } = useToast()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [leaveType, setLeaveType] = useState<LeaveType>('vacation')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  const totalDays =
    startDate && endDate
      ? Math.max(1, differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1)
      : 0

  async function fetchRequests() {
    setLoading(true)
    try {
      const res = await fetch(`/api/staff/leave?employee_id=${employeeId}`)
      if (res.ok) {
        const data = await res.json()
        setRequests(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  async function handleSubmit() {
    if (!startDate || !endDate || totalDays < 1) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/staff/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          reason: reason || undefined,
        }),
      })

      if (res.ok) {
        toast({ title: t('leaveSubmitted') })
        setDialogOpen(false)
        setStartDate('')
        setEndDate('')
        setReason('')
        setLeaveType('vacation')
        fetchRequests()
      } else {
        toast({ title: t('leaveError'), variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const statusVariant: Record<LeaveStatus, 'default' | 'secondary' | 'destructive'> = {
    pending: 'secondary',
    approved: 'default',
    rejected: 'destructive',
  }

  const leaveTypeLabel: Record<LeaveType, string> = {
    vacation: t('leaveTypeVacation'),
    sick_leave: t('leaveTypeSick'),
    personal_day: t('leaveTypePersonal'),
    maternity: t('leaveTypeMaternity'),
    unpaid: t('leaveTypeUnpaid'),
  }

  const statusLabel: Record<LeaveStatus, string> = {
    pending: t('statusPending'),
    approved: t('statusApproved'),
    rejected: t('statusRejected'),
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('leaveTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('leaveSubtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('newLeaveRequest')}
        </Button>
      </div>

      {/* Leave requests list */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarOff className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t('noLeaveRequests')}</p>
            <Button className="mt-4" size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('newLeaveRequest')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      {leaveTypeLabel[req.leave_type]}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(req.start_date), 'dd MMM yyyy')} →{' '}
                      {format(parseISO(req.end_date), 'dd MMM yyyy')}{' '}
                      <span className="font-medium">({req.total_days}d)</span>
                    </p>
                  </div>
                  <Badge variant={statusVariant[req.status]} className="shrink-0 text-xs">
                    {statusLabel[req.status]}
                  </Badge>
                </div>
              </CardHeader>
              {req.reason && (
                <CardContent className="py-2 px-4">
                  <p className="text-xs text-muted-foreground">{req.reason}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* New Leave Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('newLeaveRequest')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Leave type */}
            <div className="space-y-1.5">
              <Label>{t('leaveType')}</Label>
              <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">{t('leaveTypeVacation')}</SelectItem>
                  <SelectItem value="sick_leave">{t('leaveTypeSick')}</SelectItem>
                  <SelectItem value="personal_day">{t('leaveTypePersonal')}</SelectItem>
                  <SelectItem value="maternity">{t('leaveTypeMaternity')}</SelectItem>
                  <SelectItem value="unpaid">{t('leaveTypeUnpaid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('startDate')}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('endDate')}</Label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Total days indicator */}
            {totalDays > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('totalDays')}: <span className="font-semibold text-foreground">{totalDays}</span>
              </p>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <Label>{t('reason')}</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('cancelRequest')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!startDate || !endDate || totalDays < 1 || submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('submitRequest')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
