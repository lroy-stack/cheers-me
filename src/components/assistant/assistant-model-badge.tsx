'use client'

import { Badge } from '@/components/ui/badge'
import { Zap, Brain } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AssistantModelBadgeProps {
  model: string
  reason?: string | null
}

export function AssistantModelBadge({ model, reason }: AssistantModelBadgeProps) {
  const isSonnet = model.includes('sonnet')
  const displayName = isSonnet ? 'Sonnet' : 'Haiku'
  const Icon = isSonnet ? Brain : Zap

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isSonnet ? 'default' : 'secondary'}
            className="gap-1 text-xs cursor-default"
          >
            <Icon className="h-3 w-3" />
            {displayName}
          </Badge>
        </TooltipTrigger>
        {reason && (
          <TooltipContent>
            <p className="text-xs">{reason}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
