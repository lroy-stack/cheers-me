/**
 * Token Cost Calculator
 * Pricing per million tokens ($/MTok) for Anthropic models.
 */

interface TokenUsage {
  input_tokens: number
  output_tokens: number
  cache_write_tokens?: number
  cache_read_tokens?: number
}

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
}

// Cache token multipliers relative to standard input price
const CACHE_WRITE_MULTIPLIER = 1.25
const CACHE_READ_MULTIPLIER = 0.10

export function calculateCost(usage: TokenUsage, model: string): number {
  const pricing = PRICING[model] || PRICING['claude-haiku-4-5-20251001']
  const inputCost = (usage.input_tokens / 1_000_000) * pricing.input
  const outputCost = (usage.output_tokens / 1_000_000) * pricing.output
  const cacheWriteCost = ((usage.cache_write_tokens || 0) / 1_000_000) * pricing.input * CACHE_WRITE_MULTIPLIER
  const cacheReadCost = ((usage.cache_read_tokens || 0) / 1_000_000) * pricing.input * CACHE_READ_MULTIPLIER
  return inputCost + outputCost + cacheWriteCost + cacheReadCost
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

export function calculateCacheHitRate(usage: TokenUsage): number {
  const totalCacheTokens = (usage.cache_write_tokens || 0) + (usage.cache_read_tokens || 0)
  if (totalCacheTokens === 0) return 0
  return (usage.cache_read_tokens || 0) / totalCacheTokens
}
