'use client'

import { useState, useRef, useEffect } from 'react'
import { ColumnDef, Row } from '@tanstack/react-table'
import { StaffTaskWithDetails, TaskStatus, TaskPriority, EmployeeWithProfile } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { STATUS_COLORS, PRIORITY_COLORS } from '@/lib/utils/task-colors'
import { cn } from '@/lib/utils'
import { format, isPast } from 'date-fns'
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Pencil,
  CheckCircle2,
  Trash2,
} from 'lucide-react'

// ============================================================================
// INLINE EDITABLE CELLS
// ============================================================================

function EditableTitleCell({
  value,
  onSave,
}: {
  value: string
  onSave: (newValue: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const handleSave = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    } else {
      setDraft(value)
    }
    setEditing(false)
  }

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors truncate block"
        onClick={() => setEditing(true)}
        title={value}
      >
        {value}
      </span>
    )
  }

  return (
    <Input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSave()
        if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      }}
      className="h-7 text-sm px-1"
    />
  )
}

function StatusSelectCell({
  value,
  onSave,
}: {
  value: TaskStatus
  onSave: (newValue: TaskStatus) => void
}) {
  const colors = STATUS_COLORS[value]
  const statuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']
  const labels: Record<TaskStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }

  return (
    <Select value={value} onValueChange={(v) => onSave(v as TaskStatus)}>
      <SelectTrigger className="h-7 border-0 shadow-none p-0 focus:ring-0">
        <Badge className={cn('text-xs font-medium', colors.bg, colors.text, 'border-0')}>
          {labels[value]}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {statuses.map((s) => {
          const c = STATUS_COLORS[s]
          return (
            <SelectItem key={s} value={s}>
              <Badge className={cn('text-xs', c.bg, c.text, 'border-0')}>
                {labels[s]}
              </Badge>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

function PrioritySelectCell({
  value,
  onSave,
}: {
  value: TaskPriority
  onSave: (newValue: TaskPriority) => void
}) {
  const colors = PRIORITY_COLORS[value]
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
  const labels: Record<TaskPriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  }

  return (
    <Select value={value} onValueChange={(v) => onSave(v as TaskPriority)}>
      <SelectTrigger className="h-7 border-0 shadow-none p-0 focus:ring-0">
        <Badge className={cn('text-xs font-medium', colors.bg, colors.text, 'border-0')}>
          {labels[value]}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {priorities.map((p) => {
          const c = PRIORITY_COLORS[p]
          return (
            <SelectItem key={p} value={p}>
              <Badge className={cn('text-xs', c.bg, c.text, 'border-0')}>
                {labels[p]}
              </Badge>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

function EmployeeSelectCell({
  value,
  employees,
  onSave,
}: {
  value: string | null
  employees: EmployeeWithProfile[]
  onSave: (newValue: string | null) => void
}) {
  const assigned = employees.find((e) => e.id === value)

  return (
    <Select
      value={value || '__unassigned__'}
      onValueChange={(v) => onSave(v === '__unassigned__' ? null : v)}
    >
      <SelectTrigger className="h-7 border-0 shadow-none p-0 focus:ring-0 text-sm">
        <SelectValue>
          {assigned?.profile?.full_name || (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__unassigned__">
          <span className="text-muted-foreground">Unassigned</span>
        </SelectItem>
        {employees.map((emp) => (
          <SelectItem key={emp.id} value={emp.id}>
            {emp.profile?.full_name || emp.profile?.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

interface ColumnOptions {
  employees: EmployeeWithProfile[]
  canManage: boolean
  onInlineUpdate: (taskId: string, field: string, value: unknown) => void
  onView: (task: StaffTaskWithDetails) => void
  onEdit: (task: StaffTaskWithDetails) => void
  onDelete: (task: StaffTaskWithDetails) => void
}

export function getTaskColumns(options: ColumnOptions): ColumnDef<StaffTaskWithDetails>[] {
  const { employees, canManage, onInlineUpdate, onView, onEdit, onDelete } = options

  const columns: ColumnDef<StaffTaskWithDetails>[] = [
    // Select checkbox
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    // Expand toggle
    {
      id: 'expand',
      header: () => null,
      cell: ({ row }) => {
        if (!row.original.items || row.original.items.length === 0) return null
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => row.toggleExpanded()}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )
      },
      enableSorting: false,
      size: 40,
    },
    // Title
    {
      accessorKey: 'title',
      header: 'Title',
      size: 250,
      cell: ({ row }) => {
        if (!canManage) return <span className="truncate" title={row.original.title}>{row.original.title}</span>
        return (
          <EditableTitleCell
            value={row.original.title}
            onSave={(v) => onInlineUpdate(row.original.id, 'title', v)}
          />
        )
      },
    },
    // Status
    {
      accessorKey: 'status',
      header: 'Status',
      size: 140,
      cell: ({ row }) => {
        if (!canManage) {
          const colors = STATUS_COLORS[row.original.status]
          return (
            <Badge className={cn('text-xs', colors.bg, colors.text, 'border-0')}>
              {row.original.status.replace('_', ' ')}
            </Badge>
          )
        }
        return (
          <StatusSelectCell
            value={row.original.status}
            onSave={(v) => onInlineUpdate(row.original.id, 'status', v)}
          />
        )
      },
      filterFn: (row: Row<StaffTaskWithDetails>, _id: string, filterValue: string[]) => {
        return filterValue.includes(row.original.status)
      },
    },
    // Priority
    {
      accessorKey: 'priority',
      header: 'Priority',
      size: 120,
      cell: ({ row }) => {
        if (!canManage) {
          const colors = PRIORITY_COLORS[row.original.priority]
          return (
            <Badge className={cn('text-xs', colors.bg, colors.text, 'border-0')}>
              {row.original.priority}
            </Badge>
          )
        }
        return (
          <PrioritySelectCell
            value={row.original.priority}
            onSave={(v) => onInlineUpdate(row.original.id, 'priority', v)}
          />
        )
      },
      filterFn: (row: Row<StaffTaskWithDetails>, _id: string, filterValue: string[]) => {
        return filterValue.includes(row.original.priority)
      },
    },
    // Assigned To
    {
      accessorKey: 'assigned_to',
      header: 'Assigned',
      size: 180,
      cell: ({ row }) => {
        if (!canManage) {
          return (
            <span className="text-sm">
              {row.original.assigned_employee?.profile?.full_name || (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </span>
          )
        }
        return (
          <EmployeeSelectCell
            value={row.original.assigned_to}
            employees={employees}
            onSave={(v) => onInlineUpdate(row.original.id, 'assigned_to', v)}
          />
        )
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.assigned_employee?.profile?.full_name || ''
        const b = rowB.original.assigned_employee?.profile?.full_name || ''
        return a.localeCompare(b)
      },
    },
    // Due Date
    {
      accessorKey: 'due_date',
      header: 'Due Date',
      size: 120,
      cell: ({ row }) => {
        const d = row.original.due_date
        if (!d) return <span className="text-muted-foreground text-xs">—</span>
        const date = new Date(d + 'T23:59:59')
        const isOverdue = row.original.status !== 'completed' && row.original.status !== 'cancelled' && isPast(date)
        return (
          <span className={cn('text-sm', isOverdue && 'text-red-600 dark:text-red-400 font-medium')}>
            {format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy')}
            {row.original.due_time && (
              <span className="text-xs text-muted-foreground ml-1">{row.original.due_time}</span>
            )}
          </span>
        )
      },
    },
    // Checklist progress
    {
      id: 'checklist',
      header: 'Checklist',
      size: 100,
      cell: ({ row }) => {
        const items = row.original.items
        if (!items || items.length === 0) return null
        const completed = items.filter(i => i.completed).length
        const pct = Math.round((completed / items.length) * 100)
        return (
          <div className="flex items-center gap-2">
            <Progress value={pct} className="h-2 w-16" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {completed}/{items.length}
            </span>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const aItems = rowA.original.items || []
        const bItems = rowB.original.items || []
        const aPct = aItems.length > 0 ? aItems.filter(i => i.completed).length / aItems.length : 0
        const bPct = bItems.length > 0 ? bItems.filter(i => i.completed).length / bItems.length : 0
        return aPct - bPct
      },
    },
    // Actions
    {
      id: 'actions',
      header: () => null,
      size: 60,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-7 w-7 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(row.original)}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            {canManage && (
              <>
                <DropdownMenuItem onClick={() => onEdit(row.original)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                {row.original.status !== 'completed' && (
                  <DropdownMenuItem
                    onClick={() => onInlineUpdate(row.original.id, 'status', 'completed')}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Complete
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(row.original)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ]

  return columns
}
