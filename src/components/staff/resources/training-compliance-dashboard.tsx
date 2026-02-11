'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useTrainingCompliance } from '@/hooks/use-training-compliance'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Download,
} from 'lucide-react'

export function TrainingComplianceDashboard() {
  const t = useTranslations('resources')
  const tCommon = useTranslations('common')
  const { stats, employeeStatuses, loading, error } = useTrainingCompliance()
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredEmployees = useMemo(() => {
    return employeeStatuses.filter((emp) => {
      if (roleFilter !== 'all' && emp.role !== roleFilter) return false
      if (statusFilter === 'compliant' && !emp.fullyCompliant) return false
      if (statusFilter === 'pending' && emp.fullyCompliant) return false
      if (statusFilter === 'overdue' && emp.overdue === 0) return false
      return true
    })
  }, [employeeStatuses, roleFilter, statusFilter])

  const handleExport = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Training Compliance')

      sheet.columns = [
        { header: 'Employee', key: 'name', width: 25 },
        { header: 'Role', key: 'role', width: 15 },
        { header: 'Required', key: 'totalRequired', width: 12 },
        { header: 'Completed', key: 'completed', width: 12 },
        { header: 'Pending', key: 'pending', width: 12 },
        { header: 'Overdue', key: 'overdue', width: 12 },
        { header: 'Compliant', key: 'compliant', width: 12 },
        { header: 'Last Activity', key: 'lastActivity', width: 20 },
      ]

      filteredEmployees.forEach((emp) => {
        sheet.addRow({
          name: emp.employeeName,
          role: emp.role,
          totalRequired: emp.totalRequired,
          completed: emp.completed,
          pending: emp.pending,
          overdue: emp.overdue,
          compliant: emp.fullyCompliant ? 'Yes' : 'No',
          lastActivity: emp.lastActivity
            ? new Date(emp.lastActivity).toLocaleDateString()
            : '-',
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `training-compliance-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Export failed silently
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="pt-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              <div className="text-2xl font-bold">{stats?.totalMandatory || 0}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('training.totalMandatory')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="text-2xl font-bold">{stats?.completedCount || 0}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('training.completedTraining')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div className="text-2xl font-bold">{stats?.pendingCount || 0}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('training.pendingTraining')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div className="text-2xl font-bold">{stats?.overdueCount || 0}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('training.overdueTraining')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <div className="text-2xl font-bold">{stats?.passRate || 0}%</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('training.passRate')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Export */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('course.allRoles')}</SelectItem>
            <SelectItem value="kitchen">{tCommon('roles.kitchen')}</SelectItem>
            <SelectItem value="bar">{tCommon('roles.bar')}</SelectItem>
            <SelectItem value="waiter">{tCommon('roles.waiter')}</SelectItem>
            <SelectItem value="manager">{tCommon('roles.manager')}</SelectItem>
            <SelectItem value="admin">{tCommon('roles.admin')}</SelectItem>
            <SelectItem value="dj">{tCommon('roles.dj')}</SelectItem>
            <SelectItem value="owner">{tCommon('roles.owner')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('course.allStatuses')}</SelectItem>
            <SelectItem value="compliant">{t('training.fullyCompliant')}</SelectItem>
            <SelectItem value="pending">{t('training.statusPending')}</SelectItem>
            <SelectItem value="overdue">{t('training.statusOverdue')}</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          {t('training.exportReport')}
        </Button>
      </div>

      {/* Employee Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">{t('training.employeeStatus')}</th>
              <th className="text-left p-3 font-medium">{tCommon('roles.label')}</th>
              <th className="text-center p-3 font-medium">{t('training.completedTraining')}</th>
              <th className="text-center p-3 font-medium">{t('training.pendingTraining')}</th>
              <th className="text-center p-3 font-medium">{t('training.overdueTraining')}</th>
              <th className="text-center p-3 font-medium">{t('training.lastActivity')}</th>
              <th className="text-center p-3 font-medium">{t('training.statusPending')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => (
              <tr key={emp.employeeId} className="border-t hover:bg-muted/30">
                <td className="p-3 font-medium">{emp.employeeName}</td>
                <td className="p-3">
                  <Badge variant="outline" className="text-xs">{emp.role}</Badge>
                </td>
                <td className="p-3 text-center text-green-600">{emp.completed}/{emp.totalRequired}</td>
                <td className="p-3 text-center text-orange-600">{emp.pending}</td>
                <td className="p-3 text-center text-red-600">{emp.overdue}</td>
                <td className="p-3 text-center text-muted-foreground text-xs">
                  {emp.lastActivity
                    ? new Date(emp.lastActivity).toLocaleDateString()
                    : '-'}
                </td>
                <td className="p-3 text-center">
                  {emp.fullyCompliant ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('training.fullyCompliant')}
                    </Badge>
                  ) : emp.overdue > 0 ? (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-0">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {t('training.statusOverdue')}
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-0">
                      <Clock className="h-3 w-3 mr-1" />
                      {t('training.statusPending')}
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {t('course.noEmployeesMatch')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
