'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useTrainingAssignments } from '@/hooks/use-training-assignments'
import { useEmployees } from '@/hooks/use-employees'
import { useToast } from '@/hooks/use-toast'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const ROLE_VALUES = ['admin', 'manager', 'kitchen', 'bar', 'waiter', 'dj', 'owner'] as const

interface TrainingAssignmentDialogProps {
  guideCode: string | null
  guideName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function TrainingAssignmentDialog({
  guideCode,
  guideName,
  open,
  onOpenChange,
  onSuccess,
}: TrainingAssignmentDialogProps) {
  const t = useTranslations('resources')
  const tCommon = useTranslations('common')
  const { toast } = useToast()
  const { createAssignment } = useTrainingAssignments()
  const { employees } = useEmployees(true)

  const [loading, setLoading] = useState(false)
  const [assignTo, setAssignTo] = useState('')
  const [assignRole, setAssignRole] = useState('')
  const [dueDate, setDueDate] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guideCode) return

    setLoading(true)
    try {
      await createAssignment({
        guide_code: guideCode,
        assigned_to: assignTo || null,
        assigned_role: assignRole || null,
        due_date: dueDate || null,
      })

      toast({
        title: t('training.assignTraining'),
        description: `${guideName} assigned successfully`,
      })

      setAssignTo('')
      setAssignRole('')
      setDueDate('')
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
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('training.assignTraining')}</SheetTitle>
          <SheetDescription>{guideName}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label>{t('training.assignToEmployee')}</Label>
            <Select
              value={assignTo || 'none'}
              onValueChange={(v) => setAssignTo(v === 'none' ? '' : v)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">--</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.profile.full_name || emp.profile.email} ({emp.profile.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('training.assignToRole')}</Label>
            <Select
              value={assignRole || 'none'}
              onValueChange={(v) => setAssignRole(v === 'none' ? '' : v)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">--</SelectItem>
                {ROLE_VALUES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {tCommon(`roles.${role}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('training.dueDate')}</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              {t('training.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || (!assignTo && !assignRole)}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('training.assignTraining')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
