# Claude AI Assistant Integration

This directory contains the backend implementation of the Claude AI Assistant for GrandCafe Cheers.

## Files

- **claude.ts** - Claude API client configuration with prompt caching
- **system-prompt.ts** - System prompt with restaurant context and behavior guidelines
- **tool-definitions.ts** - All 12 tool definitions for function calling
- **tools.ts** - Tool execution functions that query Supabase database

## Architecture

```
[User] → POST /api/ai/chat → [Next.js API Route] → [Claude API with tools] → [Tool execution] → [Supabase] → [Response]
```

## API Endpoint

### POST /api/ai/chat

**Request:**
```json
{
  "message": "How much did we sell yesterday?",
  "conversation_id": "optional-uuid",
  "locale": "en"
}
```

**Response:**
```json
{
  "response": "Yesterday's total revenue was €3,847...",
  "tools_used": ["query_sales"],
  "conversation_id": "uuid",
  "stop_reason": "end_turn"
}
```

## Available Tools

1. **query_sales** - Query sales data with comparison
2. **get_stock_levels** - Get current inventory levels
3. **get_staff_schedule** - Get staff shifts
4. **get_reservations** - Get reservations for a date
5. **generate_social_post** - Generate social media content
6. **draft_newsletter** - Create newsletter drafts
7. **get_events** - Get scheduled events
8. **query_financials** - Query financial metrics (P&L, cost ratios)
9. **get_reviews** - Get customer reviews
10. **draft_review_reply** - Generate review responses
11. **suggest_schedule** - AI-powered schedule suggestions
12. **predict_demand** - Predict future demand

## Testing

To test the API manually:

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the stock levels for beer?"
  }'
```

## Cost Optimization

- System prompt is cached using Anthropic's prompt caching feature
- Estimated cost: ~$5/month for 50 queries/day
- Using Claude Haiku 4.5 for optimal cost/performance

## Environment Variables

Required in `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-xxx
```

## Next Steps (Frontend Integration)

The frontend team will need to:
1. Create a chat widget UI component
2. Implement conversation state management
3. Add the floating chat button to the dashboard
4. Handle streaming responses (optional enhancement)
