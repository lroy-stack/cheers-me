'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PlannedTask, EmployeeWithProfile, FloorSection, StaffTaskTemplate } from '@/types'
import { useTranslations } from 'next-intl'

interface TaskPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: PlannedTask | null
  dayOfWeek?: number
  employees: EmployeeWithProfile[]
  sections: FloorSection[]
  templates: StaffTaskTemplate[]
  onSave: (data: Partial<PlannedTask> & { title: string; day_of_week: number }) => void
}

export function TaskPlanDialog({
  open,
  onOpenChange,
  task,
  dayOfWeek = 0,
  employees,
  sections,
  templates,
  onSave,
}: TaskPlanDialogProps) {
  const t = useTranslations('staff')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [assignedRole, setAssignedRole] = useState<string>('')
  const [priority, setPriority] = useState<string>('medium')
  const [shiftType, setShiftType] = useState<string>('')
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>('')
  const [sectionId, setSectionId] = useState<string>('')
  const [templateId, setTemplateId] = useState<string>('')

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title)
        setDescription(task.description || '')
        setAssignedTo(task.assigned_to || '')
        setAssignedRole(task.assigned_role || '')
        setPriority(task.priority)
        setShiftType(task.shift_type || '')
        setEstimatedMinutes(task.estimated_minutes?.toString() || '')
        setSectionId(task.section_id || '')
        setTemplateId(task.template_id || '')
      } else {
        setTitle('')
        setDescription('')
        setAssignedTo('')
        setAssignedRole('')
        setPriority('medium')
        setShiftType('')
        setEstimatedMinutes('')
        setSectionId('')
        setTemplateId('')
      }
    }
  }, [open, task])

  const handleTemplateSelect = (tid: string) => {
    setTemplateId(tid)
    const tmpl = templates.find(t => t.id === tid)
    if (tmpl) {
      setTitle(tmpl.title)
      setDescription(tmpl.description || '')
      setPriority(tmpl.default_priority || 'medium')
      setAssignedRole(tmpl.default_assigned_role || '')
      setEstimatedMinutes(tmpl.estimated_minutes?.toString() || '')
    }
  }

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      description: description || undefined,
      assigned_to: assignedTo || undefined,
      assigned_role: assignedRole || undefined,
      day_of_week: task?.day_of_week ?? dayOfWeek,
      shift_type: (shiftType || undefined) as PlannedTask['shift_type'],
      priority: priority as PlannedTask['priority'],
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
      section_id: sectionId || undefined,
      template_id: templateId || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? t('taskPlanning.editTask') : t('taskPlanning.addTask')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Template selector */}
          {!task && templates.length > 0 && (
            <div>
              <Label className="text-xs">{t('tasks.fromTemplate')}</Label>
              <Select value={templateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t('tasks.selectTemplate')} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(tmpl => (
                    <SelectItem key={tmpl.id} value={tmpl.id} className="text-xs">
                      {tmpl.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs">{t('tasks.taskTitle')} *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('tasks.titlePlaceholder')}
              className="h-8 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs">{t('tasks.description')}</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('tasks.descriptionPlaceholder')}
              rows={2}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t('tasks.priority')}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('taskPlanning.priorityLow')}</SelectItem>
                  <SelectItem value="medium">{t('taskPlanning.priorityMedium')}</SelectItem>
                  <SelectItem value="high">{t('taskPlanning.priorityHigh')}</SelectItem>
                  <SelectItem value="urgent">{t('taskPlanning.priorityUrgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">{t('schedule.shiftType')}</Label>
              <Select value={shiftType} onValueChange={setShiftType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">{t('taskPlanning.shiftMorning')}</SelectItem>
                  <SelectItem value="afternoon">{t('taskPlanning.shiftAfternoon')}</SelectItem>
                  <SelectItem value="night">{t('taskPlanning.shiftNight')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t('tasks.assignTo')}</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t('tasks.selectEmployee')} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      {emp.profile?.full_name || emp.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">{t('tasks.estimatedMinutes')}</Label>
              <Input
                type="number"
                value={estimatedMinutes}
                onChange={e => setEstimatedMinutes(e.target.value)}
                placeholder="30"
                className="h-8 text-xs"
                min={0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t('tasks.assignToRole')}</Label>
              <Select value={assignedRole} onValueChange={setAssignedRole}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t('tasks.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiter">{t('employees.waiterRole')}</SelectItem>
                  <SelectItem value="bar">{t('employees.barRole')}</SelectItem>
                  <SelectItem value="kitchen">{t('employees.kitchenRole')}</SelectItem>
                  <SelectItem value="manager">{t('employees.managerRole')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">{t('taskPlanning.filterByZone')}</Label>
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t('taskPlanning.allZones')} />
                </SelectTrigger>
                <SelectContent>
                  {sections.filter(s => s.is_active).map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t('tasks.cancel')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!title.trim()}>
            {task ? t('tasks.updateTask') : t('taskPlanning.addTask')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
