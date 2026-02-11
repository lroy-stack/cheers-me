'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { TableShape } from './table-shape'
import type { Table } from './floor-plan-canvas'

interface DraggableTableProps {
  table: Table
  isSelected: boolean
  isDragging: boolean
  onSelect: (table: Table) => void
}

export function DraggableTable({
  table,
  isSelected,
  isDragging,
  onSelect,
}: DraggableTableProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: table.id,
    data: table,
  })

  const style = {
    position: 'absolute' as const,
    left: `${table.x_position}px`,
    top: `${table.y_position}px`,
    transform: CSS.Transform.toString(transform),
    zIndex: isSelected ? 10 : 1,
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(table)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
    >
      <TableShape
        shape={table.shape}
        status={table.status}
        capacity={table.capacity}
        tableNumber={table.table_number}
        width={table.width}
        height={table.height}
        rotation={table.rotation}
        isSelected={isSelected}
        isDragging={isDragging}
      />
    </div>
  )
}
