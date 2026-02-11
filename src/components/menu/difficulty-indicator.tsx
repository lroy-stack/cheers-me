'use client'

import type { DifficultyLevel } from '@/types'

const CONFIG: Record<DifficultyLevel, { dots: number; color: string; label: string }> = {
  easy: { dots: 1, color: 'bg-green-500', label: 'Easy' },
  medium: { dots: 2, color: 'bg-amber-500', label: 'Medium' },
  advanced: { dots: 3, color: 'bg-red-500', label: 'Advanced' },
}

interface DifficultyIndicatorProps {
  level: DifficultyLevel
  showLabel?: boolean
}

export function DifficultyIndicator({ level, showLabel = true }: DifficultyIndicatorProps) {
  const { dots, color, label } = CONFIG[level]

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${i < dots ? color : 'bg-muted'}`}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
    </div>
  )
}
