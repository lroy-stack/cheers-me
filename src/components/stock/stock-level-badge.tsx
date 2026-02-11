'use client'

import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface StockLevelBadgeProps {
  currentStock: number
  minStock: number | null
  maxStock?: number | null
  className?: string
}

export function StockLevelBadge({
  currentStock,
  minStock,
  maxStock,
  className,
}: StockLevelBadgeProps) {
  const t = useTranslations('stock')

  // Determine stock status
  const getStockStatus = () => {
    if (currentStock === 0) {
      return {
        label: t('inventory.outOfStock'),
        variant: 'destructive' as const,
        icon: XCircle,
        color: 'text-red-500',
      }
    }

    if (minStock !== null && currentStock < minStock) {
      return {
        label: t('inventory.lowStock'),
        variant: 'default' as const,
        icon: AlertTriangle,
        color: 'text-primary',
      }
    }

    if (maxStock !== null && maxStock !== undefined && currentStock > maxStock) {
      return {
        label: t('inventory.overstock'),
        variant: 'secondary' as const,
        icon: AlertTriangle,
        color: 'text-blue-500',
      }
    }

    return {
      label: t('inventory.inStock'),
      variant: 'secondary' as const,
      icon: CheckCircle,
      color: 'text-green-500',
    }
  }

  const status = getStockStatus()
  const Icon = status.icon

  return (
    <Badge variant={status.variant} className={cn('gap-1', className)}>
      <Icon className={cn('h-3 w-3', status.color)} />
      {status.label}
    </Badge>
  )
}

interface StockProgressBarProps {
  currentStock: number
  minStock: number | null
  maxStock: number | null
  className?: string
}

export function StockProgressBar({
  currentStock,
  minStock,
  maxStock,
  className,
}: StockProgressBarProps) {
  const t = useTranslations('stock')
  // Calculate percentage based on max stock, or use min stock as baseline
  const getPercentage = () => {
    if (maxStock && maxStock > 0) {
      return Math.min((currentStock / maxStock) * 100, 100)
    }
    if (minStock && minStock > 0) {
      return Math.min((currentStock / (minStock * 2)) * 100, 100)
    }
    return 50 // Default if no reference
  }

  const percentage = getPercentage()

  // Determine color based on stock level
  const getColor = () => {
    if (currentStock === 0) return 'bg-red-500'
    if (minStock !== null && currentStock < minStock) return 'bg-primary'
    return 'bg-green-500'
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t('inventory.currentStock')}</span>
        <span className="font-medium">{currentStock.toFixed(1)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn('h-full transition-all', getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        {minStock !== null && <span>{t('inventory.minStock')}: {minStock}</span>}
        {maxStock !== null && <span>{t('inventory.maxStock', { n: maxStock })}</span>}
      </div>
    </div>
  )
}
