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
import { SchedulePlan } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format, subWeeks } from 'date-fns'
import { useTranslations } from 'next-intl'

export type PrintSector = 'all' | 'sala' | 'cocina'

interface ScheduleToolbarProps {
  plan: SchedulePlan | null
  weekStart: Date
  isDirty: boolean
  saving: boolean
  canUndo: boolean
  canRedo: boolean
  onSave: () => void
  onPublish: () => void
  onCopyPreviousWeek: (sourceWeek: string) => void
  onUndo: () => void
  onRedo: () => void
  onPrint: () => void
  onExportExcel?: () => void
  printSector?: PrintSector
  onPrintSectorChange?: (sector: PrintSector) => void
}

export function ScheduleToolbar({
  plan,
  weekStart,
  isDirty,
  saving,
  canUndo,
  canRedo,
  onSave,
  onPublish,
  onCopyPreviousWeek,
  onUndo,
  onRedo,
  onPrint,
  onExportExcel,
  printSector = 'all',
  onPrintSectorChange,
}: ScheduleToolbarProps) {
  const t = useTranslations('staff')
  const previousWeek = format(subWeeks(weekStart, 1), 'yyyy-MM-dd')

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} title={t('schedule.undoTooltip')}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} title={t('schedule.redoTooltip')}>
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Actions */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onCopyPreviousWeek(previousWeek)}
        disabled={saving}
      >
        <Copy className="mr-2 h-4 w-4" />
        {t('schedule.copyPreviousWeek')}
      </Button>

      {/* Print sector + button */}
      {onPrintSectorChange && (
        <Select value={printSector} onValueChange={(v) => onPrintSectorChange(v as PrintSector)}>
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('schedule.printSectorAll')}</SelectItem>
            <SelectItem value="sala">{t('schedule.printSectorSala')}</SelectItem>
            <SelectItem value="cocina">{t('schedule.printSectorCocina')}</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Button variant="outline" size="sm" onClick={onPrint}>
        <Printer className="mr-2 h-4 w-4" />
        {t('schedule.print')}
      </Button>

      {onExportExcel && (
        <Button variant="outline" size="sm" onClick={onExportExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {t('schedule.exportExcel')}
        </Button>
      )}

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
          {t('schedule.saveDraft')}
        </Button>

        <Button
          size="sm"
          onClick={onPublish}
          disabled={saving || (!plan && !isDirty)}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {t('schedule.publishSchedule')}
        </Button>
      </div>
    </div>
  )
}
