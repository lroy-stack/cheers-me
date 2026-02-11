# CRM & Customer Intelligence — Database Schema

**Module:** M10
**Migration:** `015_crm_enhancements.sql`
**Status:** ✅ Complete

---

## OVERVIEW

The CRM module manages customer relationships, reviews, loyalty programs, and customer intelligence for GrandCafe Cheers. It includes:

- Customer profiles with contact info, preferences, visit tracking
- Review aggregation from TripAdvisor, Google, Restaurant Guru
- Sentiment analysis and AI-powered response generation
- Loyalty rewards at visit milestones (5th, 10th, 20th, 50th, 100th visit)
- VIP customer flagging
- Birthday/anniversary tracking with auto-notifications

---

## TABLES

### `customers`

Core customer profile table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Customer full name (required) |
| `email` | VARCHAR(255) | Email address (validated format) |
| `phone` | VARCHAR(20) | Phone number |
| `language` | VARCHAR(5) | Preferred language (en/nl/es/de) |
| `visit_count` | INTEGER | Total visits (auto-incremented, default 0) |
| `last_visit` | DATE | Date of last visit |
| `birthday` | DATE | Customer birthday (for notifications) |
| `anniversary` | DATE | Customer anniversary (for notifications) |
| `preferences` | TEXT | Dietary preferences, favorite dishes, etc. |
| `notes` | TEXT | Internal notes (allergies, special requests) |
| `vip` | BOOLEAN | VIP status flag (default false) |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp (auto-updated) |

**Indexes:**
- `idx_customers_email` (email lookup)
- `idx_customers_phone` (phone lookup)
- `idx_customers_language` (language filtering)
- `idx_customers_vip` (partial index on VIP customers)
- `idx_customers_birthday` (birthday notification queries)
- `idx_customers_anniversary` (anniversary notification queries)
- `idx_customers_last_visit` (activity tracking)
- `idx_customers_visit_count` (loyalty tracking)

**Constraints:**
- Email format validation (basic regex)
- Language must be in ('en', 'nl', 'es', 'de')
- Visit count must be >= 0

**RLS Policies:**
- ✅ Managers/admins can read all customers
- ✅ Waiters can read customers (for reservations/service)
- ✅ Managers/waiters can insert customers
- ✅ Managers/waiters can update customers

---

### `customer_reviews`

Reviews manually imported from review platforms.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `customer_id` | UUID | Foreign key to customers (optional, can be null if customer unknown) |
| `platform` | VARCHAR(100) | Review source (TripAdvisor, Google, Restaurant Guru) |
| `rating` | DECIMAL(3,1) | Rating 0-5 stars |
| `review_text` | TEXT | Review content |
| `sentiment` | sentiment_type | ENUM: positive/neutral/negative |
| `response_draft` | TEXT | AI-generated response draft |
| `response_sent` | TEXT | Final response sent to platform |
| `created_at` | TIMESTAMPTZ | Review creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp (auto-updated) |

**Indexes:**
- `idx_customer_reviews_customer_id` (customer lookup)
- `idx_customer_reviews_platform` (platform filtering)
- `idx_customer_reviews_sentiment` (sentiment filtering)
- `idx_customer_reviews_created_at` (chronological sorting)

**Constraints:**
- Rating must be between 0 and 5

**RLS Policies:**
- ✅ Managers/admins/owners can read all reviews
- ✅ Managers/admins can insert reviews (manual import)
- ✅ Managers/admins can update reviews (for response drafts)

---

### `loyalty_rewards`

Loyalty rewards issued at visit milestones.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `customer_id` | UUID | Foreign key to customers (required) |
| `visit_milestone` | INTEGER | Visit count when reward issued (5, 10, 20, 50, 100) |
| `reward_description` | TEXT | Reward details (auto-generated) |
| `reward_issued_at` | TIMESTAMPTZ | When reward was issued |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

**Indexes:**
- `idx_loyalty_rewards_customer_id` (customer lookup)
- `idx_loyalty_rewards_visit_milestone` (milestone filtering)
- `idx_loyalty_rewards_issued_at` (chronological sorting)

**Loyalty Milestones:**
- **5 visits:** Free drink
- **10 visits:** Free dessert
- **20 visits:** Free appetizer
- **50 visits:** 20% off next meal
- **100 visits:** Free dinner for two

**RLS Policies:**
- ✅ Managers/admins/owners can read all rewards
- ✅ Managers/admins can insert rewards

---

## FUNCTIONS & STORED PROCEDURES

### `record_customer_visit(p_customer_id UUID)`

Records a customer visit by incrementing `visit_count` and updating `last_visit`.
Also triggers `check_loyalty_milestone()` to issue rewards if applicable.

**Usage:**
```sql
SELECT record_customer_visit('customer-uuid-here');
```

**Called from:** API route when customer checks in / completes visit

---

### `check_loyalty_milestone(p_customer_id UUID)`

Checks if customer has reached a loyalty milestone (5, 10, 20, 50, 100 visits).
Automatically creates a reward record if not already issued.

**Auto-triggered by:** `record_customer_visit()`

---

### `get_upcoming_birthdays(days_ahead INTEGER DEFAULT 7)`

Returns customers with birthdays in the next N days.

**Returns:**
- `customer_id`, `customer_name`, `customer_email`, `customer_phone`, `birthday`, `days_until_birthday`

**Usage:**
```sql
SELECT * FROM get_upcoming_birthdays(7); -- Next 7 days
```

**Used for:** Birthday notification system, dashboard alerts

---

### `get_upcoming_anniversaries(days_ahead INTEGER DEFAULT 7)`

Returns customers with anniversaries in the next N days.

**Returns:**
- `customer_id`, `customer_name`, `customer_email`, `customer_phone`, `anniversary`, `days_until_anniversary`

**Usage:**
```sql
SELECT * FROM get_upcoming_anniversaries(14); -- Next 14 days
```

**Used for:** Anniversary notification system, dashboard alerts

---

### `get_customer_insights()`

Returns aggregated customer intelligence metrics as JSON.

**Returns:**
```json
{
  "total_customers": 1234,
  "vip_customers": 45,
  "avg_visit_count": 8.3,
  "customers_this_month": 234,
  "total_reviews": 567,
  "avg_rating": 4.5,
  "sentiment_breakdown": {
    "positive": 450,
    "neutral": 80,
    "negative": 37
  },
  "pending_review_responses": 5,
  "upcoming_birthdays_7days": 12,
  "loyalty_rewards_issued_this_month": 18
}
```

**Usage:**
```sql
SELECT get_customer_insights();
```

**Used for:** CRM Dashboard, reporting

---

### `generate_review_response_draft(p_review_id UUID, p_response_draft TEXT)`

Stores an AI-generated review response draft.

**Usage:**
```sql
SELECT generate_review_response_draft(
  'review-uuid',
  'Thank you for your feedback! We appreciate your visit...'
);
```

**Called from:** API route after Claude API generates response

---

### `send_review_response(p_review_id UUID, p_response_text TEXT)`

Marks a review response as sent (after posting to review platform).

**Usage:**
```sql
SELECT send_review_response(
  'review-uuid',
  'Thank you for your feedback! We appreciate your visit...'
);
```

**Called from:** API route after response posted to platform

---

### `get_vip_customers()`

Returns all VIP customers sorted by visit count and last visit.

**Returns:**
- `customer_id`, `customer_name`, `customer_email`, `customer_phone`, `visit_count`, `last_visit`, `preferences`, `notes`

**Usage:**
```sql
SELECT * FROM get_vip_customers();
```

**Used for:** VIP management dashboard, special treatment tracking

---

## TRIGGERS

### `customers_updated_at`

Auto-updates `updated_at` timestamp on customer record changes.

**Trigger:** `BEFORE UPDATE ON customers`

---

### `customer_reviews_updated_at`

Auto-updates `updated_at` timestamp on review record changes.

**Trigger:** `BEFORE UPDATE ON customer_reviews`

---

## API ROUTES NEEDED

### Customer Management

**`GET /api/crm/customers`**
- List all customers with pagination, filtering (vip, language, last_visit)
- Query params: `page`, `limit`, `vip`, `language`, `sort`

**`GET /api/crm/customers/[id]`**
- Get single customer with visit history, reviews, loyalty rewards

**`POST /api/crm/customers`**
- Create new customer profile
- Body: `{ name, email, phone, language, preferences, notes }`

**`PATCH /api/crm/customers/[id]`**
- Update customer profile
- Body: any customer fields

**`POST /api/crm/customers/[id]/visit`**
- Record a customer visit
- Calls `record_customer_visit()`
- Auto-checks loyalty milestones

**`POST /api/crm/customers/[id]/vip`**
- Toggle VIP status
- Body: `{ vip: boolean }`

---

### Review Management

**`GET /api/crm/reviews`**
- List all reviews with filtering (platform, sentiment, pending_response)
- Query params: `page`, `limit`, `platform`, `sentiment`, `pending`

**`GET /api/crm/reviews/[id]`**
- Get single review

**`POST /api/crm/reviews`**
- Create new review (manual import)
- Body: `{ customer_id?, platform, rating, review_text, sentiment }`

**`POST /api/crm/reviews/[id]/generate-response`**
- Generate AI response draft using Claude API
- Calls Claude API with review text
- Stores draft via `generate_review_response_draft()`

**`POST /api/crm/reviews/[id]/send-response`**
- Mark response as sent
- Body: `{ response_text }`
- Calls `send_review_response()`

---

### Loyalty & Rewards

**`GET /api/crm/loyalty-rewards`**
- List all loyalty rewards with filtering
- Query params: `page`, `limit`, `customer_id`, `milestone`

**`GET /api/crm/customers/[id]/loyalty-rewards`**
- Get loyalty rewards for specific customer

---

### Intelligence & Insights

**`GET /api/crm/insights`**
- Get customer intelligence dashboard data
- Calls `get_customer_insights()`

**`GET /api/crm/birthdays`**
- Get upcoming birthdays
- Query params: `days_ahead` (default 7)
- Calls `get_upcoming_birthdays(days_ahead)`

**`GET /api/crm/anniversaries`**
- Get upcoming anniversaries
- Query params: `days_ahead` (default 7)
- Calls `get_upcoming_anniversaries(days_ahead)`

**`GET /api/crm/vip-customers`**
- Get all VIP customers
- Calls `get_vip_customers()`

---

## NOTIFICATIONS INTEGRATION

### Birthday Notifications

**Trigger:** Daily cron job (Supabase Edge Function or Vercel Cron)

**Logic:**
1. Call `get_upcoming_birthdays(1)` daily at 9:00 AM
2. For each customer with birthday today:
   - Send notification to manager via Web Push API
   - Optional: Send birthday email/SMS to customer

**Notification format:**
```
🎂 Birthday Today: [Customer Name]
Visit count: [X] | Last visit: [Date]
[View customer profile]
```

---

### Anniversary Notifications

**Trigger:** Daily cron job

**Logic:**
1. Call `get_upcoming_anniversaries(1)` daily at 9:00 AM
2. For each customer with anniversary today:
   - Send notification to manager
   - Optional: Send anniversary email/SMS to customer

---

### Loyalty Reward Notifications

**Trigger:** After `record_customer_visit()` creates new reward

**Logic:**
1. When loyalty reward is created, notify:
   - Staff (Web Push): "Customer [Name] just earned [Reward]!"
   - Customer (Email/SMS): "Congratulations! You've earned [Reward]!"

**Implementation:** Use Supabase Realtime subscription or database trigger

---

### Negative Review Alerts

**Trigger:** When negative review is imported

**Logic:**
1. When `customer_reviews.sentiment = 'negative'`:
   - Notify manager immediately (Web Push)
   - Flag as "pending response"

**Notification format:**
```
⚠️ Negative Review on [Platform]
Rating: [X] stars
"[Review excerpt...]"
[Generate AI response]
```

---

## FRONTEND REQUIREMENTS

### CRM Dashboard (`/app/crm`)

**Components needed:**
- Customer list table with search, filters (VIP, language, visit_count)
- Customer detail modal with:
  - Profile info (editable)
  - Visit history
  - Loyalty rewards
  - Reviews
  - Notes/preferences
- Quick stats cards:
  - Total customers
  - VIP count
  - Avg visit count
  - Customers this month
  - Upcoming birthdays/anniversaries

---

### Reviews Dashboard (`/app/crm/reviews`)

**Components needed:**
- Review list table with filters (platform, sentiment, pending_response)
- Review detail modal with:
  - Review text
  - Rating stars
  - Sentiment badge (color-coded)
  - AI response draft generator button
  - Response editor (textarea)
  - "Send Response" button
- Review stats:
  - Avg rating
  - Sentiment breakdown (pie chart)
  - Pending responses count

---

### Loyalty Program Page (`/app/crm/loyalty`)

**Components needed:**
- Loyalty rewards list
- Customer milestone tracker (visual progress bar)
- Reward redemption log
- Loyalty stats

---

### VIP Customers Page (`/app/crm/vip`)

**Components needed:**
- VIP customer list (sortable by visit_count, last_visit)
- VIP badge component
- Quick notes/preferences display

---

### Birthday/Anniversary Alerts

**Components needed:**
- Notification bell in top bar
- Alert list sidebar showing upcoming birthdays/anniversaries
- "Mark as notified" button

---

## BUSINESS LOGIC NOTES

### VIP Criteria

VIP status can be:
- **Manual:** Manager flags customer as VIP
- **Auto:** Customer reaches 20+ visits (can be automated via trigger)

### Review Sentiment Analysis

Sentiment can be:
- **Manual:** Manager tags review as positive/neutral/negative
- **AI-powered:** Claude API analyzes review text on import (recommended)

**AI Sentiment Prompt Template:**
```
Analyze this restaurant review and classify the sentiment as "positive", "neutral", or "negative".

Review: "[review_text]"
Rating: [rating] / 5

Respond with only: positive, neutral, or negative
```

### AI Review Response Generation

**Claude API Prompt Template:**
```
You are the manager of GrandCafe Cheers, a beachfront restaurant in Mallorca.

Generate a professional, friendly response to this customer review:

Platform: [platform]
Rating: [rating] / 5
Review: "[review_text]"
Sentiment: [sentiment]

The response should:
- Thank the customer for their feedback
- Address specific points mentioned in the review
- Be warm and authentic (avoid generic corporate language)
- Be 2-3 sentences maximum
- If negative: acknowledge the issue and offer to make it right
- Match the tone to the rating (enthusiastic for 5 stars, apologetic for 1-2 stars)

Language: [detect from review or use 'en']
```

---

## EXAMPLE WORKFLOWS

### Workflow 1: New Customer Visit

1. Customer arrives at restaurant
2. Staff checks if customer exists in system
3. If new: Create customer profile via `POST /api/crm/customers`
4. If existing: Record visit via `POST /api/crm/customers/[id]/visit`
5. System auto-increments `visit_count`, updates `last_visit`
6. System checks for loyalty milestone via `check_loyalty_milestone()`
7. If milestone reached: Loyalty reward created, staff notified

---

### Workflow 2: Import & Respond to Review

1. Manager copies review from TripAdvisor
2. Creates review via `POST /api/crm/reviews` with text, rating, platform
3. Optional: Claude API analyzes sentiment (or manual tag)
4. Manager clicks "Generate AI Response"
5. API calls `POST /api/crm/reviews/[id]/generate-response`
6. Claude API generates response draft, stored in `response_draft`
7. Manager edits draft if needed
8. Manager posts response to TripAdvisor manually
9. Manager marks as sent via `POST /api/crm/reviews/[id]/send-response`

---

### Workflow 3: Birthday Notification

1. Daily cron job runs at 9:00 AM
2. Calls `get_upcoming_birthdays(1)` to get today's birthdays
3. For each customer:
   - Send Web Push to manager: "🎂 [Customer Name]'s birthday today!"
   - Optional: Send birthday email to customer with special offer
4. Staff can view in "Birthday Alerts" sidebar

---

## TESTING QUERIES

```sql
-- Create test customer
INSERT INTO customers (name, email, phone, language, birthday, vip)
VALUES ('John Doe', 'john@example.com', '+34612345678', 'en', '1985-03-15', false);

-- Record 5 visits to trigger loyalty reward
SELECT record_customer_visit('customer-uuid');
SELECT record_customer_visit('customer-uuid');
SELECT record_customer_visit('customer-uuid');
SELECT record_customer_visit('customer-uuid');
SELECT record_customer_visit('customer-uuid');

-- Check if loyalty reward was created
SELECT * FROM loyalty_rewards WHERE customer_id = 'customer-uuid';

-- Get upcoming birthdays (test with your birthday)
SELECT * FROM get_upcoming_birthdays(30);

-- Get customer insights
SELECT get_customer_insights();

-- Create test review
INSERT INTO customer_reviews (customer_id, platform, rating, review_text, sentiment)
VALUES ('customer-uuid', 'TripAdvisor', 5.0, 'Amazing food and service!', 'positive');

-- Get VIP customers
SELECT * FROM get_vip_customers();
```

---

## SUPABASE REALTIME SETUP

For real-time loyalty reward notifications:

```sql
-- Enable realtime on loyalty_rewards table
ALTER PUBLICATION supabase_realtime ADD TABLE loyalty_rewards;
```

**Frontend subscription (example):**
```typescript
const subscription = supabase
  .channel('loyalty-rewards')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'loyalty_rewards'
    },
    (payload) => {
      // Show notification to staff
      showNotification(`New loyalty reward issued!`);
    }
  )
  .subscribe();
```

---

## CHANGELOG

### v1.0.0 (2024-02-06)
- ✅ Initial CRM schema migration
- ✅ Customer, review, loyalty tables
- ✅ Indexes for performance
- ✅ RLS policies for all tables
- ✅ Functions: visit tracking, birthdays, anniversaries, insights
- ✅ Triggers for updated_at fields
- ✅ Loyalty milestone automation

---

## NEXT STEPS FOR FRONTEND AGENT

1. **API Routes:** Create all `/api/crm/*` routes listed above
2. **UI Components:**
   - Customer list + detail modal
   - Review list + AI response generator
   - Loyalty rewards tracker
   - VIP customer page
   - Birthday/anniversary alerts widget
3. **Claude API Integration:**
   - Sentiment analysis on review import
   - Review response generation
4. **Notifications:**
   - Birthday/anniversary daily cron job
   - Loyalty reward realtime notifications
   - Negative review alerts
5. **Dashboard:**
   - CRM insights widget using `get_customer_insights()`
