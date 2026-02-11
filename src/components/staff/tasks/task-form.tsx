'use client'

import { useState, useEffect } from 'react'
import {
  StaffTaskWithDetails,
  StaffTaskTemplate,
  EmployeeWithProfile,
  TaskPriority,
} from '@/types'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: StaffTaskWithDetails | null
  templates: StaffTaskTemplate[]
  employees: EmployeeWithProfile[]
  onSuccess?: () => void
}

interface ChecklistItem {
  text: string
  sort_order: number
}

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bar', label: 'Bar' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'dj', label: 'DJ' },
  { value: 'owner', label: 'Owner' },
]

export function TaskForm({
  open,
  onOpenChange,
  task,
  templates,
  employees,
  onSuccess,
}: TaskFormProps) {
  const { toast } = useToast()
  const t = useTranslations('staff')
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    template_id: '',
    assigned_to: '',
    assigned_role: '',
    due_date: '',
    due_time: '',
    priority: 'medium' as TaskPriority,
  })

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [newItemText, setNewItemText] = useState('')

  // Reset form when task changes or sheet opens
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        template_id: task.template_id || '',
        assigned_to: task.assigned_to || '',
        assigned_role: task.assigned_role || '',
        due_date: task.due_date || '',
        due_time: task.due_time || '',
        priority: task.priority,
      })
      setChecklistItems(
        (task.items || []).map((item) => ({
          text: item.text,
          sort_order: item.sort_order,
        }))
      )
    } else {
      setFormData({
        title: '',
        description: '',
        template_id: '',
        assigned_to: '',
        assigned_role: '',
        due_date: '',
        due_time: '',
        priority: 'medium',
      })
      setChecklistItems([])
    }
    setNewItemText('')
  }, [task, open])

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'none') {
      setFormData({ ...formData, template_id: '' })
      return
    }

    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setFormData({
        ...formData,
        template_id: templateId,
        title: template.title,
        description: template.description || '',
        priority: template.default_priority,
        assigned_role: template.default_assigned_role || '',
      })
      setChecklistItems(
        (template.items || []).map((item, index) => ({
          text: item.text,
          sort_order: item.sort_order ?? index,
        }))
      )
    }
  }

  const handleAddItem = () => {
    if (newItemText.trim()) {
      setChecklistItems([
        ...checklistItems,
        { text: newItemText.trim(), sort_order: checklistItems.length },
      ])
      setNewItemText('')
    }
  }

  const handleRemoveItem = (index: number) => {
    const updated = checklistItems.filter((_, i) => i !== index)
    setChecklistItems(
      updated.map((item, i) => ({ ...item, sort_order: i }))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        template_id: formData.template_id || null,
        assigned_to: formData.assigned_to || null,
        assigned_role: formData.assigned_role || null,
        due_date: formData.due_date || null,
        due_time: formData.due_time || null,
        priority: formData.priority,
        items: checklistItems.length > 0 ? checklistItems : undefined,
      }

      if (task) {
        // Update existing task
        const res = await fetch(`/api/staff/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: payload.title,
            description: payload.description,
            assigned_to: payload.assigned_to,
            assigned_role: payload.assigned_role,
            due_date: payload.due_date,
            due_time: payload.due_time,
            priority: payload.priority,
          }),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Failed to update task')
        }

        toast({
          title: t('tasks.taskUpdated'),
          description: t('tasks.taskUpdatedDesc'),
        })
      } else {
        // Create new task
        const res = await fetch('/api/staff/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Failed to create task')
        }

        toast({
          title: t('tasks.taskCreated'),
          description: t('tasks.taskCreatedDesc'),
        })
      }

      onOpenChange(false)
      onSuccess?.()
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
          <SheetTitle>
            {task ? t('tasks.editTask') : t('tasks.createTask')}
          </SheetTitle>
          <SheetDescription>
            {task ? t('tasks.editTaskDesc') : t('tasks.createTaskDesc')}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Template selector (only for new tasks) */}
          {!task && templates.length > 0 && (
            <div className="space-y-2">
              <Label>{t('tasks.template')}</Label>
              <Select
                value={formData.template_id || 'none'}
                onValueChange={handleTemplateSelect}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('tasks.selectTemplate')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('tasks.noTemplate')}</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task_title">{t('tasks.taskTitle')} *</Label>
            <Input
              id="task_title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={loading}
              placeholder={t('tasks.titlePlaceholder')}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task_description">{t('tasks.description')}</Label>
            <Textarea
              id="task_description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={loading}
              placeholder={t('tasks.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          {/* Assign to employee */}
          <div className="space-y-2">
            <Label>{t('tasks.assignToEmployee')}</Label>
            <Select
              value={formData.assigned_to || 'none'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  assigned_to: value === 'none' ? '' : value,
                })
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('tasks.selectEmployee')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('tasks.unassigned')}</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.profile.full_name || emp.profile.email} ({emp.profile.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assign to role */}
          <div className="space-y-2">
            <Label>{t('tasks.assignToRole')}</Label>
            <Select
              value={formData.assigned_role || 'none'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  assigned_role: value === 'none' ? '' : value,
                })
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('tasks.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('tasks.noRole')}</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due date & time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="task_due_date">{t('tasks.dueDate')}</Label>
              <Input
                id="task_due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task_due_time">{t('tasks.dueTime')}</Label>
              <Input
                id="task_due_time"
                type="time"
                value={formData.due_time}
                onChange={(e) =>
                  setFormData({ ...formData, due_time: e.target.value })
                }
                disabled={loading}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>{t('tasks.priority')}</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) =>
                setFormData({ ...formData, priority: value as TaskPriority })
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('tasks.priorityLow')}</SelectItem>
                <SelectItem value="medium">{t('tasks.priorityMedium')}</SelectItem>
                <SelectItem value="high">{t('tasks.priorityHigh')}</SelectItem>
                <SelectItem value="urgent">{t('tasks.priorityUrgent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Checklist items */}
          <div className="space-y-3">
            <Label>{t('tasks.checklist')}</Label>

            {checklistItems.length > 0 && (
              <div className="space-y-2">
                {checklistItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <span className="flex-1 text-sm">{item.text}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      disabled={loading}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder={t('tasks.addItemPlaceholder')}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddItem()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                disabled={loading || !newItemText.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
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
              {t('tasks.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {task ? t('tasks.updateTask') : t('tasks.createTask')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
