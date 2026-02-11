'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'

function getStatusColor(status: 'good' | 'warning' | 'danger') {
  switch (status) {
    case 'good':
      return 'text-green-500'
    case 'warning':
      return 'text-orange-500'
    case 'danger':
      return 'text-red-500'
  }
}

function StatusIcon({ status }: { status: 'good' | 'warning' | 'danger' }) {
  const className = `h-5 w-5 ${getStatusColor(status)}`
  switch (status) {
    case 'good':
      return <CheckCircle2 className={className} />
    case 'warning':
      return <AlertTriangle className={className} />
    case 'danger':
      return <AlertCircle className={className} />
  }
}

interface CostRatioGaugesProps {
  foodCostRatio: number
  beverageCostRatio: number
  laborCostRatio: number
  targetFoodCost: number
  targetBeverageCost: number
  targetLaborCost: number
}

export function CostRatioGauges({
  foodCostRatio,
  beverageCostRatio,
  laborCostRatio,
  targetFoodCost,
  targetBeverageCost,
  targetLaborCost,
}: CostRatioGaugesProps) {
  const t = useTranslations('finance')

  const getRatioStatus = (actual: number, target: number) => {
    if (actual <= target) return 'good'
    if (actual <= target * 1.1) return 'warning' // Within 10% of target
    return 'danger'
  }

  const foodStatus = getRatioStatus(foodCostRatio, targetFoodCost)
  const beverageStatus = getRatioStatus(beverageCostRatio, targetBeverageCost)
  const laborStatus = getRatioStatus(laborCostRatio, targetLaborCost)

  const getStatusText = (status: 'good' | 'warning' | 'danger', actual: number, target: number) => {
    if (status === 'good') return `✓ ${t('ratios.withinTarget')}`
    if (status === 'warning') return `⚠ ${t('ratios.slightlyAbove')}`
    return `⚠ ${t('ratios.overTarget', { value: (actual - target).toFixed(1) })}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('ratios.title')}</CardTitle>
        <CardDescription>{t('ratios.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Food Cost Ratio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon status={foodStatus} />
              <span className="font-medium">{t('ratios.foodCostRatio')}</span>
            </div>
            <div className="text-right">
              <span className={`text-xl font-bold ${getStatusColor(foodStatus)}`}>
                {foodCostRatio.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                / {targetFoodCost.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="relative">
            <Progress
              value={Math.min((foodCostRatio / targetFoodCost) * 100, 100)}
              className="h-3"
            />
            <div
              className="absolute top-0 h-3 w-0.5 bg-card dark:bg-card"
              style={{ left: '100%' }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {getStatusText(foodStatus, foodCostRatio, targetFoodCost)}
          </p>
        </div>

        {/* Beverage Cost Ratio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon status={beverageStatus} />
              <span className="font-medium">{t('ratios.beverageCostRatio')}</span>
            </div>
            <div className="text-right">
              <span className={`text-xl font-bold ${getStatusColor(beverageStatus)}`}>
                {beverageCostRatio.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                / {targetBeverageCost.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="relative">
            <Progress
              value={Math.min((beverageCostRatio / targetBeverageCost) * 100, 100)}
              className="h-3"
            />
            <div
              className="absolute top-0 h-3 w-0.5 bg-card dark:bg-card"
              style={{ left: '100%' }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {getStatusText(beverageStatus, beverageCostRatio, targetBeverageCost)}
          </p>
        </div>

        {/* Labor Cost Ratio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon status={laborStatus} />
              <span className="font-medium">{t('ratios.laborCostRatio')}</span>
            </div>
            <div className="text-right">
              <span className={`text-xl font-bold ${getStatusColor(laborStatus)}`}>
                {laborCostRatio.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                / {targetLaborCost.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="relative">
            <Progress
              value={Math.min((laborCostRatio / targetLaborCost) * 100, 100)}
              className="h-3"
            />
            <div
              className="absolute top-0 h-3 w-0.5 bg-card dark:bg-card"
              style={{ left: '100%' }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {getStatusText(laborStatus, laborCostRatio, targetLaborCost)}
          </p>
        </div>

        {/* Overall Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('ratios.overallStatus')}</span>
            {foodStatus === 'good' && beverageStatus === 'good' && laborStatus === 'good' ? (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                {t('ratios.allTargetsMet')}
              </Badge>
            ) : foodStatus === 'danger' || beverageStatus === 'danger' || laborStatus === 'danger' ? (
              <Badge variant="destructive">{t('ratios.actionRequired')}</Badge>
            ) : (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                {t('ratios.reviewNeeded')}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
