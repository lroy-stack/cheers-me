'use client'

import { useMemo, useState, useEffect, ReactNode } from 'react'

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => ReactNode
  priority?: number // Lower = shown first on mobile (1 = always visible)
}

interface ResponsiveTableProps<T> {
  data: T[]
  columns: Column<T>[]
  cardRenderer?: (item: T) => ReactNode
  breakpoint?: number
  keyExtractor: (item: T) => string
  emptyMessage?: string
}

function useIsMobile(breakpoint: number) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    setIsMobile(mql.matches)

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}

export function ResponsiveTable<T extends Record<string, unknown>>({
  data,
  columns,
  cardRenderer,
  breakpoint = 768,
  keyExtractor,
  emptyMessage = 'No data',
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile(breakpoint)

  // Sort columns by priority for mobile card view
  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99)),
    [columns]
  )

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  // Mobile: card layout
  if (isMobile && cardRenderer) {
    return (
      <div className="space-y-3 p-2">
        {data.map(item => (
          <div key={keyExtractor(item)} className="border rounded-lg p-3 bg-card">
            {cardRenderer(item)}
          </div>
        ))}
      </div>
    )
  }

  if (isMobile) {
    // Default mobile card: stacked key-value pairs
    return (
      <div className="space-y-3 p-2">
        {data.map(item => (
          <div key={keyExtractor(item)} className="border rounded-lg p-3 bg-card space-y-1.5">
            {sortedColumns.map(col => {
              const value = col.render ? col.render(item) : String(item[col.key] ?? '')
              return (
                <div key={col.key} className="flex justify-between items-start gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">{col.header}</span>
                  <span className="text-sm text-right">{value}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  // Desktop: table layout
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            {columns.map(col => (
              <th key={col.key} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={keyExtractor(item)} className="border-b last:border-0 hover:bg-muted/20">
              {columns.map(col => (
                <td key={col.key} className="px-3 py-2">
                  {col.render ? col.render(item) : String(item[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
