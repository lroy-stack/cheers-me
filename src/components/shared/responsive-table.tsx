'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ColumnDef<T> {
  key: string
  header: string
  accessor: (row: T) => React.ReactNode
  className?: string
  headerClassName?: string
  hideOnMobile?: boolean
  hideOnTablet?: boolean
}

interface ResponsiveTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  getRowKey: (row: T) => string
  onRowClick?: (row: T) => void
  emptyMessage?: string
  cardRender?: (row: T) => React.ReactNode
  className?: string
}

export function ResponsiveTable<T>({
  data,
  columns,
  getRowKey,
  onRowClick,
  emptyMessage = 'No data available',
  cardRender,
  className,
}: ResponsiveTableProps<T>) {
  return (
    <>
      {/* Desktop Table View - hidden on mobile */}
      <div className={cn('hidden md:block rounded-md border overflow-x-auto', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.headerClassName,
                    col.hideOnMobile && 'hidden md:table-cell',
                    col.hideOnTablet && 'hidden lg:table-cell'
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={getRowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        col.className,
                        col.hideOnMobile && 'hidden md:table-cell',
                        col.hideOnTablet && 'hidden lg:table-cell'
                      )}
                    >
                      {col.accessor(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View - shown only on mobile */}
      <div className="block md:hidden space-y-3">
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
        ) : cardRender ? (
          data.map((row) => (
            <div
              key={getRowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'rounded-lg border border-border bg-card p-4 shadow-sm',
                onRowClick && 'cursor-pointer active:bg-muted/50'
              )}
            >
              {cardRender(row)}
            </div>
          ))
        ) : (
          data.map((row) => (
            <div
              key={getRowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'rounded-lg border border-border bg-card p-4 shadow-sm space-y-3',
                onRowClick && 'cursor-pointer active:bg-muted/50'
              )}
            >
              {columns
                .filter((col) => !col.hideOnMobile)
                .map((col) => (
                  <div key={col.key} className="flex justify-between items-start gap-4">
                    <div className="text-sm font-medium text-muted-foreground min-w-[100px]">
                      {col.header}
                    </div>
                    <div className="text-sm text-foreground flex-1 text-right">
                      {col.accessor(row)}
                    </div>
                  </div>
                ))}
            </div>
          ))
        )}
      </div>
    </>
  )
}
