'use client'

import { useTranslations } from 'next-intl'
import { BeerKegWithProduct } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Beer, MoreVertical, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface BeerKegGridProps {
  kegs: BeerKegWithProduct[]
  onUpdateKeg?: (keg: BeerKegWithProduct) => void
  onMarkEmpty?: (kegId: string) => void
}

export function BeerKegGrid({ kegs, onUpdateKeg, onMarkEmpty }: BeerKegGridProps) {
  const t = useTranslations('stock')

  const getKegStatusColor = (percentRemaining: number) => {
    if (percentRemaining === 0) return 'text-red-500'
    if (percentRemaining < 20) return 'text-orange-500'
    if (percentRemaining < 50) return 'text-primary'
    return 'text-green-500'
  }

  const getKegStatusBadge = (percentRemaining: number, status: string) => {
    if (status === 'empty') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          {t('beers.empty')}
        </Badge>
      )
    }

    if (percentRemaining < 20) {
      return (
        <Badge variant="default" className="gap-1 bg-orange-500">
          <AlertCircle className="h-3 w-3" />
          {t('beers.critical')}
        </Badge>
      )
    }

    if (percentRemaining < 50) {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          {t('beers.low')}
        </Badge>
      )
    }

    return (
      <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle2 className="h-3 w-3" />
        {t('beers.good')}
      </Badge>
    )
  }

  // Sort kegs: active first, then by percent remaining (lowest first for alerts)
  const sortedKegs = [...kegs].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'active' ? -1 : 1
    }
    return a.percent_remaining - b.percent_remaining
  })

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedKegs.map((keg) => (
        <Card
          key={keg.id}
          className={cn(
            'relative overflow-hidden transition-all hover:shadow-md',
            keg.status === 'empty' && 'opacity-60'
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Beer className={cn('h-5 w-5', getKegStatusColor(keg.percent_remaining))} />
                <CardTitle className="text-base">{keg.product.name}</CardTitle>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {onUpdateKeg && keg.status === 'active' && (
                    <DropdownMenuItem onClick={() => onUpdateKeg(keg)}>
                      {t('beers.tapKeg')}
                    </DropdownMenuItem>
                  )}
                  {onMarkEmpty && keg.status === 'active' && (
                    <DropdownMenuItem
                      onClick={() => onMarkEmpty(keg.id)}
                      className="text-destructive"
                    >
                      {t('beers.markEmpty')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {getKegStatusBadge(keg.percent_remaining, keg.status)}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Keg size info */}
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">{t('beers.kegSize')}</span>
              <span className="font-medium">{keg.keg_size_liters}L</span>
            </div>

            {/* Current level with progress */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">{t('beers.remaining')}</span>
                <span className={cn('text-lg font-bold', getKegStatusColor(keg.percent_remaining))}>
                  {keg.current_liters.toFixed(1)}L
                </span>
              </div>
              <Progress value={keg.percent_remaining} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{keg.percent_remaining.toFixed(0)}%</span>
                <span>{t('beers.consumed', { liters: keg.liters_consumed.toFixed(1) })}</span>
              </div>
            </div>

            {/* Tapped time */}
            <div className="flex items-baseline justify-between text-xs text-muted-foreground">
              <span>{t('beers.tappedAt')}</span>
              <span>{format(new Date(keg.tapped_at), 'MMM d, HH:mm')}</span>
            </div>

            {/* Notes if any */}
            {keg.notes && (
              <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                {keg.notes}
              </div>
            )}
          </CardContent>

          {/* Visual indicator bar at bottom */}
          <div
            className={cn(
              'absolute bottom-0 left-0 h-1 transition-all',
              keg.status === 'empty'
                ? 'bg-red-500'
                : keg.percent_remaining < 20
                  ? 'bg-orange-500'
                  : keg.percent_remaining < 50
                    ? 'bg-primary'
                    : 'bg-green-500'
            )}
            style={{ width: `${keg.percent_remaining}%` }}
          />
        </Card>
      ))}

      {kegs.length === 0 && (
        <Card className="col-span-full">
          <CardContent className="flex h-32 items-center justify-center text-muted-foreground">
            {t('beers.noKegs')}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Summary stats component
interface BeerKegStatsProps {
  kegs: BeerKegWithProduct[]
}

export function BeerKegStats({ kegs }: BeerKegStatsProps) {
  const t = useTranslations('stock')
  const activeKegs = kegs.filter((k) => k.status === 'active')
  const criticalKegs = activeKegs.filter((k) => k.percent_remaining < 20)
  const lowKegs = activeKegs.filter((k) => k.percent_remaining >= 20 && k.percent_remaining < 50)
  const totalLitersRemaining = activeKegs.reduce((sum, k) => sum + k.current_liters, 0)
  const totalCapacity = activeKegs.reduce((sum, k) => sum + k.keg_size_liters, 0)

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{activeKegs.length}</div>
          <p className="text-xs text-muted-foreground">{t('beers.tapped')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-orange-500">{criticalKegs.length}</div>
          <p className="text-xs text-muted-foreground">{t('beers.criticalBelow20')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-primary">{lowKegs.length}</div>
          <p className="text-xs text-muted-foreground">{t('beers.lowRange')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{totalLitersRemaining.toFixed(1)}L</div>
          <p className="text-xs text-muted-foreground">
            {t('beers.litersRemaining')} ({totalCapacity > 0 ? ((totalLitersRemaining / totalCapacity) * 100).toFixed(0) : 0}%)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
