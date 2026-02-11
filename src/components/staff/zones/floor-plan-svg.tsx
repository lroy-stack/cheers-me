'use client'

import { useMemo, useRef } from 'react'
import type { FloorSection, FloorTable, ZoneAssignment } from '@/types'
import { useTranslations } from 'next-intl'

// Section colors palette
const SECTION_COLORS = [
  { bg: '#dbeafe', stroke: '#3b82f6', label: 'blue' },
  { bg: '#dcfce7', stroke: '#22c55e', label: 'green' },
  { bg: '#fef3c7', stroke: '#f59e0b', label: 'amber' },
  { bg: '#fce7f3', stroke: '#ec4899', label: 'pink' },
  { bg: '#e0e7ff', stroke: '#6366f1', label: 'indigo' },
  { bg: '#fae8ff', stroke: '#a855f7', label: 'purple' },
  { bg: '#ffedd5', stroke: '#f97316', label: 'orange' },
  { bg: '#ccfbf1', stroke: '#14b8a6', label: 'teal' },
]

interface FloorPlanSVGProps {
  sections: FloorSection[]
  tables: FloorTable[]
  assignments?: ZoneAssignment[]
  interactive?: boolean
  selectedSectionId?: string | null
  onSectionClick?: (sectionId: string) => void
  onTableClick?: (tableId: string) => void
  className?: string
}

export function FloorPlanSVG({
  sections,
  tables,
  assignments = [],
  interactive = false,
  selectedSectionId,
  onSectionClick,
  onTableClick,
  className,
}: FloorPlanSVGProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const t = useTranslations('common')

  // Compute viewBox from table positions
  const viewBox = useMemo(() => {
    if (tables.length === 0) return { x: 0, y: 0, w: 800, h: 600 }
    const padding = 60
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const t of tables) {
      const w = t.width || 80
      const h = t.height || 80
      minX = Math.min(minX, t.x_position)
      minY = Math.min(minY, t.y_position)
      maxX = Math.max(maxX, t.x_position + w)
      maxY = Math.max(maxY, t.y_position + h)
    }
    return {
      x: minX - padding,
      y: minY - padding,
      w: maxX - minX + padding * 2,
      h: maxY - minY + padding * 2,
    }
  }, [tables])

  // Group tables by section
  const tablesBySection = useMemo(() => {
    const map = new Map<string, FloorTable[]>()
    for (const t of tables) {
      const sid = t.section_id || 'none'
      if (!map.has(sid)) map.set(sid, [])
      map.get(sid)!.push(t)
    }
    return map
  }, [tables])

  // Section color map
  const sectionColorMap = useMemo(() => {
    const map = new Map<string, typeof SECTION_COLORS[0]>()
    sections.forEach((s, i) => {
      map.set(s.id, SECTION_COLORS[i % SECTION_COLORS.length])
    })
    return map
  }, [sections])

  // Assignment map: section_id -> employee names
  const assignmentMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const a of assignments) {
      if (!map.has(a.section_id)) map.set(a.section_id, [])
      const name = a.employee?.profile?.full_name || 'Unknown'
      map.get(a.section_id)!.push(name)
    }
    return map
  }, [assignments])

  // Compute bounding box per section (from its tables)
  // Uses tight padding (6px) to avoid overlap between adjacent sections
  const sectionBounds = useMemo(() => {
    const pad = 6
    const raw = new Map<string, { x: number; y: number; w: number; h: number }>()
    for (const [sectionId, sectionTables] of tablesBySection) {
      if (sectionId === 'none') continue
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const t of sectionTables) {
        const w = t.width || 80
        const h = t.height || 80
        minX = Math.min(minX, t.x_position)
        minY = Math.min(minY, t.y_position)
        maxX = Math.max(maxX, t.x_position + w)
        maxY = Math.max(maxY, t.y_position + h)
      }
      raw.set(sectionId, {
        x: minX - pad,
        y: minY - pad,
        w: maxX - minX + pad * 2,
        h: maxY - minY + pad * 2,
      })
    }

    // Resolve overlaps: shrink each pair towards their own center
    const ids = [...raw.keys()]
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = raw.get(ids[i])!
        const b = raw.get(ids[j])!

        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)

        if (overlapX > 0 && overlapY > 0) {
          // Shrink along the axis with the smaller overlap (less disruptive)
          if (overlapX < overlapY) {
            const half = overlapX / 2 + 1
            if (a.x < b.x) {
              a.w -= half
              b.x += half
              b.w -= half
            } else {
              b.w -= half
              a.x += half
              a.w -= half
            }
          } else {
            const half = overlapY / 2 + 1
            if (a.y < b.y) {
              a.h -= half
              b.y += half
              b.h -= half
            } else {
              b.h -= half
              a.y += half
              a.h -= half
            }
          }
        }
      }
    }

    return raw
  }, [tablesBySection])

  const renderTable = (table: FloorTable) => {
    const w = table.width || 80
    const h = table.height || 80
    const cx = table.x_position + w / 2
    const cy = table.y_position + h / 2
    const sectionColor = table.section_id ? sectionColorMap.get(table.section_id) : null
    const fillColor = sectionColor?.stroke || '#6b7280'

    const handleClick = () => {
      if (interactive && onTableClick) onTableClick(table.id)
    }

    const transform = table.rotation
      ? `rotate(${table.rotation}, ${cx}, ${cy})`
      : undefined

    return (
      <g key={table.id} transform={transform} onClick={handleClick} style={interactive ? { cursor: 'pointer' } : undefined}>
        {table.shape === 'round' ? (
          <circle
            cx={cx}
            cy={cy}
            r={w / 2}
            fill={fillColor}
            fillOpacity={0.7}
            stroke={fillColor}
            strokeWidth={2}
          />
        ) : (
          <rect
            x={table.x_position}
            y={table.y_position}
            width={w}
            height={table.shape === 'square' ? w : h}
            rx={4}
            fill={fillColor}
            fillOpacity={0.7}
            stroke={fillColor}
            strokeWidth={2}
          />
        )}
        {/* Table number */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={12}
          fontWeight="bold"
        >
          {table.table_number}
        </text>
        {/* Capacity */}
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={9}
          opacity={0.9}
        >
          ({table.capacity})
        </text>
      </g>
    )
  }

  return (
    <div className={className}>
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-full"
        style={{ minHeight: 300 }}
      >
        {/* Background */}
        <rect
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.w}
          height={viewBox.h}
          fill="#f8fafc"
        />

        {/* Grid pattern */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.w}
          height={viewBox.h}
          fill="url(#grid)"
        />

        {/* Section backgrounds */}
        {sections.map((section) => {
          const bounds = sectionBounds.get(section.id)
          if (!bounds) return null
          const color = sectionColorMap.get(section.id)
          if (!color) return null
          const isSelected = selectedSectionId === section.id

          return (
            <g
              key={section.id}
              onClick={() => interactive && onSectionClick?.(section.id)}
              style={interactive ? { cursor: 'pointer' } : undefined}
            >
              <rect
                x={bounds.x}
                y={bounds.y}
                width={bounds.w}
                height={bounds.h}
                rx={6}
                fill={color.bg}
                fillOpacity={isSelected ? 0.45 : 0.15}
                stroke={color.stroke}
                strokeWidth={isSelected ? 2.5 : 1}
                strokeDasharray={isSelected ? undefined : '4 2'}
              />
              {/* Section label */}
              <text
                x={bounds.x + 8}
                y={bounds.y + 16}
                fill={color.stroke}
                fontSize={11}
                fontWeight="600"
              >
                {section.name}
              </text>
              {/* Assigned employees */}
              {assignmentMap.get(section.id)?.map((name, i) => (
                <text
                  key={i}
                  x={bounds.x + 8}
                  y={bounds.y + bounds.h - 8 - (assignmentMap.get(section.id)!.length - 1 - i) * 14}
                  fill={color.stroke}
                  fontSize={10}
                  fontStyle="italic"
                >
                  {name}
                </text>
              ))}
            </g>
          )
        })}

        {/* Tables */}
        {tables.filter(t => t.is_active).map(renderTable)}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 px-2">
        {sections.filter(s => s.is_active).map((section) => {
          const color = sectionColorMap.get(section.id)
          if (!color) return null
          const assignees = assignmentMap.get(section.id)
          const tablesInSection = tablesBySection.get(section.id)?.length || 0

          return (
            <div
              key={section.id}
              className="flex items-center gap-1.5 text-xs"
              onClick={() => interactive && onSectionClick?.(section.id)}
              style={interactive ? { cursor: 'pointer' } : undefined}
            >
              <div
                className="w-3 h-3 rounded-sm border"
                style={{ backgroundColor: color.bg, borderColor: color.stroke }}
              />
              <span className="font-medium">{section.name}</span>
              <span className="text-muted-foreground">({tablesInSection} {t.has('tables') ? t('tables') : 'tables'})</span>
              {assignees && assignees.length > 0 && (
                <span className="text-muted-foreground">— {assignees.join(', ')}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Export SVG ref for external use
export { type FloorPlanSVGProps }
