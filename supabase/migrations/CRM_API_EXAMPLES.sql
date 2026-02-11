-- ============================================================================
-- CRM Module — SQL Query Examples for API Routes
-- Use these as reference when building /api/crm/* endpoints
-- ============================================================================

-- ============================================================================
-- CUSTOMER QUERIES
-- ============================================================================

-- List all customers (with pagination)
SELECT
  id,
  name,
  email,
  phone,
  language,
  visit_count,
  last_visit,
  vip,
  birthday,
  anniversary
FROM customers
WHERE active = true
ORDER BY last_visit DESC NULLS LAST, visit_count DESC
LIMIT 20 OFFSET 0;

-- Search customers by name or email
SELECT *
FROM customers
WHERE
  (name ILIKE '%search%' OR email ILIKE '%search%')
  AND active = true
ORDER BY visit_count DESC;

-- Filter customers by language
SELECT *
FROM customers
WHERE language = 'en' AND active = true
ORDER BY last_visit DESC;

-- Get VIP customers only
SELECT *
FROM customers
WHERE vip = true AND active = true
ORDER BY visit_count DESC;

-- Get customer with full details (for detail view)
SELECT
  c.*,
  (SELECT COUNT(*) FROM loyalty_rewards WHERE customer_id = c.id) as total_rewards,
  (SELECT COUNT(*) FROM customer_reviews WHERE customer_id = c.id) as total_reviews
FROM customers c
WHERE c.id = 'customer-uuid';

-- Create new customer
INSERT INTO customers (
  name,
  email,
  phone,
  language,
  preferences,
  notes
) VALUES (
  'John Doe',
  'john@example.com',
  '+34612345678',
  'en',
  'Vegetarian, no onions',
  'Regular customer, likes table by window'
) RETURNING *;

-- Update customer
UPDATE customers
SET
  name = 'Jane Doe',
  phone = '+34698765432',
  preferences = 'Vegan',
  vip = true,
  updated_at = NOW()
WHERE id = 'customer-uuid'
RETURNING *;

-- Record customer visit (increments visit_count, checks loyalty)
SELECT record_customer_visit('customer-uuid');

-- Toggle VIP status
UPDATE customers
SET vip = NOT vip, updated_at = NOW()
WHERE id = 'customer-uuid'
RETURNING *;

-- Get customer's visit history (via loyalty_rewards)
SELECT
  visit_milestone,
  reward_description,
  reward_issued_at
FROM loyalty_rewards
WHERE customer_id = 'customer-uuid'
ORDER BY visit_milestone DESC;

-- ============================================================================
-- REVIEW QUERIES
-- ============================================================================

-- List all reviews (with pagination)
SELECT
  cr.id,
  cr.customer_id,
  c.name as customer_name,
  cr.platform,
  cr.rating,
  cr.review_text,
  cr.sentiment,
  cr.response_draft,
  cr.response_sent,
  cr.created_at
FROM customer_reviews cr
LEFT JOIN customers c ON c.id = cr.customer_id
ORDER BY cr.created_at DESC
LIMIT 20 OFFSET 0;

-- Filter reviews by sentiment
SELECT *
FROM customer_reviews
WHERE sentiment = 'negative'
ORDER BY created_at DESC;

-- Filter reviews by platform
SELECT *
FROM customer_reviews
WHERE platform = 'TripAdvisor'
ORDER BY created_at DESC;

-- Get reviews pending response (negative reviews without response)
SELECT
  cr.*,
  c.name as customer_name,
  c.email as customer_email
FROM customer_reviews cr
LEFT JOIN customers c ON c.id = cr.customer_id
WHERE
  cr.sentiment = 'negative'
  AND cr.response_sent IS NULL
ORDER BY cr.created_at ASC;

-- Create new review (manual import)
INSERT INTO customer_reviews (
  customer_id,
  platform,
  rating,
  review_text,
  sentiment
) VALUES (
  'customer-uuid', -- can be NULL if customer unknown
  'TripAdvisor',
  5.0,
  'Amazing food and service! Best beachfront restaurant in Mallorca.',
  'positive'
) RETURNING *;

-- Generate AI response draft (call this AFTER Claude API generates the draft)
SELECT generate_review_response_draft(
  'review-uuid',
  'Thank you so much for your wonderful feedback! We're thrilled you enjoyed your experience at Cheers. We hope to see you again soon!'
);

-- Mark response as sent
SELECT send_review_response(
  'review-uuid',
  'Thank you so much for your wonderful feedback! We're thrilled you enjoyed your experience at Cheers. We hope to see you again soon!'
);

-- Get review with customer details
SELECT
  cr.*,
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  c.visit_count
FROM customer_reviews cr
LEFT JOIN customers c ON c.id = cr.customer_id
WHERE cr.id = 'review-uuid';

-- Get all reviews for a specific customer
SELECT *
FROM customer_reviews
WHERE customer_id = 'customer-uuid'
ORDER BY created_at DESC;

-- ============================================================================
-- LOYALTY REWARDS QUERIES
-- ============================================================================

-- List all loyalty rewards (with customer info)
SELECT
  lr.id,
  lr.customer_id,
  c.name as customer_name,
  c.email as customer_email,
  lr.visit_milestone,
  lr.reward_description,
  lr.reward_issued_at
FROM loyalty_rewards lr
JOIN customers c ON c.id = lr.customer_id
ORDER BY lr.reward_issued_at DESC
LIMIT 20 OFFSET 0;

-- Get rewards for specific customer
SELECT *
FROM loyalty_rewards
WHERE customer_id = 'customer-uuid'
ORDER BY visit_milestone DESC;

-- Get rewards issued this month
SELECT
  lr.*,
  c.name as customer_name
FROM loyalty_rewards lr
JOIN customers c ON c.id = lr.customer_id
WHERE lr.reward_issued_at >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY lr.reward_issued_at DESC;

-- Check customer's next milestone
SELECT
  c.name,
  c.visit_count,
  CASE
    WHEN c.visit_count < 5 THEN 5 - c.visit_count
    WHEN c.visit_count < 10 THEN 10 - c.visit_count
    WHEN c.visit_count < 20 THEN 20 - c.visit_count
    WHEN c.visit_count < 50 THEN 50 - c.visit_count
    WHEN c.visit_count < 100 THEN 100 - c.visit_count
    ELSE NULL
  END as visits_until_next_reward
FROM customers c
WHERE c.id = 'customer-uuid';

-- ============================================================================
-- INSIGHTS & INTELLIGENCE QUERIES
-- ============================================================================

-- Get dashboard insights (single JSON object)
SELECT get_customer_insights();

-- Get upcoming birthdays (default 7 days)
SELECT * FROM get_upcoming_birthdays(7);

-- Get upcoming birthdays for next 30 days
SELECT * FROM get_upcoming_birthdays(30);

-- Get upcoming anniversaries
SELECT * FROM get_upcoming_anniversaries(7);

-- Get all VIP customers
SELECT * FROM get_vip_customers();

-- Customer statistics (manual query)
SELECT
  COUNT(*) as total_customers,
  COUNT(*) FILTER (WHERE vip = true) as vip_count,
  ROUND(AVG(visit_count), 2) as avg_visits,
  COUNT(*) FILTER (WHERE last_visit >= CURRENT_DATE - INTERVAL '30 days') as active_last_30_days,
  COUNT(*) FILTER (WHERE last_visit >= CURRENT_DATE - INTERVAL '7 days') as active_last_7_days
FROM customers;

-- Review statistics
SELECT
  COUNT(*) as total_reviews,
  ROUND(AVG(rating), 2) as avg_rating,
  COUNT(*) FILTER (WHERE sentiment = 'positive') as positive_count,
  COUNT(*) FILTER (WHERE sentiment = 'neutral') as neutral_count,
  COUNT(*) FILTER (WHERE sentiment = 'negative') as negative_count,
  COUNT(*) FILTER (WHERE sentiment = 'negative' AND response_sent IS NULL) as pending_responses
FROM customer_reviews;

-- Top customers by visit count
SELECT
  id,
  name,
  email,
  visit_count,
  last_visit,
  vip
FROM customers
WHERE active = true
ORDER BY visit_count DESC
LIMIT 10;

-- Recently active customers
SELECT
  id,
  name,
  email,
  visit_count,
  last_visit,
  vip
FROM customers
WHERE
  last_visit IS NOT NULL
  AND active = true
ORDER BY last_visit DESC
LIMIT 10;

-- Customers who haven't visited in 30+ days (re-engagement targets)
SELECT
  id,
  name,
  email,
  phone,
  visit_count,
  last_visit,
  CURRENT_DATE - last_visit as days_since_visit
FROM customers
WHERE
  last_visit < CURRENT_DATE - INTERVAL '30 days'
  AND active = true
ORDER BY last_visit ASC;

-- ============================================================================
-- COMBINED QUERIES (for detailed customer profile API)
-- ============================================================================

-- Get complete customer profile with related data
WITH customer_data AS (
  SELECT * FROM customers WHERE id = 'customer-uuid'
),
review_stats AS (
  SELECT
    customer_id,
    COUNT(*) as total_reviews,
    ROUND(AVG(rating), 2) as avg_rating
  FROM customer_reviews
  WHERE customer_id = 'customer-uuid'
  GROUP BY customer_id
),
reward_stats AS (
  SELECT
    customer_id,
    COUNT(*) as total_rewards,
    MAX(visit_milestone) as highest_milestone
  FROM loyalty_rewards
  WHERE customer_id = 'customer-uuid'
  GROUP BY customer_id
)
SELECT
  c.*,
  COALESCE(r.total_reviews, 0) as total_reviews,
  r.avg_rating,
  COALESCE(rw.total_rewards, 0) as total_rewards,
  rw.highest_milestone
FROM customer_data c
LEFT JOIN review_stats r ON r.customer_id = c.id
LEFT JOIN reward_stats rw ON rw.customer_id = c.id;

-- ============================================================================
-- SUPABASE CLIENT EXAMPLES (for TypeScript API routes)
-- ============================================================================

/*
// GET /api/crm/customers
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('active', true)
  .order('last_visit', { ascending: false, nullsFirst: false })
  .range(0, 19); // Pagination

// GET /api/crm/customers/[id]
const { data, error } = await supabase
  .from('customers')
  .select(`
    *,
    loyalty_rewards(count),
    customer_reviews(count)
  `)
  .eq('id', customerId)
  .single();

// POST /api/crm/customers
const { data, error } = await supabase
  .from('customers')
  .insert({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+34612345678',
    language: 'en'
  })
  .select()
  .single();

// PATCH /api/crm/customers/[id]
const { data, error } = await supabase
  .from('customers')
  .update({ vip: true })
  .eq('id', customerId)
  .select()
  .single();

// POST /api/crm/customers/[id]/visit (call function)
const { data, error } = await supabase.rpc('record_customer_visit', {
  p_customer_id: customerId
});

// GET /api/crm/insights
const { data, error } = await supabase.rpc('get_customer_insights');

// GET /api/crm/birthdays
const { data, error } = await supabase.rpc('get_upcoming_birthdays', {
  days_ahead: 7
});

// GET /api/crm/reviews (with customer join)
const { data, error } = await supabase
  .from('customer_reviews')
  .select(`
    *,
    customer:customers(name, email, phone)
  `)
  .order('created_at', { ascending: false })
  .range(0, 19);

// POST /api/crm/reviews
const { data, error } = await supabase
  .from('customer_reviews')
  .insert({
    customer_id: customerId,
    platform: 'TripAdvisor',
    rating: 5.0,
    review_text: 'Amazing experience!',
    sentiment: 'positive'
  })
  .select()
  .single();

// POST /api/crm/reviews/[id]/generate-response
// 1. Call Claude API to generate response
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const message = await anthropic.messages.create({
  model: 'claude-haiku-4.5',
  max_tokens: 300,
  messages: [{
    role: 'user',
    content: `Generate a professional review response...`
  }]
});

// 2. Store the draft
const { error } = await supabase.rpc('generate_review_response_draft', {
  p_review_id: reviewId,
  p_response_draft: message.content[0].text
});

// POST /api/crm/reviews/[id]/send-response
const { error } = await supabase.rpc('send_review_response', {
  p_review_id: reviewId,
  p_response_text: responseText
});
*/
