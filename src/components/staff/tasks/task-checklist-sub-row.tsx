'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { StaffTaskItem, StaffTaskWithDetails } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface TaskChecklistSubRowProps {
  task: StaffTaskWithDetails
  onUpdate: () => void
}

export function TaskChecklistSubRow({ task, onUpdate }: TaskChecklistSubRowProps) {
  const { toast } = useToast()
  const [updating, setUpdating] = useState<string | null>(null)

  const handleToggle = async (item: StaffTaskItem) => {
    setUpdating(item.id)
    try {
      const res = await fetch(`/api/staff/tasks/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !item.completed }),
      })

      if (!res.ok) throw new Error('Failed to update item')
      onUpdate()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update checklist item',
        variant: 'destructive',
      })
    } finally {
      setUpdating(null)
    }
  }

  if (!task.items || task.items.length === 0) {
    return null
  }

  const completedCount = task.items.filter(i => i.completed).length

  return (
    <div className="px-8 py-3 bg-muted/30 border-t">
      <div className="text-xs text-muted-foreground mb-2 font-medium">
        Checklist ({completedCount}/{task.items.length})
      </div>
      <div className="space-y-1.5">
        {task.items.map((item) => (
          <label
            key={item.id}
            className={cn(
              'flex items-center gap-2.5 text-sm cursor-pointer rounded px-2 py-1 hover:bg-muted/50 transition-colors',
              updating === item.id && 'opacity-50 pointer-events-none'
            )}
          >
            <Checkbox
              checked={item.completed}
              onCheckedChange={() => handleToggle(item)}
              disabled={updating === item.id}
            />
            <span className={cn(item.completed && 'line-through text-muted-foreground')}>
              {item.text}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
