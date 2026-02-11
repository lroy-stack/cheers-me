/**
 * Model Router
 * Selects Haiku vs Sonnet based on message complexity.
 * Haiku (~$1/MTok) for operational queries, Sonnet (~$3/MTok) for complex reasoning.
 */

import type { ModelId, ModelSelection } from './types'

const HAIKU: ModelId = 'claude-haiku-4-5-20251001'
const SONNET: ModelId = 'claude-sonnet-4-5-20250929'

const COMPLEX_PATTERNS = [
  /financ|p&l|profit|loss|budget|forecast|tax|modelo/i,
  /analyz|analysis|trend|compar|optimiz|strateg/i,
  /report|generate.*report|weekly.*summary|monthly/i,
  /schedule.*optim|labor.*plan|staff.*recommend/i,
  /research|search.*web|competitor|local.*event/i,
  /document.*generat|pdf|invoice|menu.*design/i,
  /ad\b|advertis|coupon|gift.*vouch|promo/i,
  /cocktail.*card|recipe.*image|cocktail.*social|mixol|recipe.*pdf/i,
  /task.*plan|weekly.*plan.*task|planifica.*tarea|zone.*assign|asigna.*zona/i,
  /generat.*image|image.*generat|crea.*imagen|genera.*imagen|foto|afbeelding.*maa|bild.*erstell|\bimage\b.*post|\bimagen\b/i,
]

const COMPLEX_REASONS: Record<number, string> = {
  0: 'Financial analysis',
  1: 'Analytical reasoning',
  2: 'Report generation',
  3: 'Schedule optimization',
  4: 'Web research',
  5: 'Document generation',
  6: 'Advertising management',
  7: 'Cocktail creative content',
  8: 'Task planning',
  9: 'Image generation',
}

export function selectModel(message: string, override?: ModelId): ModelSelection {
  if (override) {
    return { model: override, reason: 'User override', isOverride: true }
  }

  for (let i = 0; i < COMPLEX_PATTERNS.length; i++) {
    if (COMPLEX_PATTERNS[i].test(message)) {
      return { model: SONNET, reason: COMPLEX_REASONS[i], isOverride: false }
    }
  }

  return { model: HAIKU, reason: 'Standard query', isOverride: false }
}

export function getModelDisplayName(model: ModelId): string {
  if (model.includes('sonnet')) return 'Sonnet'
  return 'Haiku'
}

export function getMaxTokensForModel(model: ModelId): number {
  if (model.includes('sonnet')) return 8192
  return 4096
}
