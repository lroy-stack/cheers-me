'use client'

import { useTranslations } from 'next-intl'
import { Loader2, CheckCircle2, XCircle, FileText, Globe, CalendarClock, ShieldCheck, BarChart3, Megaphone, Trophy, Newspaper, Wine } from 'lucide-react'
import type { SubAgentEvent, SubAgentType } from '@/lib/ai/types'

interface SubAgentStatusProps {
  event: SubAgentEvent
}

const agentIcons: Record<SubAgentType, React.ElementType> = {
  document_generator: FileText,
  web_researcher: Globe,
  schedule_optimizer: CalendarClock,
  compliance_auditor: ShieldCheck,
  financial_reporter: BarChart3,
  marketing_campaign: Megaphone,
  sports_events: Trophy,
  advertising_manager: Newspaper,
  cocktail_specialist: Wine,
}

const agentLabels: Record<SubAgentType, string> = {
  document_generator: 'documentGenerator',
  web_researcher: 'webResearcher',
  schedule_optimizer: 'scheduleOptimizer',
  compliance_auditor: 'complianceAuditor',
  financial_reporter: 'financialReporter',
  marketing_campaign: 'marketingCampaign',
  sports_events: 'sportsEvents',
  advertising_manager: 'advertisingManager',
  cocktail_specialist: 'cocktailSpecialist',
}

export function SubAgentStatus({ event }: SubAgentStatusProps) {
  const t = useTranslations('common.assistant')
  const Icon = agentIcons[event.agent] || FileText
  const labelKey = agentLabels[event.agent] || event.agent

  const isDone = event.success !== undefined
  const isError = event.error !== undefined

  return (
    <div className="flex items-start gap-3 mb-4 ml-11">
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2">
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">{t(labelKey)}</p>
          {event.task && (
            <p className="text-xs text-muted-foreground truncate">{event.task}</p>
          )}
          {event.step && (
            <p className="text-xs text-muted-foreground">{event.step}</p>
          )}
        </div>
        {isDone ? (
          isError ? (
            <XCircle className="h-4 w-4 text-destructive shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          )
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        )}
      </div>
    </div>
  )
}
