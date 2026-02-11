'use client'

import { cn } from '@/lib/utils'

export type TableShapeType = 'round' | 'square' | 'rectangle'
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'

interface TableShapeProps {
  shape: TableShapeType
  status: TableStatus
  capacity: number
  tableNumber: string
  width?: number
  height?: number
  rotation?: number
  isSelected?: boolean
  isDragging?: boolean
  className?: string
}

const statusColors: Record<TableStatus, string> = {
  available: 'bg-green-500 border-green-600',
  occupied: 'bg-red-500 border-red-600',
  reserved: 'bg-primary border-primary',
  cleaning: 'bg-amber-400 border-amber-500',
}

export function TableShape({
  shape,
  status,
  capacity,
  tableNumber,
  width = 80,
  height = 80,
  rotation = 0,
  isSelected = false,
  isDragging = false,
  className,
}: TableShapeProps) {
  const baseClasses = cn(
    'flex items-center justify-center relative transition-all cursor-move',
    'border-2 shadow-md hover:shadow-lg',
    statusColors[status],
    {
      'ring-4 ring-blue-400 ring-offset-2': isSelected,
      'opacity-50 scale-95': isDragging,
    },
    className
  )

  const renderShape = () => {
    switch (shape) {
      case 'round':
        return (
          <div
            className={cn(baseClasses, 'rounded-full')}
            style={{
              width: `${width}px`,
              height: `${width}px`, // Keep it circular
              transform: `rotate(${rotation}deg)`,
            }}
          >
            <TableContent tableNumber={tableNumber} capacity={capacity} />
          </div>
        )

      case 'square':
        return (
          <div
            className={cn(baseClasses, 'rounded-md')}
            style={{
              width: `${width}px`,
              height: `${width}px`, // Keep it square
              transform: `rotate(${rotation}deg)`,
            }}
          >
            <TableContent tableNumber={tableNumber} capacity={capacity} />
          </div>
        )

      case 'rectangle':
        return (
          <div
            className={cn(baseClasses, 'rounded-md')}
            style={{
              width: `${width}px`,
              height: `${height}px`,
              transform: `rotate(${rotation}deg)`,
            }}
          >
            <TableContent tableNumber={tableNumber} capacity={capacity} />
          </div>
        )

      default:
        return null
    }
  }

  return renderShape()
}

function TableContent({
  tableNumber,
  capacity,
}: {
  tableNumber: string
  capacity: number
}) {
  return (
    <div className="flex flex-col items-center justify-center text-white select-none">
      <div className="text-sm font-bold">{tableNumber}</div>
      <div className="text-xs opacity-90">({capacity})</div>
    </div>
  )
}
