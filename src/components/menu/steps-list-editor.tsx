'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { GripVertical, Plus, Trash2, Save, X } from 'lucide-react'

interface StepRow {
  id: string
  instruction_en: string
  instruction_nl: string
  instruction_es: string
  instruction_de: string
  duration_seconds: number
  tip: string
}

function createEmptyStep(): StepRow {
  return {
    id: crypto.randomUUID(),
    instruction_en: '',
    instruction_nl: '',
    instruction_es: '',
    instruction_de: '',
    duration_seconds: 0,
    tip: '',
  }
}

type LangKey = 'en' | 'nl' | 'es' | 'de'

interface SortableStepProps {
  row: StepRow
  index: number
  activeLang: LangKey
  onChange: (id: string, field: keyof StepRow, value: unknown) => void
  onRemove: (id: string) => void
}

function SortableStep({ row, index, activeLang, onChange, onRemove }: SortableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const instructionKey = `instruction_${activeLang}` as keyof StepRow

  return (
    <div ref={setNodeRef} style={style} className="p-3 rounded-lg border bg-muted/20 space-y-2">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="cursor-grab touch-none mt-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          {index + 1}
        </div>

        <div className="flex-1 space-y-2">
          <Textarea
            value={(row[instructionKey] as string) || ''}
            onChange={e => onChange(row.id, instructionKey, e.target.value)}
            placeholder={`Step instruction (${activeLang.toUpperCase()})${activeLang === 'en' ? ' *' : ''}`}
            rows={2}
            className="text-sm resize-none"
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={row.tip}
                onChange={e => onChange(row.id, 'tip', e.target.value)}
                placeholder="Tip (optional)"
                className="h-8 text-sm"
              />
            </div>
            <div className="w-24">
              <Input
                type="number"
                value={row.duration_seconds || ''}
                onChange={e => onChange(row.id, 'duration_seconds', parseInt(e.target.value) || 0)}
                placeholder="Sec"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => onRemove(row.id)}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

interface StepsListEditorProps {
  initialSteps: Array<{
    step_number: number
    instruction_en: string
    instruction_nl?: string
    instruction_es?: string
    instruction_de?: string
    duration_seconds?: number
    tip?: string
  }>
  onSave: (steps: Array<{
    step_number: number
    instruction_en: string
    instruction_nl?: string
    instruction_es?: string
    instruction_de?: string
    duration_seconds?: number
    tip?: string
  }>) => Promise<{ success: boolean }>
  onCancel: () => void
  saving?: boolean
}

export function StepsListEditor({ initialSteps, onSave, onCancel, saving }: StepsListEditorProps) {
  const [rows, setRows] = useState<StepRow[]>(
    initialSteps.map(step => ({
      id: crypto.randomUUID(),
      instruction_en: step.instruction_en,
      instruction_nl: step.instruction_nl || '',
      instruction_es: step.instruction_es || '',
      instruction_de: step.instruction_de || '',
      duration_seconds: step.duration_seconds || 0,
      tip: step.tip || '',
    }))
  )
  const [activeLang, setActiveLang] = useState<LangKey>('en')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleChange = useCallback((id: string, field: keyof StepRow, value: unknown) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }, [])

  const handleRemove = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
  }, [])

  const handleAdd = () => {
    setRows(prev => [...prev, createEmptyStep()])
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setRows(prev => {
        const oldIndex = prev.findIndex(r => r.id === active.id)
        const newIndex = prev.findIndex(r => r.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const handleSave = async () => {
    const steps = rows
      .filter(r => r.instruction_en.trim())
      .map((r, idx) => ({
        step_number: idx + 1,
        instruction_en: r.instruction_en.trim(),
        instruction_nl: r.instruction_nl.trim() || undefined,
        instruction_es: r.instruction_es.trim() || undefined,
        instruction_de: r.instruction_de.trim() || undefined,
        duration_seconds: r.duration_seconds || undefined,
        tip: r.tip.trim() || undefined,
      }))
    await onSave(steps)
  }

  return (
    <div className="space-y-3">
      {/* Language tabs */}
      <div className="flex gap-1">
        <Label className="text-xs text-muted-foreground mr-2 self-center">Language:</Label>
        {(['en', 'nl', 'es', 'de'] as const).map(lang => (
          <Button
            key={lang}
            variant={activeLang === lang ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs uppercase"
            onClick={() => setActiveLang(lang)}
          >
            {lang}
          </Button>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
          {rows.map((row, idx) => (
            <SortableStep
              key={row.id}
              row={row}
              index={idx}
              activeLang={activeLang}
              onChange={handleChange}
              onRemove={handleRemove}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button variant="outline" size="sm" onClick={handleAdd}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Step
      </Button>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? 'Saving...' : 'Save Steps'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
