'use client'

import { useEffect, useState } from 'react'
import { EmployeeWithProfile, UserRole } from '@/types'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Key, Copy, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface EmployeeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: EmployeeWithProfile | null
  onSuccess?: () => void
}

export function EmployeeForm({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EmployeeFormProps) {
  const { toast } = useToast()
  const t = useTranslations('staff')
  const [loading, setLoading] = useState(false)

  const roles: { value: UserRole; labelKey: string }[] = [
    { value: 'admin', labelKey: 'employees.adminRole' },
    { value: 'manager', labelKey: 'employees.managerRole' },
    { value: 'kitchen', labelKey: 'employees.kitchenRole' },
    { value: 'bar', labelKey: 'employees.barRole' },
    { value: 'waiter', labelKey: 'employees.waiterRole' },
    { value: 'dj', labelKey: 'employees.djRole' },
    { value: 'owner', labelKey: 'employees.ownerRole' },
  ]

  const contractTypes = [
    { value: 'full_time', labelKey: 'employees.fullTimeLabel' },
    { value: 'part_time', labelKey: 'employees.partTimeLabel' },
    { value: 'casual', labelKey: 'employees.casualLabel' },
    { value: 'contractor', labelKey: 'employees.contractorLabel' },
  ]

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'waiter' as UserRole,
    phone: '',
    hourly_rate: '',
    contract_type: 'part_time',
    date_hired: '',
    emergency_contact: '',
    emergency_phone: '',
    kiosk_pin: '',
    // New fields
    gross_salary: '',
    weekly_hours_target: '',
    irpf_retention: '',
    social_security_number: '',
    convenio_colectivo: '',
    categoria_profesional: '',
    tipo_jornada: 'completa',
    periodo_prueba_end: '',
    job_title: '',
    contract_end_date: '',
    employment_status: 'active',
  })

  // Reset form when employee changes or dialog closes
  useEffect(() => {
    if (employee) {
      setFormData({
        email: employee.profile.email,
        password: '',
        full_name: employee.profile.full_name || '',
        role: employee.profile.role,
        phone: employee.profile.phone || '',
        hourly_rate: employee.hourly_rate.toString(),
        contract_type: employee.contract_type,
        date_hired: employee.date_hired || '',
        emergency_contact: employee.profile.emergency_contact || '',
        emergency_phone: employee.profile.emergency_phone || '',
        kiosk_pin: '',
        gross_salary: employee.gross_salary?.toString() || '',
        weekly_hours_target: employee.weekly_hours_target?.toString() || '',
        irpf_retention: employee.irpf_retention?.toString() || '',
        social_security_number: employee.social_security_number || '',
        convenio_colectivo: employee.convenio_colectivo || '',
        categoria_profesional: employee.categoria_profesional || '',
        tipo_jornada: employee.tipo_jornada || 'completa',
        periodo_prueba_end: employee.periodo_prueba_end || '',
        job_title: employee.job_title || '',
        contract_end_date: employee.contract_end_date || '',
        employment_status: employee.employment_status || 'active',
      })
    } else {
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'waiter',
        phone: '',
        hourly_rate: '',
        contract_type: 'part_time',
        date_hired: '',
        emergency_contact: '',
        emergency_phone: '',
        kiosk_pin: '',
        gross_salary: '',
        weekly_hours_target: '',
        irpf_retention: '',
        social_security_number: '',
        convenio_colectivo: '',
        categoria_profesional: '',
        tipo_jornada: 'completa',
        periodo_prueba_end: '',
        job_title: '',
        contract_end_date: '',
        employment_status: 'active',
      })
    }
  }, [employee, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (employee) {
        // Update existing employee
        const res = await fetch(`/api/staff/employees/${employee.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hourly_rate: parseFloat(formData.hourly_rate),
            contract_type: formData.contract_type,
            date_hired: formData.date_hired || null,
            gross_salary: formData.gross_salary ? parseFloat(formData.gross_salary) : null,
            weekly_hours_target: formData.weekly_hours_target ? parseFloat(formData.weekly_hours_target) : null,
            irpf_retention: formData.irpf_retention ? parseFloat(formData.irpf_retention) : null,
            social_security_number: formData.social_security_number || null,
            convenio_colectivo: formData.convenio_colectivo || null,
            categoria_profesional: formData.categoria_profesional || null,
            tipo_jornada: formData.tipo_jornada,
            periodo_prueba_end: formData.periodo_prueba_end || null,
            job_title: formData.job_title || null,
            contract_end_date: formData.contract_end_date || null,
            employment_status: formData.employment_status,
            profile: {
              full_name: formData.full_name,
              phone: formData.phone || null,
              role: formData.role,
              emergency_contact: formData.emergency_contact || null,
              emergency_phone: formData.emergency_phone || null,
            },
          }),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Failed to update employee')
        }

        toast({
          title: 'Success',
          description: 'Employee updated successfully',
        })

        onOpenChange(false)
        onSuccess?.()
      } else {
        // Create new employee (sign up + create employee record)
        const signUpResponse = await fetch('/api/auth/sign-up', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role,
            phone: formData.phone || undefined,
            language: 'en',
          }),
        })

        if (!signUpResponse.ok) {
          const error = await signUpResponse.json()
          throw new Error(error.error || 'Failed to create user')
        }

        const { user } = await signUpResponse.json()

        // Create employee record
        const employeeResponse = await fetch('/api/staff/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile_id: user.id,
            hourly_rate: parseFloat(formData.hourly_rate),
            contract_type: formData.contract_type,
            date_hired: formData.date_hired || undefined,
            job_title: formData.job_title || null,
            gross_salary: formData.gross_salary ? parseFloat(formData.gross_salary) : null,
            weekly_hours_target: formData.weekly_hours_target ? parseFloat(formData.weekly_hours_target) : null,
            contract_end_date: formData.contract_end_date || null,
            irpf_retention: formData.irpf_retention ? parseFloat(formData.irpf_retention) : null,
            social_security_number: formData.social_security_number || null,
            convenio_colectivo: formData.convenio_colectivo || null,
            categoria_profesional: formData.categoria_profesional || null,
            tipo_jornada: formData.tipo_jornada,
            periodo_prueba_end: formData.periodo_prueba_end || null,
          }),
        })

        if (!employeeResponse.ok) {
          const error = await employeeResponse.json()
          throw new Error(error.error || 'Failed to create employee')
        }

        const newEmployeeData = await employeeResponse.json()

        if (formData.kiosk_pin.length === 4) {
          const pinRes = await fetch(`/api/staff/employees/${newEmployeeData.id}/pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: formData.kiosk_pin }),
          })
          if (!pinRes.ok) {
            const pinError = await pinRes.json()
            toast({
              variant: 'destructive',
              title: t('employees.pinWarning'),
              description: pinError.error,
            })
          }
        }

        toast({
          title: 'Success',
          description: 'Employee added successfully',
        })

        onOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{employee ? t('employees.editEmployee') : t('employees.addEmployee')}</SheetTitle>
          <SheetDescription>
            {employee
              ? t('employees.updateDesc')
              : t('employees.createDesc')}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">{t('employees.basicInfo')}</h3>

            <div className="space-y-2">
              <Label htmlFor="full_name">{t('employees.name')} *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('employees.email')} *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading || !!employee}
              />
            </div>

            {!employee && (
              <div className="space-y-2">
                <Label htmlFor="password">{t('employees.password')} *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={loading}
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  {t('employees.minChars')}
                </p>
              </div>
            )}

            {!employee && (
              <div className="space-y-2">
                <Label htmlFor="kiosk_pin">
                  {t('employees.kioskPin')}{' '}
                  <span className="text-muted-foreground text-xs">({t('employees.optional')})</span>
                </Label>
                <Input
                  id="kiosk_pin"
                  value={formData.kiosk_pin}
                  onChange={(e) =>
                    setFormData({ ...formData, kiosk_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })
                  }
                  placeholder="0000"
                  maxLength={4}
                  className="font-mono w-32"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">{t('employees.pinCreateHint')}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">{t('employees.role')} *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as UserRole })
                }
                disabled={loading}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {t(role.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('employees.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={loading}
                placeholder="+34 XXX XXX XXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_title">{t('employees.jobTitle')}</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Contract Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">{t('employees.contractDetails')}</h3>

            <div className="space-y-2">
              <Label htmlFor="contract_type">{t('employees.contractType')} *</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, contract_type: value })
                }
                disabled={loading}
              >
                <SelectTrigger id="contract_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(type.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly_rate">{t('employees.hourlyRate')} (€) *</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.hourly_rate}
                onChange={(e) =>
                  setFormData({ ...formData, hourly_rate: e.target.value })
                }
                required
                disabled={loading}
                placeholder="15.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_hired">{t('employees.startDate')}</Label>
              <Input
                id="date_hired"
                type="date"
                value={formData.date_hired}
                onChange={(e) =>
                  setFormData({ ...formData, date_hired: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_end_date">{t('employees.contractEndDate')}</Label>
              <Input
                id="contract_end_date"
                type="date"
                value={formData.contract_end_date}
                onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                disabled={loading}
              />
            </div>
            {employee && (
              <div className="space-y-2">
                <Label htmlFor="employment_status">{t('employees.employmentStatus')}</Label>
                <Select
                  value={formData.employment_status}
                  onValueChange={(value) => setFormData({ ...formData, employment_status: value })}
                  disabled={loading}
                >
                  <SelectTrigger id="employment_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('employees.active')}</SelectItem>
                    <SelectItem value="terminated">{t('employees.inactive')}</SelectItem>
                    <SelectItem value="on_leave">{t('schedule.onLeave')}</SelectItem>
                    <SelectItem value="suspended">{t('employees.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Salary & Compensation */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">{t('employees.salaryCompensation')}</h3>

            <div className="space-y-2">
              <Label htmlFor="gross_salary">{t('employees.grossSalary')} (€)</Label>
              <Input
                id="gross_salary"
                type="number"
                step="0.01"
                min="0"
                value={formData.gross_salary}
                onChange={(e) => setFormData({ ...formData, gross_salary: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekly_hours_target">{t('employees.weeklyHoursTarget')}</Label>
              <Input
                id="weekly_hours_target"
                type="number"
                step="0.5"
                min="0"
                max="60"
                value={formData.weekly_hours_target}
                onChange={(e) => setFormData({ ...formData, weekly_hours_target: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="irpf_retention">{t('employees.irpfRetention')}</Label>
              <Input
                id="irpf_retention"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.irpf_retention}
                onChange={(e) => setFormData({ ...formData, irpf_retention: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Spanish Labor Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">{t('employees.spanishLaborDetails')}</h3>

            <div className="space-y-2">
              <Label htmlFor="social_security_number">{t('employees.socialSecurityNumber')}</Label>
              <Input
                id="social_security_number"
                value={formData.social_security_number}
                onChange={(e) => setFormData({ ...formData, social_security_number: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="convenio_colectivo">{t('employees.convenioColectivo')}</Label>
              <Input
                id="convenio_colectivo"
                value={formData.convenio_colectivo}
                onChange={(e) => setFormData({ ...formData, convenio_colectivo: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria_profesional">{t('employees.categoriaProfesional')}</Label>
              <Input
                id="categoria_profesional"
                value={formData.categoria_profesional}
                onChange={(e) => setFormData({ ...formData, categoria_profesional: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_jornada">{t('employees.tipoJornada')}</Label>
              <Select
                value={formData.tipo_jornada}
                onValueChange={(value) => setFormData({ ...formData, tipo_jornada: value })}
                disabled={loading}
              >
                <SelectTrigger id="tipo_jornada">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completa">{t('employees.jornadaCompleta')}</SelectItem>
                  <SelectItem value="parcial">{t('employees.jornadaParcial')}</SelectItem>
                  <SelectItem value="flexible">{t('employees.jornadaFlexible')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodo_prueba_end">{t('employees.periodoPrueba')}</Label>
              <Input
                id="periodo_prueba_end"
                type="date"
                value={formData.periodo_prueba_end}
                onChange={(e) => setFormData({ ...formData, periodo_prueba_end: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Kiosk PIN — only in edit mode */}
          {employee && <KioskPinSection employeeId={employee.id} hasPin={!!employee.kiosk_pin} />}

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">{t('employees.emergencyContact')}</h3>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact">{t('employees.contactName')}</Label>
              <Input
                id="emergency_contact"
                value={formData.emergency_contact}
                onChange={(e) =>
                  setFormData({ ...formData, emergency_contact: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_phone">{t('employees.contactPhone')}</Label>
              <Input
                id="emergency_phone"
                type="tel"
                value={formData.emergency_phone}
                onChange={(e) =>
                  setFormData({ ...formData, emergency_phone: e.target.value })
                }
                disabled={loading}
                placeholder="+34 XXX XXX XXX"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              {t('employees.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {employee ? t('employees.update') : t('employees.create')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ----- Kiosk PIN sub-component -----
function KioskPinSection({ employeeId, hasPin }: { employeeId: string; hasPin: boolean }) {
  const t = useTranslations('staff')
  const { toast } = useToast()
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [generatedPin, setGeneratedPin] = useState<string | null>(null)
  const [customPin, setCustomPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [currentHasPin, setCurrentHasPin] = useState(hasPin)

  async function generatePin(customValue?: string) {
    setPinLoading(true)
    try {
      const body: Record<string, string> = {}
      if (customValue) body.pin = customValue

      const res = await fetch(`/api/staff/employees/${employeeId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.error === 'PIN too weak') {
          toast({ variant: 'destructive', title: t('employees.weakPin') })
        } else if (data.error === 'PIN already in use') {
          toast({ variant: 'destructive', title: t('employees.pinInUse') })
        } else {
          throw new Error(data.error)
        }
        return
      }

      const { pin } = await res.json()
      setGeneratedPin(pin)
      setCurrentHasPin(true)
      setPinDialogOpen(true)
      toast({ title: t('employees.pinGenerated') })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed',
      })
    } finally {
      setPinLoading(false)
    }
  }

  async function revokePin() {
    setPinLoading(true)
    try {
      const res = await fetch(`/api/staff/employees/${employeeId}/pin`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to revoke PIN')

      setCurrentHasPin(false)
      setGeneratedPin(null)
      toast({ title: t('employees.pinRevoked') })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed',
      })
    } finally {
      setPinLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Key className="h-4 w-4" />
        {t('employees.kioskPin')}
      </h3>

      <div className="flex items-center gap-3">
        <Badge variant={currentHasPin ? 'default' : 'secondary'}>
          {currentHasPin ? `${t('employees.pinAssigned')}: ****` : t('employees.noPin')}
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => generatePin()}
          disabled={pinLoading}
        >
          {pinLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          {t('employees.generatePin')}
        </Button>

        {currentHasPin && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={revokePin}
            disabled={pinLoading}
            className="text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            {t('employees.revokePin')}
          </Button>
        )}
      </div>

      {/* Custom PIN input */}
      <div className="flex gap-2 items-end">
        <div className="space-y-1 flex-1">
          <Label htmlFor="custom_pin" className="text-xs">{t('employees.customPin')}</Label>
          <Input
            id="custom_pin"
            value={customPin}
            onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            maxLength={4}
            className="font-mono"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (customPin.length === 4) generatePin(customPin)
          }}
          disabled={pinLoading || customPin.length !== 4}
        >
          {t('employees.generatePin')}
        </Button>
      </div>

      {/* PIN reveal dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('employees.pinDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('employees.pinDialogMessage', { pin: generatedPin || '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            <span className="text-5xl font-mono font-bold tracking-[0.5em]">
              {generatedPin}
            </span>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (generatedPin) navigator.clipboard.writeText(generatedPin)
                toast({ title: 'Copied!' })
              }}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button onClick={() => setPinDialogOpen(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
