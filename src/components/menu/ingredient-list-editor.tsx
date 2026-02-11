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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GripVertical, Plus, Trash2, Save, X } from 'lucide-react'

const UNITS = ['ml', 'cl', 'oz', 'dash', 'piece', 'g', 'barspoon', 'drops', 'slice', 'sprig']

interface IngredientRow {
  id: string
  name: string
  quantity: number
  unit: string
  cost_per_unit: number
  product_id: string
  is_garnish: boolean
  is_optional: boolean
}

function createEmptyRow(): IngredientRow {
  return {
    id: crypto.randomUUID(),
    name: '',
    quantity: 0,
    unit: 'ml',
    cost_per_unit: 0,
    product_id: '',
    is_garnish: false,
    is_optional: false,
  }
}

interface SortableRowProps {
  row: IngredientRow
  onChange: (id: string, field: keyof IngredientRow, value: unknown) => void
  onRemove: (id: string) => void
}

function SortableRow({ row, onChange, onRemove }: SortableRowProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border"
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <Input
        value={row.name}
        onChange={e => onChange(row.id, 'name', e.target.value)}
        placeholder="Ingredient name"
        className="flex-1 h-8 text-sm"
      />

      <Input
        type="number"
        value={row.quantity || ''}
        onChange={e => onChange(row.id, 'quantity', parseFloat(e.target.value) || 0)}
        className="w-20 h-8 text-sm"
        placeholder="Qty"
      />

      <Select value={row.unit} onValueChange={v => onChange(row.id, 'unit', v)}>
        <SelectTrigger className="w-20 h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {UNITS.map(u => (
            <SelectItem key={u} value={u}>{u}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="number"
        value={row.cost_per_unit || ''}
        onChange={e => onChange(row.id, 'cost_per_unit', parseFloat(e.target.value) || 0)}
        className="w-20 h-8 text-sm"
        placeholder="€/unit"
        step="0.01"
      />

      <div className="flex items-center gap-1" title="Garnish">
        <Checkbox
          checked={row.is_garnish}
          onCheckedChange={v => onChange(row.id, 'is_garnish', !!v)}
        />
        <span className="text-xs text-muted-foreground">G</span>
      </div>

      <div className="flex items-center gap-1" title="Optional">
        <Checkbox
          checked={row.is_optional}
          onCheckedChange={v => onChange(row.id, 'is_optional', !!v)}
        />
        <span className="text-xs text-muted-foreground">Opt</span>
      </div>

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemove(row.id)}>
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  )
}

interface IngredientListEditorProps {
  initialIngredients: Array<{
    name: string
    quantity: number
    unit: string
    cost_per_unit?: number
    product_id?: string
    is_garnish?: boolean
    is_optional?: boolean
  }>
  onSave: (ingredients: Array<{
    name: string
    quantity: number
    unit: string
    cost_per_unit?: number
    product_id?: string
    is_garnish?: boolean
    is_optional?: boolean
    sort_order?: number
  }>) => Promise<{ success: boolean }>
  onCancel: () => void
  saving?: boolean
}

export function IngredientListEditor({ initialIngredients, onSave, onCancel, saving }: IngredientListEditorProps) {
  const [rows, setRows] = useState<IngredientRow[]>(
    initialIngredients.map(ing => ({
      id: crypto.randomUUID(),
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      cost_per_unit: ing.cost_per_unit ?? 0,
      product_id: ing.product_id ?? '',
      is_garnish: ing.is_garnish ?? false,
      is_optional: ing.is_optional ?? false,
    }))
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleChange = useCallback((id: string, field: keyof IngredientRow, value: unknown) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }, [])

  const handleRemove = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
  }, [])

  const handleAdd = () => {
    setRows(prev => [...prev, createEmptyRow()])
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
    const ingredients = rows
      .filter(r => r.name.trim())
      .map((r, idx) => ({
        name: r.name.trim(),
        quantity: r.quantity,
        unit: r.unit,
        cost_per_unit: r.cost_per_unit || undefined,
        product_id: r.product_id || undefined,
        is_garnish: r.is_garnish,
        is_optional: r.is_optional,
        sort_order: idx + 1,
      }))
    await onSave(ingredients)
  }

  const totalCost = rows.reduce((sum, r) => sum + r.quantity * r.cost_per_unit, 0)

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
          {rows.map(row => (
            <SortableRow key={row.id} row={row} onChange={handleChange} onRemove={handleRemove} />
          ))}
        </SortableContext>
      </DndContext>

      <Button variant="outline" size="sm" onClick={handleAdd}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Ingredient
      </Button>

      {totalCost > 0 && (
        <div className="text-sm text-muted-foreground">
          Total cost: <span className="font-medium">€{totalCost.toFixed(2)}</span>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? 'Saving...' : 'Save Ingredients'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
