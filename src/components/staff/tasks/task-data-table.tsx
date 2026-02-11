'use client'

import { useState, useMemo, Fragment } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  ExpandedState,
  RowSelectionState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StaffTaskWithDetails, EmployeeWithProfile } from '@/types'
import { getTaskColumns } from './task-columns'
import { TaskTableToolbar } from './task-table-toolbar'
import { TaskTablePagination } from './task-table-pagination'
import { TaskChecklistSubRow } from './task-checklist-sub-row'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardList } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import { exportTasksToExcel } from '@/lib/utils/task-excel-export'

interface TaskDataTableProps {
  tasks: StaffTaskWithDetails[]
  employees: EmployeeWithProfile[]
  loading: boolean
  canManage: boolean
  onView: (task: StaffTaskWithDetails) => void
  onEdit: (task: StaffTaskWithDetails) => void
  onRefetch: () => void
}

export function TaskDataTable({
  tasks,
  employees,
  loading,
  canManage,
  onView,
  onEdit,
  onRefetch,
}: TaskDataTableProps) {
  const { toast } = useToast()
  const t = useTranslations('staff.tasks')

  // Table state
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [globalFilter, setGlobalFilter] = useState('')

  // Inline update handler
  const handleInlineUpdate = async (taskId: string, field: string, value: unknown) => {
    try {
      const res = await fetch(`/api/staff/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update')
      }

      onRefetch()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update task',
        variant: 'destructive',
      })
    }
  }

  // Delete handler
  const handleDelete = async (task: StaffTaskWithDetails) => {
    if (!confirm(t('deleteConfirm'))) return

    try {
      const res = await fetch(`/api/staff/tasks/${task.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')

      toast({ title: t('taskDeleted'), description: t('taskDeletedDesc') })
      onRefetch()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      })
    }
  }

  // Export handlers
  const handleExportExcel = () => {
    const rows = table.getFilteredRowModel().rows
    const data = rows.map(r => r.original)
    exportTasksToExcel({ tasks: data })
  }

  const handleExportPDF = async () => {
    try {
      const rows = table.getFilteredRowModel().rows
      const taskIds = rows.map(r => r.original.id)
      const params = new URLSearchParams()
      taskIds.forEach(id => params.append('ids', id))

      const res = await fetch(`/api/staff/tasks/export/pdf?${params}`)
      if (!res.ok) throw new Error('Failed to export')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tasks_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to export PDF',
        variant: 'destructive',
      })
    }
  }

  // Columns
  const columns = useMemo(
    () =>
      getTaskColumns({
        employees,
        canManage,
        onInlineUpdate: handleInlineUpdate,
        onView,
        onEdit,
        onDelete: handleDelete,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, canManage]
  )

  const table = useReactTable({
    data: tasks,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => (row.original.items?.length ?? 0) > 0,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase()
      const task = row.original
      return (
        task.title.toLowerCase().includes(search) ||
        (task.description?.toLowerCase().includes(search) ?? false) ||
        (task.assigned_employee?.profile?.full_name?.toLowerCase().includes(search) ?? false) ||
        (task.notes?.toLowerCase().includes(search) ?? false)
      )
    },
    initialState: {
      pagination: { pageSize: 20 },
    },
  })

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 max-w-sm" />
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[130px]" />
        </div>
        <div className="rounded-md border">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 border-b last:border-0">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <TaskTableToolbar
        table={table}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={
                      header.column.getCanSort()
                        ? 'cursor-pointer select-none hover:bg-muted/50'
                        : ''
                    }
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' ↑'}
                      {header.column.getIsSorted() === 'desc' && ' ↓'}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ClipboardList className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground font-medium">{t('noTasks')}</p>
                    <p className="text-sm text-muted-foreground">{t('noTasksDesc')}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && 'selected'}
                    className="group hover:bg-muted/30"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="p-0">
                        <TaskChecklistSubRow
                          task={row.original}
                          onUpdate={onRefetch}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TaskTablePagination table={table} />
    </div>
  )
}
