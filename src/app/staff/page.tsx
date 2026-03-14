'use client'

import { useState } from 'react'
import { useEmployees } from '@/hooks/use-employees'
import { EmployeeList } from '@/components/staff/employee-list'
import { EmployeeForm } from '@/components/staff/employee-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
  Calendar,
} from 'lucide-react'
import { EmployeeWithProfile } from '@/types'
import { useTranslations } from 'next-intl'
import { useAuthContext } from '@/components/providers/auth-provider'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export default function StaffPage() {
  const { profile } = useAuthContext()
  const router = useRouter()

  // Only admin, manager, owner can access employees page
  if (profile && !['admin', 'manager', 'owner'].includes(profile.role)) {
    router.replace('/dashboard')
    return null
  }
  const { employees, loading, error, refetch } = useEmployees(true)
  const { toast } = useToast()
  const t = useTranslations('staff')
  const [formOpen, setFormOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithProfile | null>(
    null
  )
  const [deleteTarget, setDeleteTarget] = useState<EmployeeWithProfile | null>(null)

  const handleEdit = (employee: EmployeeWithProfile) => {
    setSelectedEmployee(employee)
    setFormOpen(true)
  }

  const handleShareSchedule = (employee: EmployeeWithProfile) => {
    const scheduleUrl = `${window.location.origin}/staff/schedule`
    const message = `Hi ${employee.profile.full_name || ''}, check your schedule: ${scheduleUrl}`
    if (employee.profile.phone) {
      const phone = employee.profile.phone.replace(/[^0-9+]/g, '')
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    } else if (employee.profile.email) {
      window.location.href = `mailto:${employee.profile.email}?subject=Your Schedule&body=${encodeURIComponent(message)}`
    }
  }

  const handleDeleteRequest = (employee: EmployeeWithProfile) => {
    setDeleteTarget(employee)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/staff/employees/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast({ title: t('employees.deleted'), description: t('employees.deletedDescription') })
      refetch()
    } catch {
      toast({ title: t('employees.deleteError'), variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleFormClose = (open: boolean) => {
    if (!open) {
      setSelectedEmployee(null)
    }
    setFormOpen(open)
  }

  const handleSuccess = () => {
    refetch()
  }

  // Calculate stats
  const totalEmployees = employees.length
  const averageRate =
    employees.length > 0
      ? employees.reduce((sum, emp) => sum + emp.hourly_rate, 0) / employees.length
      : 0
  const fullTimeCount = employees.filter((emp) => emp.contract_type === 'full_time')
    .length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('employees.manageDesc')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/staff/schedule">
            <Button variant="outline" size="lg">
              <Calendar className="mr-2 h-5 w-5" />
              {t('schedule.title')}
            </Button>
          </Link>
          <Button
            onClick={() => {
              setSelectedEmployee(null)
              setFormOpen(true)
            }}
            size="lg"
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Plus className="mr-2 h-5 w-5" />
            {t('employees.addEmployee')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Employees */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div className="text-2xl font-bold">{totalEmployees}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('employees.active')} {t('employees.title')}
              </p>
            </CardContent>
          </Card>

          {/* Full-time Staff */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-success" />
                <div className="text-2xl font-bold">{fullTimeCount}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('employees.fullTime')}</p>
            </CardContent>
          </Card>

          {/* Average Rate */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">€{averageRate.toFixed(2)}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('employees.hourlyRate')}</p>
            </CardContent>
          </Card>

          {/* Placeholder for future stat */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div className="text-2xl font-bold">—</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('employees.shiftsThisWeek')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/15 dark:bg-destructive/15">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive dark:text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-medium">{t('employees.failedToLoad')}</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee List */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmployeeList
              employees={employees}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              onShareSchedule={handleShareSchedule}
            />
          )}
        </CardContent>
      </Card>

      {/* Employee Form Sheet */}
      <EmployeeForm
        open={formOpen}
        onOpenChange={handleFormClose}
        employee={selectedEmployee}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title={t('employees.deleteConfirm')}
        description={t('employees.deleteConfirmDescription', { name: deleteTarget?.profile.full_name || '' })}
        confirmLabel={t('employees.delete')}
        cancelLabel={t('employees.cancel')}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}
