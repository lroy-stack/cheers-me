'use client'

import { useState, useEffect } from 'react'
import { StaffTaskTemplate, TaskPriority } from '@/types'
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

interface TaskTemplateFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: StaffTaskTemplate | null
  onSuccess?: () => void
}

interface TemplateItem {
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

const frequencies = [
  { value: 'daily', labelKey: 'tasks.templateFrequencyDaily' },
  { value: 'weekly', labelKey: 'tasks.templateFrequencyWeekly' },
  { value: 'monthly', labelKey: 'tasks.templateFrequencyMonthly' },
  { value: 'opening', labelKey: 'tasks.templateFrequencyOpening' },
  { value: 'closing', labelKey: 'tasks.templateFrequencyClosing' },
]

export function TaskTemplateForm({
  open,
  onOpenChange,
  template,
  onSuccess,
}: TaskTemplateFormProps) {
  const { toast } = useToast()
  const t = useTranslations('staff')
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    default_priority: 'medium' as TaskPriority,
    default_assigned_role: '',
    frequency: '',
    estimated_minutes: '',
  })

  const [items, setItems] = useState<TemplateItem[]>([])
  const [newItemText, setNewItemText] = useState('')

  useEffect(() => {
    if (template) {
      setFormData({
        title: template.title,
        description: template.description || '',
        default_priority: template.default_priority,
        default_assigned_role: template.default_assigned_role || '',
        frequency: template.frequency || '',
        estimated_minutes: template.estimated_minutes?.toString() || '',
      })
      setItems(
        (template.items || []).map((item, index) => ({
          text: item.text,
          sort_order: item.sort_order ?? index,
        }))
      )
    } else {
      setFormData({
        title: '',
        description: '',
        default_priority: 'medium',
        default_assigned_role: '',
        frequency: '',
        estimated_minutes: '',
      })
      setItems([])
    }
    setNewItemText('')
  }, [template, open])

  const handleAddItem = () => {
    if (newItemText.trim()) {
      setItems([
        ...items,
        { text: newItemText.trim(), sort_order: items.length },
      ])
      setNewItemText('')
    }
  }

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index)
    setItems(updated.map((item, i) => ({ ...item, sort_order: i })))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        default_priority: formData.default_priority,
        default_assigned_role: formData.default_assigned_role || null,
        frequency: formData.frequency || null,
        estimated_minutes: formData.estimated_minutes
          ? parseInt(formData.estimated_minutes)
          : null,
        items: items.length > 0 ? items : [],
      }

      if (template) {
        const res = await fetch(`/api/staff/tasks/templates/${template.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Failed to update template')
        }

        toast({
          title: t('tasks.templateUpdated'),
          description: t('tasks.templateUpdatedDesc'),
        })
      } else {
        const res = await fetch('/api/staff/tasks/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Failed to create template')
        }

        toast({
          title: t('tasks.templateCreated'),
          description: t('tasks.templateCreatedDesc'),
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
            {template ? t('tasks.editTemplate') : t('tasks.createTemplate')}
          </SheetTitle>
          <SheetDescription>
            {template
              ? t('tasks.editTemplateDesc')
              : t('tasks.createTemplateDesc')}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="template_title">{t('tasks.templateTitle')} *</Label>
            <Input
              id="template_title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              disabled={loading}
              placeholder={t('tasks.templateTitlePlaceholder')}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="template_description">{t('tasks.description')}</Label>
            <Textarea
              id="template_description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={loading}
              placeholder={t('tasks.templateDescPlaceholder')}
              rows={3}
            />
          </div>

          {/* Default priority */}
          <div className="space-y-2">
            <Label>{t('tasks.defaultPriority')}</Label>
            <Select
              value={formData.default_priority}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  default_priority: value as TaskPriority,
                })
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

          {/* Default assigned role */}
          <div className="space-y-2">
            <Label>{t('tasks.defaultRole')}</Label>
            <Select
              value={formData.default_assigned_role || 'none'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  default_assigned_role: value === 'none' ? '' : value,
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

          {/* Frequency */}
          <div className="space-y-2">
            <Label>{t('tasks.frequency')}</Label>
            <Select
              value={formData.frequency || 'none'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  frequency: value === 'none' ? '' : value,
                })
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('tasks.selectFrequency')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('tasks.noFrequency')}</SelectItem>
                {frequencies.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {t(freq.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estimated minutes */}
          <div className="space-y-2">
            <Label htmlFor="estimated_minutes">{t('tasks.estimatedMinutes')}</Label>
            <Input
              id="estimated_minutes"
              type="number"
              min="0"
              value={formData.estimated_minutes}
              onChange={(e) =>
                setFormData({ ...formData, estimated_minutes: e.target.value })
              }
              disabled={loading}
              placeholder="30"
            />
          </div>

          {/* Checklist items */}
          <div className="space-y-3">
            <Label>{t('tasks.checklistItems')}</Label>

            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item, index) => (
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
              {template ? t('tasks.updateTemplate') : t('tasks.createTemplate')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
