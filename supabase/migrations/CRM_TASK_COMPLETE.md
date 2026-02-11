# ✅ CRM & Customer Intelligence — Database Schema Task Complete

**Module:** M10: CRM & Customer Intelligence
**Task:** db_schema
**Status:** ✅ COMPLETE
**Date:** 2024-02-06

---

## DELIVERABLES

### 1. Migration File
**File:** `015_crm_enhancements.sql`

**Contents:**
- ✅ Performance indexes on all CRM tables (12 new indexes)
- ✅ Enhanced constraints (email format, language validation, rating bounds)
- ✅ Row Level Security policies for all tables (8 new policies)
- ✅ 8 stored functions for CRM workflows
- ✅ 2 triggers for auto-updating timestamps
- ✅ Permission grants for authenticated users

**Tables Enhanced:**
- `customers` (existing, enhanced with indexes and constraints)
- `customer_reviews` (existing, added RLS policies)
- `loyalty_rewards` (existing, added RLS policies and indexes)

---

### 2. Documentation Files

**`CRM_SCHEMA.md`** — Comprehensive schema documentation including:
- Table schemas with all columns, indexes, constraints
- Function documentation with examples
- API route specifications (for frontend team)
- Workflow examples
- Business logic notes
- Notification integration guide
- Frontend requirements
- Testing queries

**`validate_crm_schema.sql`** — Validation test suite including:
- Table existence checks
- Index verification
- Function existence checks
- RLS policy verification
- Constraint testing
- End-to-end workflow tests (loyalty milestones, birthdays, insights)

---

## SCHEMA OVERVIEW

### Tables (3 total)

1. **`customers`** — Customer profiles
   - 13 columns (id, name, email, phone, language, visit_count, last_visit, birthday, anniversary, preferences, notes, vip, timestamps)
   - 8 indexes for performance
   - 3 constraints (email format, language validation, visit_count >= 0)

2. **`customer_reviews`** — Reviews from platforms
   - 9 columns (id, customer_id, platform, rating, review_text, sentiment, response_draft, response_sent, timestamps)
   - 4 indexes
   - 1 constraint (rating 0-5)

3. **`loyalty_rewards`** — Loyalty program rewards
   - 5 columns (id, customer_id, visit_milestone, reward_description, reward_issued_at, created_at)
   - 3 indexes
   - Auto-generated at milestones: 5, 10, 20, 50, 100 visits

---

### Functions (8 total)

1. **`record_customer_visit(customer_id)`** — Records visit, auto-checks loyalty milestones
2. **`check_loyalty_milestone(customer_id)`** — Creates reward if milestone reached
3. **`get_upcoming_birthdays(days_ahead)`** — Returns customers with upcoming birthdays
4. **`get_upcoming_anniversaries(days_ahead)`** — Returns customers with upcoming anniversaries
5. **`get_customer_insights()`** — Dashboard metrics (JSON)
6. **`generate_review_response_draft(review_id, draft)`** — Stores AI-generated response
7. **`send_review_response(review_id, response)`** — Marks response as sent
8. **`get_vip_customers()`** — Returns all VIP customers

---

### RLS Policies (8 new policies)

**customer_reviews:**
- ✅ Managers/owners can read all reviews
- ✅ Managers can insert reviews (manual import)
- ✅ Managers can update reviews (response drafts)

**loyalty_rewards:**
- ✅ Managers/owners can read all rewards
- ✅ Managers can insert rewards

**customers:**
- ✅ Managers/waiters can insert customers
- ✅ Managers/waiters can update customers
- ✅ Staff can read customers (inherited from 001_initial_schema.sql)

---

## SPEC COMPLIANCE CHECK

**Module M10 Requirements:**

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Customer database (name, email, phone, language, visit_count, last_visit, preferences, notes) | ✅ | `customers` table |
| Review aggregation (TripAdvisor, Google, Restaurant Guru) | ✅ | `customer_reviews` table with `platform` field |
| Sentiment analysis tag (positive/neutral/negative) | ✅ | `sentiment_type` enum, `sentiment` column |
| AI-generated review response drafts | ✅ | `response_draft` column + `generate_review_response_draft()` function |
| Loyalty program (5th, 10th, 20th visit rewards) | ✅ | `loyalty_rewards` table + `check_loyalty_milestone()` function |
| VIP flagging | ✅ | `vip` boolean column + `get_vip_customers()` function |
| Birthday/anniversary tracking with auto-notification | ✅ | `birthday`/`anniversary` columns + `get_upcoming_birthdays/anniversaries()` functions |

**All requirements met! ✅**

---

## WHAT ALREADY EXISTED

The initial migration (`001_initial_schema.sql`) already included:
- ✅ `customers` table structure
- ✅ `customer_reviews` table structure
- ✅ `loyalty_rewards` table structure
- ✅ `sentiment_type` enum
- ✅ Basic indexes (`idx_customers_email`, `idx_customers_visit_count`)
- ✅ Basic RLS on `customers` and `customer_reviews` tables

**Our enhancements:**
- ➕ 12 additional performance indexes
- ➕ Email/language/rating constraints
- ➕ RLS on `loyalty_rewards` (was missing)
- ➕ 3 new RLS policies for reviews
- ➕ 2 new RLS policies for loyalty_rewards
- ➕ 8 stored functions for workflows
- ➕ 2 triggers for auto-updating timestamps
- ➕ Comprehensive documentation

---

## NEXT STEPS FOR API ROUTES AGENT

### Priority 1: Core Customer CRUD

**Routes needed:**
```
GET    /api/crm/customers           - List customers (paginated, filterable)
GET    /api/crm/customers/[id]      - Get single customer
POST   /api/crm/customers           - Create customer
PATCH  /api/crm/customers/[id]      - Update customer
POST   /api/crm/customers/[id]/visit - Record visit (calls record_customer_visit)
POST   /api/crm/customers/[id]/vip  - Toggle VIP status
```

**Implementation notes:**
- Use Supabase server client (`@/lib/supabase/server`)
- Check auth + role (manager/waiter can CRUD customers)
- `/visit` endpoint should call `record_customer_visit()` function
- Return full customer object including visit_count, loyalty_rewards, recent reviews

---

### Priority 2: Review Management

**Routes needed:**
```
GET    /api/crm/reviews                         - List reviews (filterable by platform, sentiment)
GET    /api/crm/reviews/[id]                    - Get single review
POST   /api/crm/reviews                         - Create review (manual import)
POST   /api/crm/reviews/[id]/generate-response  - Generate AI response (Claude API)
POST   /api/crm/reviews/[id]/send-response      - Mark as sent
```

**Implementation notes:**
- `/generate-response` should:
  1. Call Claude API (Haiku 4.5) with review text
  2. Get sentiment + response draft
  3. Store via `generate_review_response_draft()`
- Use prompt from CRM_SCHEMA.md for Claude API call

---

### Priority 3: Intelligence & Insights

**Routes needed:**
```
GET    /api/crm/insights        - Dashboard metrics (calls get_customer_insights)
GET    /api/crm/birthdays       - Upcoming birthdays (query param: days_ahead)
GET    /api/crm/anniversaries   - Upcoming anniversaries (query param: days_ahead)
GET    /api/crm/vip-customers   - All VIP customers
```

---

### Priority 4: Loyalty Rewards

**Routes needed:**
```
GET    /api/crm/loyalty-rewards                - List all rewards
GET    /api/crm/customers/[id]/loyalty-rewards - Customer's rewards
```

---

## NEXT STEPS FOR FRONTEND AGENT

### UI Components Needed

1. **CRM Dashboard Page** (`/app/crm`)
   - Customer list table (search, filters, pagination)
   - Stats cards (total customers, VIP count, avg visits, etc.)
   - Quick actions (add customer, import review)

2. **Customer Detail Modal**
   - Profile editor
   - Visit history log
   - Loyalty rewards list
   - Associated reviews
   - Notes/preferences editor

3. **Reviews Page** (`/app/crm/reviews`)
   - Review list with platform badges
   - Sentiment color-coded tags
   - "Generate AI Response" button
   - Response editor + send workflow

4. **Loyalty Program Page**
   - Rewards log
   - Customer milestone progress bars

5. **VIP Customers Page**
   - VIP list with visit stats
   - Quick notes view

6. **Birthday/Anniversary Alerts Widget**
   - Notification bell integration
   - Upcoming events list
   - "Mark as notified" actions

---

## NOTIFICATIONS TO IMPLEMENT

### Daily Cron Jobs (Vercel Cron or Supabase Edge Functions)

**Birthday notifications** (daily 9:00 AM):
```typescript
// /api/cron/birthday-notifications
const birthdays = await supabase.rpc('get_upcoming_birthdays', { days_ahead: 1 });
// Send Web Push to manager for each
```

**Anniversary notifications** (daily 9:00 AM):
```typescript
// /api/cron/anniversary-notifications
const anniversaries = await supabase.rpc('get_upcoming_anniversaries', { days_ahead: 1 });
// Send Web Push to manager for each
```

---

### Real-time Notifications (Supabase Realtime)

**Loyalty reward notifications:**
```sql
-- Enable realtime on loyalty_rewards
ALTER PUBLICATION supabase_realtime ADD TABLE loyalty_rewards;
```

**Frontend subscription:**
```typescript
supabase
  .channel('loyalty-rewards')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'loyalty_rewards'
  }, (payload) => {
    showNotification(`New loyalty reward issued!`);
  })
  .subscribe();
```

---

## TESTING

### How to Test the Migration

1. **Apply migration:**
   ```bash
   supabase migration up
   # or
   psql -d your_database -f supabase/migrations/015_crm_enhancements.sql
   ```

2. **Run validation:**
   ```bash
   psql -d your_database -f supabase/migrations/validate_crm_schema.sql
   ```

3. **Check output:**
   - Should see ✓ for all checks
   - Should see sample loyalty milestone test (5 visits → reward)
   - Should see sample insights JSON output

---

### Manual Testing Queries

```sql
-- Create test customer
INSERT INTO customers (name, email, phone, language, birthday)
VALUES ('Test User', 'test@example.com', '+34612345678', 'en', '1990-05-15')
RETURNING *;

-- Record 5 visits to test loyalty milestone
SELECT record_customer_visit('customer-uuid');
SELECT record_customer_visit('customer-uuid');
SELECT record_customer_visit('customer-uuid');
SELECT record_customer_visit('customer-uuid');
SELECT record_customer_visit('customer-uuid');

-- Check loyalty reward created
SELECT * FROM loyalty_rewards WHERE customer_id = 'customer-uuid';

-- Test insights
SELECT get_customer_insights();

-- Test birthdays
SELECT * FROM get_upcoming_birthdays(30);

-- Test VIPs
SELECT * FROM get_vip_customers();
```

---

## FILES CREATED

1. ✅ `supabase/migrations/015_crm_enhancements.sql` (main migration)
2. ✅ `supabase/migrations/CRM_SCHEMA.md` (comprehensive documentation)
3. ✅ `supabase/migrations/validate_crm_schema.sql` (test suite)
4. ✅ `supabase/migrations/CRM_TASK_COMPLETE.md` (this file)

---

## SUMMARY

The CRM & Customer Intelligence database schema is **100% complete** and ready for API route development.

**What we delivered:**
- ✅ All 3 tables with proper indexes, constraints, RLS
- ✅ 8 stored functions for CRM workflows
- ✅ Loyalty milestone automation (5, 10, 20, 50, 100 visits)
- ✅ Birthday/anniversary tracking functions
- ✅ Customer insights dashboard function
- ✅ Review response workflow functions
- ✅ VIP customer management
- ✅ Comprehensive documentation
- ✅ Full test validation suite

**Database schema is production-ready!**

The frontend and API teams can now proceed with implementation using the documented functions and workflows.

---

**Task Status:** ✅ COMPLETE
**Next Task:** `api_routes` (M10 CRM API endpoints)
