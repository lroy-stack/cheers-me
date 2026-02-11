'use client'

import { Button } from '@/components/ui/button'
import {
  Save,
  Send,
  Copy,
  Printer,
  Undo2,
  Redo2,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react'
import type { WeeklyTaskPlan } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations } from 'next-intl'

export type PrintSector = 'all' | 'sala' | 'cocina'

interface TaskPlanToolbarProps {
  plan: WeeklyTaskPlan | null
  isDirty: boolean
  saving: boolean
  canUndo: boolean
  canRedo: boolean
  onSave: () => void
  onPublish: () => void
  onCopyPrev: () => void
  onUndo: () => void
  onRedo: () => void
  onPrint?: () => void
  onExport?: () => void
  printSector: PrintSector
  onPrintSectorChange: (sector: PrintSector) => void
}

export function TaskPlanToolbar({
  plan,
  isDirty,
  saving,
  canUndo,
  canRedo,
  onSave,
  onPublish,
  onCopyPrev,
  onUndo,
  onRedo,
  onPrint,
  onExport,
  printSector,
  onPrintSectorChange,
}: TaskPlanToolbarProps) {
  const t = useTranslations('staff')

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} title={t('taskPlanning.undoTooltip')}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} title={t('taskPlanning.redoTooltip')}>
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Copy Previous Week */}
      <Button
        variant="outline"
        size="sm"
        onClick={onCopyPrev}
        disabled={saving}
      >
        <Copy className="mr-2 h-4 w-4" />
        {t('taskPlanning.copyPrevWeek')}
      </Button>

      {/* Print sector selector + print + excel */}
      <div className="flex items-center gap-1 border-l pl-2">
        <Select value={printSector} onValueChange={(v) => onPrintSectorChange(v as PrintSector)}>
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('taskPlanning.printSectorAll')}</SelectItem>
            <SelectItem value="sala">{t('taskPlanning.printSectorSala')}</SelectItem>
            <SelectItem value="cocina">{t('taskPlanning.printSectorCocina')}</SelectItem>
          </SelectContent>
        </Select>

        {onPrint && (
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="mr-2 h-4 w-4" />
            {t('taskPlanning.print')}
          </Button>
        )}

        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t('taskPlanning.exportExcel')}
          </Button>
        )}
      </div>

      {/* Save + Publish (right-aligned) */}
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={!isDirty || saving}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t('taskPlanning.saveDraft')}
        </Button>

        <Button
          size="sm"
          onClick={onPublish}
          disabled={saving || (!plan && !isDirty)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {t('taskPlanning.publish')}
        </Button>
      </div>
    </div>
  )
}
