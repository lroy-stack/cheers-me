'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
} from '@dnd-kit/core'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import { TableShape, TableShapeType, TableStatus } from './table-shape'
import { DraggableTable } from './draggable-table'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export interface Table {
  id: string
  table_number: string
  capacity: number
  x_position: number
  y_position: number
  status: TableStatus
  shape: TableShapeType
  width?: number
  height?: number
  rotation?: number
  section_id?: string
  is_active: boolean
  qr_code_url?: string | null
}

interface FloorPlanCanvasProps {
  tables: Table[]
  onTableMove: (tableId: string, x: number, y: number) => void
  onTableSelect: (table: Table | null) => void
  selectedTable: Table | null
  className?: string
}

export function FloorPlanCanvas({
  tables,
  onTableMove,
  onTableSelect,
  selectedTable,
  className,
}: FloorPlanCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const { toast } = useToast()

  // Check if two table bounding boxes overlap
  const checkOverlap = useCallback(
    (movedTable: Table, newX: number, newY: number): boolean => {
      const w1 = movedTable.width || 80
      const h1 = movedTable.shape === 'round' ? w1 : (movedTable.height || 80)
      const padding = 8

      for (const other of tables) {
        if (other.id === movedTable.id) continue
        const w2 = other.width || 80
        const h2 = other.shape === 'round' ? w2 : (other.height || 80)

        const overlapX = newX < other.x_position + w2 + padding &&
                         newX + w1 + padding > other.x_position
        const overlapY = newY < other.y_position + h2 + padding &&
                         newY + h1 + padding > other.y_position

        if (overlapX && overlapY) return true
      }
      return false
    },
    [tables]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required to start dragging
      },
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event
      const tableId = active.id as string
      const table = tables.find((t) => t.id === tableId)

      if (table && delta) {
        const newX = table.x_position + delta.x
        const newY = table.y_position + delta.y

        // Ensure table stays within canvas bounds (minimum 0)
        const clampedX = Math.max(0, newX)
        const clampedY = Math.max(0, newY)

        // Check for overlap with other tables
        if (checkOverlap(table, clampedX, clampedY)) {
          toast({
            title: 'Table overlap detected',
            description: `Cannot place ${table.table_number} here — it overlaps with another table.`,
            variant: 'destructive',
          })
          // Don't move — revert to original position
        } else {
          onTableMove(tableId, clampedX, clampedY)
        }
      }

      setActiveId(null)
    },
    [tables, onTableMove]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const activeTable = activeId ? tables.find((t) => t.id === activeId) : null

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Deselect table when clicking on empty canvas
    if (e.target === e.currentTarget) {
      onTableSelect(null)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToParentElement]}
    >
      <div
        className={cn(
          'relative bg-muted rounded-lg overflow-hidden',
          'border-2 border-dashed border-border',
          'min-h-[600px]',
          className
        )}
        onClick={handleCanvasClick}
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      >
        {tables.map((table) => (
          <DraggableTable
            key={table.id}
            table={table}
            isSelected={selectedTable?.id === table.id}
            onSelect={onTableSelect}
            isDragging={activeId === table.id}
          />
        ))}

        <DragOverlay dropAnimation={null}>
          {activeTable ? (
            <TableShape
              shape={activeTable.shape}
              status={activeTable.status}
              capacity={activeTable.capacity}
              tableNumber={activeTable.table_number}
              width={activeTable.width}
              height={activeTable.height}
              rotation={activeTable.rotation}
              isDragging
            />
          ) : null}
        </DragOverlay>

        {/* Empty state when no tables */}
        {tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">No tables in this section</p>
              <p className="text-sm mt-2">
                Click &quot;Add Table&quot; to create your first table
              </p>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  )
}
