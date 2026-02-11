/**
 * Sub-Agent Dispatcher
 * Routes sub-agent tool calls to the appropriate specialist.
 */

import { executeDocumentGenerator } from './document-generator'
import { executeWebResearcher } from './web-researcher'
import { executeScheduleOptimizer } from './schedule-optimizer'
import { executeComplianceAuditor } from './compliance-auditor'
import { executeFinancialReporter } from './financial-reporter'
import { executeMarketingCampaign } from './marketing-campaign'
import { executeSportsEvents } from './sports-events'
import { executeAdvertisingManager } from './advertising-manager'
import { executeCocktailSpecialist } from './cocktail-specialist'
import type { SubAgentResult, ProgressCallback, SubAgentContext } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function executeSubAgentTool(
  agentName: string,
  params: Record<string, unknown>,
  userId: string,
  conversationId: string,
  supabase: unknown,
  progress: ProgressCallback
): Promise<SubAgentResult> {
  const startTime = Date.now()

  // Log task start
  let taskId: string | undefined
  try {
    const db = supabase as { from: (t: string) => { insert: (d: unknown) => { select: () => { single: () => Promise<{ data: { id: string } | null }> } } } }
    const { data } = await db.from('ai_subagent_tasks').insert({
      conversation_id: conversationId,
      user_id: userId,
      agent_type: agentName,
      task_params: params,
      status: 'running',
      model_used: ['schedule_optimizer', 'sports_events', 'cocktail_specialist', 'compliance_auditor'].includes(agentName) ? 'claude-sonnet-4-5-20250929' : 'claude-haiku-4-5-20251001',
    }).select().single()
    taskId = data?.id
  } catch {
    // Non-critical
  }

  // Fresh context per execution (Anthropic pattern)
  const context: SubAgentContext = {
    userId,
    conversationId,
    supabase: supabase as SupabaseClient,
    taskId: taskId || crypto.randomUUID(),
    startTime,
  }

  let result: SubAgentResult

  switch (agentName) {
    case 'document_generator':
      result = await executeDocumentGenerator(params, progress)
      break
    case 'web_researcher':
      result = await executeWebResearcher(params, userId, supabase, progress)
      break
    case 'schedule_optimizer':
      result = await executeScheduleOptimizer(params, context, progress)
      break
    case 'compliance_auditor':
      result = await executeComplianceAuditor(params, context, progress)
      break
    case 'financial_reporter':
      result = await executeFinancialReporter(params, context, progress)
      break
    case 'marketing_campaign':
      result = await executeMarketingCampaign(params, context, progress)
      break
    case 'sports_events':
      result = await executeSportsEvents(params, context, progress)
      break
    case 'advertising_manager':
      result = await executeAdvertisingManager(params, context, progress)
      break
    case 'cocktail_specialist':
      result = await executeCocktailSpecialist(params, context, progress)
      break
    default:
      result = {
        success: false,
        content: '',
        error: `Unknown sub-agent: ${agentName}`,
      }
  }

  // Log task completion
  if (taskId) {
    try {
      const db = supabase as { from: (t: string) => { update: (d: unknown) => { eq: (k: string, v: string) => Promise<unknown> } } }
      await db.from('ai_subagent_tasks').update({
        status: result.success ? 'completed' : 'failed',
        result: { content: result.content.slice(0, 5000) },
        artifacts: result.artifacts || [],
        token_usage: result.tokenUsage,
        duration_ms: result.durationMs || (Date.now() - startTime),
        error: result.error || null,
        completed_at: new Date().toISOString(),
      }).eq('id', taskId)
    } catch {
      // Non-critical
    }
  }

  return result
}

export type { SubAgentResult, ProgressCallback }
