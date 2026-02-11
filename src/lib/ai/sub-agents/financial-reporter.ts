/**
 * Financial Reporter Sub-Agent (stub — Phase 4)
 */

import type { SubAgentResult, ProgressCallback, SubAgentContext } from './types'

export async function executeFinancialReporter(
  _params: Record<string, unknown>,
  _context: SubAgentContext,
  progress: ProgressCallback
): Promise<SubAgentResult> {
  progress('Financial reporter not yet implemented')
  return {
    success: false,
    content: '',
    error: 'Financial reporter sub-agent is not yet implemented (Phase 4)',
  }
}
