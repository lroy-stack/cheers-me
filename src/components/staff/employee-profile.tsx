'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { EmployeeWithProfile } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { EmployeeForm } from './employee-form'
import { ClockHistory } from './clock-history'
import { EmployeeCertifications } from './employee-certifications'
import {
  ArrowLeft,
  Pencil,
  PhoneCall,
  MessageCircle,
  Mail,
  Clock,
  Calendar,
  Star,
  Briefcase,
  Shield,
  User,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'

interface EmployeeSummary {
  weekHours: number
  monthHours: number
  totalShifts: number
  avgRating: number | null
  totalSurveys: number
}

interface ShiftRecord {
  id: string
  date: string
  shift_type: string
  start_time: string
  end_time: string
  break_duration_minutes: number
  notes: string | null
}

interface SurveyRecord {
  id: string
  rating: number
  feedback: string | null
  responded_at: string
  anomaly_type: string | null
  ai_analysis: {
    sentiment: string
    summary: string
  } | null
  manager_reviewed: boolean
}

const roleColors: Record<string, string> = {
  admin: 'bg-red-500 text-white',
  manager: 'bg-blue-500 text-white',
  kitchen: 'bg-orange-500 text-white',
  bar: 'bg-green-500 text-white',
  waiter: 'bg-purple-500 text-white',
  dj: 'bg-pink-500 text-white',
  owner: 'bg-primary text-primary-foreground',
}

const contractTypeLabels: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  casual: 'Casual',
  contractor: 'Contractor',
}

const jornadaLabels: Record<string, string> = {
  completa: 'Full-time',
  parcial: 'Part-time',
  flexible: 'Flexible',
}

const statusLabels: Record<string, string> = {
  active: 'Active',
  terminated: 'Terminated',
  on_leave: 'On Leave',
  suspended: 'Suspended',
}

const EMOJI_RATINGS = ['', '😡', '😕', '😐', '🙂', '😄']

interface EmployeeProfileProps {
  employeeId: string
}

export function EmployeeProfile({ employeeId }: EmployeeProfileProps) {
  const router = useRouter()
  const t = useTranslations('staff')
  const [employee, setEmployee] = useState<EmployeeWithProfile | null>(null)
  const [summary, setSummary] = useState<EmployeeSummary | null>(null)
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [surveys, setSurveys] = useState<SurveyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [certOpen, setCertOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [employeeId])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [empRes, summaryRes] = await Promise.all([
        fetch(`/api/staff/employees/${employeeId}`),
        fetch(`/api/staff/employees/${employeeId}/summary`),
      ])

      if (!empRes.ok) {
        setError(empRes.status === 404 ? 'not_found' : 'error')
        setLoading(false)
        return
      }

      const empData = await empRes.json()
      setEmployee(empData)

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        setSummary(summaryData)
      }

      // Fetch shifts and surveys in parallel
      const todayDate = new Date().toISOString().split('T')[0]
      const twoWeeksFromNow = new Date()
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)
      const twoWeeksDate = twoWeeksFromNow.toISOString().split('T')[0]

      const [shiftsRes, surveysRes] = await Promise.all([
        fetch(`/api/staff/shifts?employee_id=${employeeId}&start_date=${todayDate}&end_date=${twoWeeksDate}`),
        fetch(`/api/staff/surveys?employee_id=${employeeId}`),
      ])

      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json()
        setShifts(Array.isArray(shiftsData) ? shiftsData : [])
      }

      if (surveysRes.ok) {
        const surveysData = await surveysRes.json()
        setSurveys(surveysData.surveys || [])
      }
    } catch {
      setError('error')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push('/staff')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('profile.backToStaff')}
        </Button>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold">{t('profile.notFound')}</h2>
            <p className="text-muted-foreground mt-2">{t('profile.notFoundDesc')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push('/staff')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('profile.backToStaff')}
      </Button>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.profile.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {getInitials(employee.profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-2xl font-bold">
                  {employee.profile.full_name || 'Unnamed'}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={roleColors[employee.profile.role]}>
                    {employee.profile.role}
                  </Badge>
                  <Badge variant={employee.employment_status === 'active' ? 'default' : 'secondary'}>
                    {statusLabels[employee.employment_status]}
                  </Badge>
                </div>
              </div>
              {employee.job_title && (
                <p className="text-muted-foreground mt-1">{employee.job_title}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                {employee.profile.phone && (
                  <span className="flex items-center gap-1">
                    <PhoneCall className="h-3.5 w-3.5" />
                    {employee.profile.phone}
                  </span>
                )}
                {employee.profile.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {employee.profile.email}
                  </span>
                )}
              </div>
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {t('profile.editEmployee')}
                </Button>
                {employee.profile.phone && (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${employee.profile.phone}`}>
                        <PhoneCall className="mr-1.5 h-3.5 w-3.5" />
                        {t('employees.call')}
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={`https://wa.me/${employee.profile.phone.replace(/[^0-9+]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div className="text-2xl font-bold">
                {summary ? `${summary.weekHours}h` : '—'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('profile.weekHours')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div className="text-2xl font-bold">
                {summary ? `${summary.monthHours}h` : '—'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('profile.monthHours')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div className="text-2xl font-bold">
                {summary?.avgRating !== null && summary?.avgRating !== undefined
                  ? `${summary.avgRating}/5 ${EMOJI_RATINGS[Math.round(summary.avgRating)] || ''}`
                  : t('profile.noRating')}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('profile.avgRating')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div className="text-2xl font-bold">
                {summary ? summary.totalShifts : '—'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('profile.upcomingShifts')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="details">
            <Briefcase className="h-4 w-4 mr-1.5 hidden sm:inline" />
            {t('profile.details')}
          </TabsTrigger>
          <TabsTrigger value="hours">
            <Clock className="h-4 w-4 mr-1.5 hidden sm:inline" />
            {t('profile.hours')}
          </TabsTrigger>
          <TabsTrigger value="shifts">
            <Calendar className="h-4 w-4 mr-1.5 hidden sm:inline" />
            {t('profile.shifts')}
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <Star className="h-4 w-4 mr-1.5 hidden sm:inline" />
            {t('profile.feedback')}
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <div className="space-y-4">
            {/* Contract Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="h-4 w-4" />
                  {t('profile.contractInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <InfoRow label={t('employees.contractType')} value={contractTypeLabels[employee.contract_type]} />
                  <InfoRow label={t('employees.hourlyRate')} value={`€${employee.hourly_rate.toFixed(2)}/h`} />
                  {employee.gross_salary && (
                    <InfoRow label={t('profile.grossSalary')} value={`€${employee.gross_salary.toFixed(2)}`} />
                  )}
                  {employee.weekly_hours_target && (
                    <InfoRow label={t('profile.weeklyTarget')} value={`${employee.weekly_hours_target}h`} />
                  )}
                  {employee.date_hired && (
                    <InfoRow label={t('profile.hiredDate')} value={format(new Date(employee.date_hired), 'dd/MM/yyyy')} />
                  )}
                  {employee.contract_end_date && (
                    <InfoRow label={t('profile.contractEnd')} value={format(new Date(employee.contract_end_date), 'dd/MM/yyyy')} />
                  )}
                  <InfoRow label={t('profile.status')} value={statusLabels[employee.employment_status]} />
                </div>
              </CardContent>
            </Card>

            {/* Spanish Labor Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  {t('profile.laborDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {employee.convenio_colectivo && (
                    <InfoRow label={t('profile.convenio')} value={employee.convenio_colectivo} />
                  )}
                  {employee.categoria_profesional && (
                    <InfoRow label={t('profile.categoria')} value={employee.categoria_profesional} />
                  )}
                  <InfoRow label={t('profile.jornada')} value={jornadaLabels[employee.tipo_jornada]} />
                  {employee.irpf_retention !== null && employee.irpf_retention !== undefined && (
                    <InfoRow label={t('profile.irpf')} value={`${employee.irpf_retention}%`} />
                  )}
                  {employee.social_security_number && (
                    <InfoRow label={t('profile.socialSecurity')} value={employee.social_security_number} />
                  )}
                  {employee.periodo_prueba_end && (
                    <InfoRow label={t('profile.trialEnd')} value={format(new Date(employee.periodo_prueba_end), 'dd/MM/yyyy')} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  {t('profile.emergencyContact')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {employee.profile.emergency_contact ? (
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{employee.profile.emergency_contact}</p>
                    {employee.profile.emergency_phone && (
                      <p className="text-muted-foreground">{employee.profile.emergency_phone}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('profile.noEmergencyContact')}</p>
                )}
              </CardContent>
            </Card>

            {/* Certifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {t('profile.certifications')}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setCertOpen(true)}>
                    {t('profile.viewAll')}
                  </Button>
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        {/* Hours Tab */}
        <TabsContent value="hours">
          <ClockHistory employeeId={employeeId} limit={30} />
        </TabsContent>

        {/* Shifts Tab */}
        <TabsContent value="shifts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('profile.scheduledShifts')}</CardTitle>
            </CardHeader>
            <CardContent>
              {shifts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t('profile.noShifts')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {format(new Date(shift.date), 'EEE, MMM d')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                        </p>
                      </div>
                      <Badge variant="outline">{shift.shift_type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('profile.surveyResponses')}
                {summary && summary.totalSurveys > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({summary.totalSurveys})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {surveys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t('profile.noFeedback')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {surveys.slice(0, 20).map((survey) => (
                    <div
                      key={survey.id}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                    >
                      <div className="text-2xl">{EMOJI_RATINGS[survey.rating] || '😐'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={survey.rating <= 2 ? 'destructive' : survey.rating >= 4 ? 'default' : 'secondary'}
                          >
                            {survey.rating}/5
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(survey.responded_at), 'MMM d, HH:mm')}
                          </span>
                          {survey.anomaly_type && (
                            <Badge variant="outline">{survey.anomaly_type}</Badge>
                          )}
                          {!survey.manager_reviewed && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                              Unreviewed
                            </Badge>
                          )}
                        </div>
                        {survey.feedback && (
                          <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                            {survey.feedback}
                          </p>
                        )}
                        {survey.ai_analysis?.summary && (
                          <p className="text-xs mt-1 text-muted-foreground italic">
                            {survey.ai_analysis.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Employee Form Sheet */}
      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={employee}
        onSuccess={() => {
          setFormOpen(false)
          fetchData()
        }}
      />

      {/* Certifications Dialog */}
      {certOpen && (
        <EmployeeCertifications
          employeeId={employeeId}
          employeeName={employee.profile.full_name || 'Employee'}
          open={certOpen}
          onOpenChange={setCertOpen}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
