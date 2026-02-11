'use client'

import { Table } from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StaffTaskWithDetails, TaskStatus, TaskPriority } from '@/types'
import { Search, X, Download, FileSpreadsheet, SlidersHorizontal } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface TaskTableToolbarProps {
  table: Table<StaffTaskWithDetails>
  onExportExcel: () => void
  onExportPDF: () => void
}

const statuses: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const priorities: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function TaskTableToolbar({ table, onExportExcel, onExportPDF }: TaskTableToolbarProps) {
  const t = useTranslations('staff.tasks')
  const isFiltered = table.getState().columnFilters.length > 0 || table.getState().globalFilter

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchTasks')}
            value={(table.getState().globalFilter as string) ?? ''}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Status filter */}
        <Select
          value={(table.getColumn('status')?.getFilterValue() as string[])?.join(',') || '__all__'}
          onValueChange={(v) => {
            if (v === '__all__') {
              table.getColumn('status')?.setFilterValue(undefined)
            } else {
              table.getColumn('status')?.setFilterValue(v.split(','))
            }
          }}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder={t('allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('allStatuses')}</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority filter */}
        <Select
          value={(table.getColumn('priority')?.getFilterValue() as string[])?.join(',') || '__all__'}
          onValueChange={(v) => {
            if (v === '__all__') {
              table.getColumn('priority')?.setFilterValue(undefined)
            } else {
              table.getColumn('priority')?.setFilterValue(v.split(','))
            }
          }}
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder={t('allPriorities')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('allPriorities')}</SelectItem>
            {priorities.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter('')
            }}
            className="h-9 px-2"
          >
            <X className="mr-1 h-4 w-4" />
            {t('clearFilters')}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Selected count */}
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {table.getFilteredSelectedRowModel().rows.length} {t('selected')}
          </Badge>
        )}

        {/* Export buttons */}
        <Button variant="outline" size="sm" className="h-9" onClick={onExportExcel}>
          <FileSpreadsheet className="mr-1.5 h-4 w-4" />
          Excel
        </Button>
        <Button variant="outline" size="sm" className="h-9" onClick={onExportPDF}>
          <Download className="mr-1.5 h-4 w-4" />
          PDF
        </Button>

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              {t('columns')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  className="capitalize"
                >
                  {col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
