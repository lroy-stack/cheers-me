'use client'

import { useState } from 'react'
import { EmployeeWithProfile } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  MoreHorizontal,
  Search,
  Pencil,
  Trash2,
  Calendar,
  MessageCircle,
  Mail,
  PhoneCall,
  Share2,
  Award,
} from 'lucide-react'
import { EmployeeCertifications } from './employee-certifications'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

interface EmployeeListProps {
  employees: EmployeeWithProfile[]
  onEdit?: (employee: EmployeeWithProfile) => void
  onDelete?: (employee: EmployeeWithProfile) => void
  onShareSchedule?: (employee: EmployeeWithProfile) => void
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

export function EmployeeList({ employees, onEdit, onDelete, onShareSchedule }: EmployeeListProps) {
  const t = useTranslations('staff')
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [certEmployee, setCertEmployee] = useState<EmployeeWithProfile | null>(null)

  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase()
    return (
      emp.profile.full_name?.toLowerCase().includes(query) ||
      emp.profile.email.toLowerCase().includes(query) ||
      emp.profile.role.toLowerCase().includes(query)
    )
  })

  const getInitials = (name: string | null) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('employees.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredEmployees.length} {filteredEmployees.length !== 1 ? t('employees.employeesCount') : t('employees.employeeCount')}
        </div>
      </div>

      {/* Desktop Table View - hidden on mobile */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">{t('employees.name')}</TableHead>
              <TableHead>{t('employees.role')}</TableHead>
              <TableHead>{t('employees.contractType')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('employees.phone')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('employees.startDate')}</TableHead>
              <TableHead className="text-right">{t('employees.hourlyRate')}</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t('employees.noEmployees')}
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/staff/employees/${employee.id}`)}
                >
                  {/* Employee Name & Avatar */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={employee.profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(employee.profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-primary hover:underline">
                          {employee.profile.full_name || 'Unnamed'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {employee.profile.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    <Badge variant="secondary" className={roleColors[employee.profile.role]}>
                      {employee.profile.role}
                    </Badge>
                  </TableCell>

                  {/* Contract Type */}
                  <TableCell>
                    <span className="text-sm">
                      {contractTypeLabels[employee.contract_type]}
                    </span>
                  </TableCell>

                  {/* Contact (hidden on mobile) */}
                  <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-1 text-xs">
                      {employee.profile.phone ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${employee.profile.phone}`}
                            className="text-muted-foreground hover:text-foreground"
                            title={t('employees.call')}
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/${employee.profile.phone.replace(/[^0-9+]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-green-600"
                            title={t('employees.whatsapp')}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                          {employee.profile.email && (
                            <a
                              href={`mailto:${employee.profile.email}`}
                              className="text-muted-foreground hover:text-blue-600"
                              title={t('employees.sendEmail')}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <span className="text-xs">{employee.profile.phone}</span>
                        </div>
                      ) : employee.profile.email ? (
                        <a
                          href={`mailto:${employee.profile.email}`}
                          className="flex items-center gap-1 text-muted-foreground hover:text-blue-600"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>{employee.profile.email}</span>
                        </a>
                      ) : null}
                      {employee.profile.emergency_contact && (
                        <div className="text-muted-foreground">
                          {t('employees.emergency', { contact: employee.profile.emergency_contact })}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Hired Date (hidden on mobile/tablet) */}
                  <TableCell className="hidden lg:table-cell">
                    {employee.date_hired ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{format(new Date(employee.date_hired), 'MMM d, yyyy')}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  {/* Hourly Rate */}
                  <TableCell className="text-right font-medium">
                    €{employee.hourly_rate.toFixed(2)}/h
                  </TableCell>

                  {/* Actions */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">{t('employees.openMenu')}</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('employees.actions')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit?.(employee)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t('employees.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {employee.profile.phone && (
                          <DropdownMenuItem asChild>
                            <a href={`tel:${employee.profile.phone}`}>
                              <PhoneCall className="mr-2 h-4 w-4" />
                              {t('employees.call')}
                            </a>
                          </DropdownMenuItem>
                        )}
                        {employee.profile.phone && (
                          <DropdownMenuItem asChild>
                            <a
                              href={`https://wa.me/${employee.profile.phone.replace(/[^0-9+]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="mr-2 h-4 w-4" />
                              {t('employees.whatsapp')}
                            </a>
                          </DropdownMenuItem>
                        )}
                        {employee.profile.email && (
                          <DropdownMenuItem asChild>
                            <a href={`mailto:${employee.profile.email}`}>
                              <Mail className="mr-2 h-4 w-4" />
                              {t('employees.sendEmail')}
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onShareSchedule?.(employee)}>
                          <Share2 className="mr-2 h-4 w-4" />
                          {t('employees.shareSchedule')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setCertEmployee(employee)}>
                          <Award className="mr-2 h-4 w-4" />
                          {t('employees.certifications')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete?.(employee)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('employees.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View - shown only on mobile */}
      <div className="block md:hidden space-y-3">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('employees.noEmployees')}
          </div>
        ) : (
          filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4"
            >
              {/* Header: Avatar, Name, Role */}
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => router.push(`/staff/employees/${employee.id}`)}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={employee.profile.avatar_url || undefined} />
                  <AvatarFallback className="text-sm">
                    {getInitials(employee.profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-primary hover:underline truncate">
                    {employee.profile.full_name || 'Unnamed'}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {employee.profile.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className={roleColors[employee.profile.role]}>
                      {employee.profile.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {contractTypeLabels[employee.contract_type]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Actions */}
              {employee.profile.phone && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <a
                    href={`tel:${employee.profile.phone}`}
                    className="flex items-center justify-center gap-2 flex-1 h-11 rounded-md border border-border bg-background text-foreground hover:bg-muted text-sm font-medium"
                  >
                    <PhoneCall className="h-4 w-4" />
                    {t('employees.call')}
                  </a>
                  <a
                    href={`https://wa.me/${employee.profile.phone.replace(/[^0-9+]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 flex-1 h-11 rounded-md border border-border bg-background text-foreground hover:bg-muted text-sm font-medium"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                </div>
              )}

              {/* Details */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('employees.hourlyRate')}</span>
                  <span className="text-sm font-semibold text-foreground">
                    €{employee.hourly_rate.toFixed(2)}/h
                  </span>
                </div>
                {employee.date_hired && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('employees.startDate')}</span>
                    <span className="text-sm text-foreground">
                      {format(new Date(employee.date_hired), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions Menu */}
              <div className="pt-2 border-t border-border">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full h-11">
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      {t('employees.actions')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{t('employees.actions')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit?.(employee)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t('employees.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {employee.profile.email && (
                      <DropdownMenuItem asChild>
                        <a href={`mailto:${employee.profile.email}`}>
                          <Mail className="mr-2 h-4 w-4" />
                          {t('employees.sendEmail')}
                        </a>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onShareSchedule?.(employee)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      {t('employees.shareSchedule')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCertEmployee(employee)}>
                      <Award className="mr-2 h-4 w-4" />
                      {t('employees.certifications')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete?.(employee)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('employees.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Employee Certifications Dialog */}
      {certEmployee && (
        <EmployeeCertifications
          employeeId={certEmployee.id}
          employeeName={certEmployee.profile.full_name || 'Employee'}
          open={!!certEmployee}
          onOpenChange={(open) => { if (!open) setCertEmployee(null) }}
        />
      )}
    </div>
  )
}
