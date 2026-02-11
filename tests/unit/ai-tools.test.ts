import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AI_TOOLS } from '@/lib/ai/tool-definitions'

describe('AI Tool Definitions', () => {
  it('should have all 12 tools defined', () => {
    expect(AI_TOOLS).toBeDefined()
    expect(AI_TOOLS.length).toBe(12)
  })

  describe('Tool Schema Validation', () => {
    it('all tools have required properties', () => {
      AI_TOOLS.forEach((tool) => {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('input_schema')

        expect(typeof tool.name).toBe('string')
        expect(typeof tool.description).toBe('string')
        expect(typeof tool.input_schema).toBe('object')
      })
    })

    it('all input_schema have type object', () => {
      AI_TOOLS.forEach((tool) => {
        expect(tool.input_schema).toHaveProperty('type')
        expect(tool.input_schema.type).toBe('object')
      })
    })

    it('all tools have properties defined', () => {
      AI_TOOLS.forEach((tool) => {
        expect(tool.input_schema).toHaveProperty('properties')
        expect(typeof tool.input_schema.properties).toBe('object')
      })
    })
  })

  describe('Individual Tool Definitions', () => {
    it('has query_sales tool', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'query_sales')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('sales')
      expect(tool?.input_schema.required).toContain('date_from')
    })

    it('has get_stock_levels tool', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'get_stock_levels')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('stock')
    })

    it('has get_staff_schedule tool', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'get_staff_schedule')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('schedule')
      expect(tool?.input_schema.required).toContain('date')
    })

    it('has get_reservations tool', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'get_reservations')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('reservations')
      expect(tool?.input_schema.required).toContain('date')
    })

    it('has generate_social_post tool', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'generate_social_post')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('social media')
      expect(tool?.input_schema.required).toContain('topic')
    })

    it('has draft_newsletter tool', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'draft_newsletter')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('newsletter')
      expect(tool?.input_schema.required).toContain('week_start')
    })

    it('has get_events tool', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'get_events')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('events')
      expect(tool?.input_schema.required).toContain('date_from')
    })

    it('has query_financials tool', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'query_financials')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('financial')
      expect(tool?.input_schema.required).toContain('period')
    })

    it('has get_reviews tool', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'get_reviews')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('reviews')
    })

    it('has draft_review_reply tool', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'draft_review_reply')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('reply')
      expect(tool?.input_schema.required).toContain('review_id')
    })

    it('has suggest_schedule tool', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'suggest_schedule')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('schedule')
      expect(tool?.input_schema.required).toContain('date')
    })

    it('has predict_demand tool', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'predict_demand')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('demand')
      expect(tool?.input_schema.required).toContain('date')
    })
  })

  describe('Tool Enums and Constraints', () => {
    it('query_sales has valid compare_with enum', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'query_sales')
      const compareWith = (tool?.input_schema.properties as any).compare_with
      expect(compareWith.enum).toContain('previous_period')
      expect(compareWith.enum).toContain('same_period_last_year')
      expect(compareWith.enum).toContain('none')
    })

    it('generate_social_post has platform options', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'generate_social_post')
      const platform = (tool?.input_schema.properties as any).platform
      expect(platform.enum).toContain('instagram')
      expect(platform.enum).toContain('facebook')
      expect(platform.enum).toContain('both')
    })

    it('get_events has event_type options', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'get_events')
      const eventType = (tool?.input_schema.properties as any).event_type
      expect(eventType.enum).toContain('dj_night')
      expect(eventType.enum).toContain('sports')
      expect(eventType.enum).toContain('themed')
    })

    it('query_financials has period options', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'query_financials')
      const period = (tool?.input_schema.properties as any).period
      expect(period.enum).toContain('today')
      expect(period.enum).toContain('this_week')
      expect(period.enum).toContain('this_month')
      expect(period.enum).toContain('last_month')
      expect(period.enum).toContain('custom')
    })

    it('get_reviews has sentiment options', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'get_reviews')
      const sentiment = (tool?.input_schema.properties as any).sentiment
      expect(sentiment.enum).toContain('positive')
      expect(sentiment.enum).toContain('neutral')
      expect(sentiment.enum).toContain('negative')
      expect(sentiment.enum).toContain('all')
    })
  })

  describe('Tool Properties', () => {
    it('each tool has meaningful descriptions', () => {
      AI_TOOLS.forEach((tool) => {
        expect(tool.description.length).toBeGreaterThan(10)
        expect(tool.description).not.toBe('')
      })
    })

    it('tools have proper input schema documentation', () => {
      AI_TOOLS.forEach((tool) => {
        if (Object.keys(tool.input_schema.properties || {}).length > 0) {
          Object.entries(tool.input_schema.properties || {}).forEach(
            ([key, value]: any) => {
              if (value.description) {
                expect(value.description.length).toBeGreaterThan(0)
              }
            }
          )
        }
      })
    })

    it('query_sales has correct property types', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'query_sales')
      const props = (tool?.input_schema.properties as any) || {}
      expect(props.date_from.type).toBe('string')
      expect(props.date_to.type).toBe('string')
      expect(props.compare_with.type).toBe('string')
    })

    it('get_stock_levels has boolean properties', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'get_stock_levels')
      const props = (tool?.input_schema.properties as any) || {}
      expect(props.only_low_stock.type).toBe('boolean')
      expect(props.only_beer.type).toBe('boolean')
    })

    it('predict_demand specifies metric options', () => {
      const tool = AI_TOOLS.find((t) => t.name === 'predict_demand')
      const metric = (tool?.input_schema.properties as any).metric
      expect(metric.enum).toBeDefined()
      expect(metric.enum.length).toBeGreaterThan(0)
    })
  })

  describe('Tool Relationships', () => {
    it('has tools for all major business functions', () => {
      const toolNames = AI_TOOLS.map((t) => t.name)

      // Sales
      expect(toolNames).toContain('query_sales')

      // Inventory
      expect(toolNames).toContain('get_stock_levels')

      // Staff
      expect(toolNames).toContain('get_staff_schedule')

      // Reservations
      expect(toolNames).toContain('get_reservations')

      // Marketing
      expect(toolNames).toContain('generate_social_post')
      expect(toolNames).toContain('draft_newsletter')

      // Events
      expect(toolNames).toContain('get_events')

      // Finance
      expect(toolNames).toContain('query_financials')

      // CRM
      expect(toolNames).toContain('get_reviews')
      expect(toolNames).toContain('draft_review_reply')

      // Intelligent Features
      expect(toolNames).toContain('suggest_schedule')
      expect(toolNames).toContain('predict_demand')
    })
  })
})
