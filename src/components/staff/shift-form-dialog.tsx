'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ShiftWithEmployee, EmployeeWithProfile, CreateShiftRequest } from '@/types'
import { useShiftTemplates } from '@/hooks/use-shift-templates'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

const shiftFormSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  shift_type: z.enum(['morning', 'afternoon', 'night', 'split']),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  break_duration_minutes: z.coerce.number().min(0).max(180),
  notes: z.string().optional(),
})

type ShiftFormValues = z.infer<typeof shiftFormSchema>

interface ShiftFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift?: ShiftWithEmployee | null
  defaultDate?: string
  employees: EmployeeWithProfile[]
  onSubmit: (data: CreateShiftRequest) => Promise<void>
}

export function ShiftFormDialog({
  open,
  onOpenChange,
  shift,
  defaultDate,
  employees,
  onSubmit,
}: ShiftFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const t = useTranslations('staff')
  const { templates } = useShiftTemplates()

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      employee_id: '',
      date: defaultDate || new Date().toISOString().split('T')[0],
      shift_type: 'morning',
      start_time: '10:30',
      end_time: '17:00',
      break_duration_minutes: 30,
      notes: '',
    },
  })

  // Update form when shift changes (for editing)
  useEffect(() => {
    if (shift) {
      form.reset({
        employee_id: shift.employee_id,
        date: shift.date,
        shift_type: shift.shift_type,
        start_time: shift.start_time.slice(0, 5), // Remove seconds
        end_time: shift.end_time.slice(0, 5),
        break_duration_minutes: shift.break_duration_minutes,
        notes: shift.notes || '',
      })
    } else if (defaultDate) {
      form.setValue('date', defaultDate)
    }
  }, [shift, defaultDate, form])

  // Apply shift template
  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      form.setValue('shift_type', template.shift_type as 'morning' | 'afternoon' | 'night' | 'split')
      form.setValue('start_time', template.start_time.slice(0, 5))
      form.setValue('end_time', template.end_time.slice(0, 5))
      form.setValue('break_duration_minutes', template.break_duration_minutes)
    }
  }

  const handleSubmit = async (data: ShiftFormValues) => {
    try {
      setLoading(true)
      await onSubmit(data)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Failed to save shift:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{shift ? t('schedule.editShift') : t('schedule.addShift')}</DialogTitle>
          <DialogDescription>
            {shift
              ? t('schedule.updateDesc')
              : t('schedule.createDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Employee Selection */}
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('schedule.employee')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('schedule.selectEmployee')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.profile.full_name || employee.profile.email}
                          {' · '}
                          <Badge variant="outline" className="ml-1 text-xs">
                            {employee.profile.role}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('schedule.date')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Shift Type & Template */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="shift_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('schedule.shiftType')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="morning">{t('schedule.morning')}</SelectItem>
                        <SelectItem value="afternoon">{t('schedule.afternoon')}</SelectItem>
                        <SelectItem value="night">{t('schedule.night')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">{t('schedule.template')}</label>
                <Select onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('schedule.applyTemplate')} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t('schedule.quickApplyTimes')}</p>
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('schedule.startTime')}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('schedule.endTime')}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Break Duration */}
            <FormField
              control={form.control}
              name="break_duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('schedule.break')}</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="180" step="15" {...field} />
                  </FormControl>
                  <FormDescription>{t('schedule.unpaidBreak')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('schedule.notes')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('schedule.specialInstructions')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                {t('schedule.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {shift ? t('schedule.editShift') : t('schedule.addShift')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
