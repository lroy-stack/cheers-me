/**
 * Example test file for event marketing auto-generation
 *
 * To run these tests:
 * 1. Set ANTHROPIC_API_KEY in .env.local
 * 2. Run: pnpm test src/lib/ai/event-marketing.test.example.ts
 *
 * Note: These are integration tests that call the real Claude API
 * For CI/CD, you may want to mock the Anthropic SDK
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { generateEventMarketing, generateEventMarketingSimple } from './event-marketing'

describe('Event Marketing Generation', () => {
  beforeAll(() => {
    // Ensure API key is set
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️  ANTHROPIC_API_KEY not set - tests will be skipped')
    }
  })

  it('should generate marketing content for a DJ night event', async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Skipping test - no API key')
      return
    }

    const input = {
      eventTitle: 'Summer Vibes Night',
      eventType: 'dj_night' as const,
      eventDate: '2025-07-15',
      startTime: '22:00',
      description: 'Join us for an unforgettable night of summer beats',
      djName: 'DJ Martinez',
      djGenre: 'House & Tech House',
    }

    const result = await generateEventMarketing(input)

    expect(result).toBeDefined()
    expect(result.social_caption).toBeTruthy()
    expect(result.social_hashtags).toBeTruthy()
    expect(result.suggested_platforms).toContain('instagram')
    expect(result.newsletter_mention).toBeTruthy()

    console.log('Generated DJ Night Content:')
    console.log('Caption:', result.social_caption.substring(0, 200) + '...')
    console.log('Hashtags:', result.social_hashtags)
    console.log('Newsletter:', result.newsletter_mention)
  }, 30000) // 30s timeout for API call

  it('should generate marketing content for a sports event', async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Skipping test - no API key')
      return
    }

    const input = {
      eventTitle: 'Champions League Final',
      eventType: 'sports' as const,
      eventDate: '2025-06-01',
      startTime: '21:00',
      sportName: 'Football',
      homeTeam: 'Real Madrid',
      awayTeam: 'Bayern Munich',
      broadcastChannel: 'DAZN',
    }

    const result = await generateEventMarketing(input)

    expect(result).toBeDefined()
    expect(result.social_caption).toContain('Real Madrid')
    expect(result.social_caption).toContain('Bayern Munich')
    expect(result.social_hashtags).toBeTruthy()

    console.log('Generated Sports Event Content:')
    console.log('Caption:', result.social_caption.substring(0, 200) + '...')
  }, 30000)

  it('should generate single-language content', async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Skipping test - no API key')
      return
    }

    const input = {
      eventTitle: 'Fiesta Ibicenca',
      eventType: 'themed_night' as const,
      eventDate: '2025-08-20',
      startTime: '22:00',
      description: 'White party with Mediterranean vibes',
    }

    const result = await generateEventMarketingSimple(input, 'es')

    expect(result).toBeDefined()
    expect(result.social_caption).toBeTruthy()
    expect(result.newsletter_mention).toBeTruthy()

    console.log('Generated Spanish Content:')
    console.log('Caption:', result.social_caption)
  }, 30000)
})

/**
 * Manual test script
 * Run with: ts-node src/lib/ai/event-marketing.test.example.ts
 */
if (require.main === module) {
  console.log('🧪 Running manual test...\n')

  const testInput = {
    eventTitle: 'Beach Party Sunset Session',
    eventType: 'dj_night' as const,
    eventDate: '2025-07-01',
    startTime: '20:00',
    djName: 'DJ Sunrise',
    djGenre: 'Balearic House',
  }

  generateEventMarketing(testInput)
    .then((result) => {
      console.log('✅ Success!\n')
      console.log('SOCIAL CAPTION:')
      console.log(result.social_caption)
      console.log('\nHASHTAGS:')
      console.log(result.social_hashtags)
      console.log('\nNEWSLETTER MENTION:')
      console.log(result.newsletter_mention)
      console.log('\nSUGGESTED PLATFORMS:')
      console.log(result.suggested_platforms.join(', '))
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}
