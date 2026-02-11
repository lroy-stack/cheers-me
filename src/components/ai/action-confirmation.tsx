'use client'

import { useTranslations } from 'next-intl'
import { ShieldAlert, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toolLabels } from './chat-tool-status'

interface ActionConfirmationProps {
  action: {
    id: string
    tool: string
    description: string
    parameters: Record<string, unknown>
  }
  onConfirm: (actionId: string) => void
  onReject: (actionId: string) => void
  isLoading?: boolean
}

function formatParamKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatParamValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function ActionConfirmation({
  action,
  onConfirm,
  onReject,
  isLoading = false,
}: ActionConfirmationProps) {
  const t = useTranslations('common.assistant')

  // Filter out internal/ID params that are less useful to show
  const displayParams = Object.entries(action.parameters).filter(
    ([key]) => !key.startsWith('_')
  )

  return (
    <Card className="border-primary/40 bg-primary/5/50 dark:bg-primary/5 mt-2">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <CardTitle className="text-sm font-semibold text-primary dark:text-primary">
            {t('actionRequired')}
          </CardTitle>
          <Badge variant="outline" className="ml-auto text-xs">
            {toolLabels[action.tool] || action.tool}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3">
        <p className="text-sm text-foreground mb-3">{action.description}</p>

        {displayParams.length > 0 && (
          <div className="rounded-md bg-background/80 border p-2 space-y-1">
            {displayParams.map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs gap-4">
                <span className="text-muted-foreground font-medium shrink-0">
                  {formatParamKey(key)}:
                </span>
                <span className="text-foreground text-right truncate">
                  {formatParamValue(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="px-4 pb-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onReject(action.id)}
          disabled={isLoading}
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <XCircle className="h-4 w-4 mr-1" />
          {t('cancel')}
        </Button>
        <Button
          size="sm"
          onClick={() => onConfirm(action.id)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-1" />
          )}
          {t('confirm')}
        </Button>
      </CardFooter>
    </Card>
  )
}
