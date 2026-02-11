# Loyalty Program Implementation

## Overview

The GrandCafe Cheers loyalty program automatically rewards customers based on visit milestones. When customers reach specific visit counts (5th, 10th, 20th, 50th, 100th visit), they automatically receive rewards.

## Features

### 1. Automatic Reward Generation
- **Visit Tracking**: Every customer visit is recorded via `/api/crm/customers/[id]/visit` endpoint
- **Milestone Detection**: Database function `check_loyalty_milestone()` automatically detects when a customer reaches a milestone
- **Reward Creation**: Rewards are automatically created when milestones are reached

### 2. Milestone Rewards

| Milestone | Reward |
|-----------|--------|
| 5 visits | Free drink |
| 10 visits | Free dessert |
| 20 visits | Free appetizer |
| 50 visits | 20% off next meal |
| 100 visits | Free dinner for two |

### 3. Redemption Tracking
- Staff can mark rewards as redeemed
- Tracks who redeemed the reward and when
- Optional notes for redemption details
- Prevents double redemption

### 4. Analytics & Reporting
- Total rewards issued/redeemed/pending
- Redemption rate by milestone
- Average time to redemption
- Top loyalty customers
- Monthly statistics

## Database Schema

### loyalty_rewards Table

```sql
CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers ON DELETE CASCADE,
  visit_milestone INTEGER,
  reward_description TEXT,
  reward_issued_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  redeemed_by UUID REFERENCES profiles(id),
  redeemed_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**
- `visit_milestone`: The visit count at which this reward was earned (5, 10, 20, 50, 100)
- `reward_issued_at`: When the reward was automatically generated
- `redeemed_at`: When the customer used the reward (NULL = unredeemed)
- `redeemed_by`: Staff member who processed the redemption
- `redeemed_notes`: Optional notes about what was given

## API Endpoints

### 1. Record Customer Visit

**POST** `/api/crm/customers/[id]/visit`

Records a customer visit, increments visit_count, updates last_visit, and checks for loyalty milestones.

**Auth**: Admin, Manager, Waiter

**Response:**
```json
{
  "customer": {
    "id": "...",
    "name": "John Doe",
    "visit_count": 5,
    "last_visit": "2024-02-06",
    "loyalty_rewards": [...]
  },
  "newReward": {
    "id": "...",
    "visit_milestone": 5,
    "reward_description": "Free drink on your 5th visit! Thank you for your loyalty.",
    "reward_issued_at": "2024-02-06T15:30:00Z"
  },
  "message": "Visit recorded! Customer reached 5 visits milestone."
}
```

### 2. List Loyalty Rewards

**GET** `/api/crm/loyalty-rewards`

List all loyalty rewards with filtering and pagination.

**Auth**: Admin, Manager, Owner

**Query Parameters:**
- `page`: Page number (default 1)
- `limit`: Items per page (default 50, max 100)
- `customer_id`: Filter by customer UUID
- `milestone`: Filter by visit milestone (5, 10, 20, 50, 100)
- `sort`: Sort field (default 'reward_issued_at')
- `order`: Sort order ('asc' or 'desc', default 'desc')

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "customer_id": "...",
      "visit_milestone": 5,
      "reward_description": "Free drink on your 5th visit!",
      "reward_issued_at": "2024-02-06T15:30:00Z",
      "redeemed_at": null,
      "redeemed_by": null,
      "customer": {
        "id": "...",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+34123456789",
        "vip": false,
        "visit_count": 5
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### 3. Redeem Loyalty Reward

**POST** `/api/crm/loyalty-rewards/[id]/redeem`

Mark a loyalty reward as redeemed.

**Auth**: Admin, Manager, Waiter

**Body:**
```json
{
  "notes": "Redeemed free drink - Corona Extra"
}
```

**Response:**
```json
{
  "success": true,
  "reward": {
    "id": "...",
    "customer_id": "...",
    "visit_milestone": 5,
    "reward_description": "Free drink on your 5th visit!",
    "reward_issued_at": "2024-02-06T15:30:00Z",
    "redeemed_at": "2024-02-07T20:15:00Z",
    "redeemed_by": "...",
    "redeemed_notes": "Redeemed free drink - Corona Extra",
    "customer_name": "John Doe",
    "customer_email": "john@example.com"
  },
  "message": "Reward redeemed successfully"
}
```

**Error Cases:**
- Reward not found: 400 error
- Already redeemed: 400 error with redeemed_at timestamp

### 4. Get Customer Loyalty Rewards

**GET** `/api/crm/customers/[id]/loyalty-rewards`

Get all loyalty rewards for a specific customer (both redeemed and unredeemed).

**Auth**: Admin, Manager, Waiter

**Response:**
```json
{
  "customer": {
    "id": "...",
    "name": "John Doe",
    "visit_count": 15
  },
  "unredeemed": [
    {
      "reward_id": "...",
      "visit_milestone": 10,
      "reward_description": "Free dessert on your 10th visit!",
      "reward_issued_at": "2024-02-06T15:30:00Z",
      "days_since_issued": 1
    }
  ],
  "all_rewards": [
    {
      "id": "...",
      "visit_milestone": 10,
      "reward_description": "Free dessert on your 10th visit!",
      "reward_issued_at": "2024-02-06T15:30:00Z",
      "redeemed_at": null,
      "redeemer": null
    },
    {
      "id": "...",
      "visit_milestone": 5,
      "reward_description": "Free drink on your 5th visit!",
      "reward_issued_at": "2024-01-15T12:00:00Z",
      "redeemed_at": "2024-01-16T19:30:00Z",
      "redeemer": {
        "id": "...",
        "name": "Maria Garcia",
        "email": "maria@cheersmallorca.com"
      }
    }
  ],
  "stats": {
    "total_rewards": 2,
    "unredeemed_count": 1,
    "redeemed_count": 1
  }
}
```

### 5. Loyalty Program Statistics

**GET** `/api/crm/loyalty-rewards/statistics`

Get comprehensive loyalty program statistics.

**Auth**: Admin, Manager, Owner

**Response:**
```json
{
  "total_rewards_issued": 156,
  "total_rewards_redeemed": 89,
  "total_rewards_pending": 67,
  "redemption_rate": 57.05,
  "rewards_by_milestone": {
    "5": {
      "total": 80,
      "redeemed": 45,
      "pending": 35
    },
    "10": {
      "total": 45,
      "redeemed": 28,
      "pending": 17
    },
    "20": {
      "total": 20,
      "redeemed": 12,
      "pending": 8
    },
    "50": {
      "total": 8,
      "redeemed": 3,
      "pending": 5
    },
    "100": {
      "total": 3,
      "redeemed": 1,
      "pending": 2
    }
  },
  "avg_redemption_days": 12.5,
  "rewards_issued_this_month": 15,
  "rewards_redeemed_this_month": 8
}
```

### 6. Top Loyalty Customers

**GET** `/api/crm/loyalty-rewards/top-customers`

Get top customers by loyalty program participation.

**Auth**: Admin, Manager, Owner

**Query Parameters:**
- `limit`: Number of customers to return (default 10, max 50)

**Response:**
```json
{
  "data": [
    {
      "customer_id": "...",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_phone": "+34123456789",
      "visit_count": 52,
      "total_rewards": 4,
      "redeemed_rewards": 3,
      "pending_rewards": 1,
      "vip": true
    },
    {
      "customer_id": "...",
      "customer_name": "Jane Smith",
      "customer_email": "jane@example.com",
      "customer_phone": "+34987654321",
      "visit_count": 25,
      "total_rewards": 3,
      "redeemed_rewards": 2,
      "pending_rewards": 1,
      "vip": false
    }
  ],
  "count": 2
}
```

## Database Functions

### record_customer_visit(p_customer_id UUID)
Called automatically when a visit is recorded. Increments visit_count, updates last_visit, and triggers milestone check.

### check_loyalty_milestone(p_customer_id UUID)
Checks if customer has reached a milestone (5, 10, 20, 50, 100 visits) and creates a reward if:
1. The milestone was just reached
2. A reward hasn't already been issued for that milestone

### redeem_loyalty_reward(p_reward_id UUID, p_redeemed_by UUID, p_notes TEXT)
Marks a reward as redeemed. Returns JSON with success status and reward data. Validates that reward exists and hasn't already been redeemed.

### get_customer_unredeemed_rewards(p_customer_id UUID)
Returns all unredeemed rewards for a customer with days since issued.

### get_loyalty_statistics()
Returns comprehensive statistics about the loyalty program.

### get_top_loyalty_customers(p_limit INTEGER)
Returns top customers by visit count with their loyalty reward statistics.

## Workflow Examples

### Example 1: Customer Reaches 5th Visit

1. **Waiter records visit:**
   ```
   POST /api/crm/customers/abc-123/visit
   ```

2. **Backend process:**
   - Increments visit_count: 4 → 5
   - Updates last_visit to today
   - Calls `check_loyalty_milestone()`
   - Detects milestone: 5 visits
   - Creates reward record

3. **Response indicates new reward:**
   ```json
   {
     "customer": {...},
     "newReward": {
       "visit_milestone": 5,
       "reward_description": "Free drink on your 5th visit!"
     },
     "message": "Visit recorded! Customer reached 5 visits milestone."
   }
   ```

4. **Waiter informs customer** about the free drink reward

### Example 2: Redeeming a Reward

1. **Customer returns and wants to use their reward**

2. **Waiter looks up customer's unredeemed rewards:**
   ```
   GET /api/crm/customers/abc-123/loyalty-rewards
   ```

3. **Waiter redeems the reward:**
   ```
   POST /api/crm/loyalty-rewards/reward-456/redeem
   Body: { "notes": "Corona Extra given" }
   ```

4. **System marks reward as redeemed**, preventing future redemption

### Example 3: Manager Reviews Loyalty Stats

1. **Manager opens loyalty dashboard**

2. **Frontend fetches statistics:**
   ```
   GET /api/crm/loyalty-rewards/statistics
   ```

3. **Manager sees:**
   - 57% redemption rate
   - 67 pending rewards
   - Average redemption time: 12.5 days

4. **Manager can drill down:**
   ```
   GET /api/crm/loyalty-rewards?milestone=5
   ```
   To see all 5th visit rewards

## Row Level Security (RLS)

All loyalty_rewards operations are protected by RLS policies:

- **SELECT**: Admin, Manager, Owner can view all rewards
- **INSERT**: Admin, Manager can create rewards (mostly done automatically)
- **UPDATE**: Admin, Manager, Waiter can update (for redemption)

The `redeemed_by` field automatically records which staff member processed the redemption.

## Best Practices

### For Staff
1. Always record customer visits in the system
2. Inform customers immediately when they earn a reward
3. Check for unredeemed rewards when customers return
4. Add notes when redeeming rewards (what was given)

### For Managers
1. Review loyalty statistics weekly
2. Monitor redemption rates - low rates may indicate communication issues
3. Use top customers report to identify VIP candidates
4. Check for old unredeemed rewards and remind customers

### For Frontend Developers
1. Show badge/indicator when a customer has unredeemed rewards
2. Display milestone progress on customer profiles (e.g., "3/5 visits to next reward")
3. Add sound/animation when a customer reaches a milestone
4. Allow filtering loyalty rewards by redemption status

## Integration Points

### With Other Modules

**M6: Reservations**
- When customer checks in for reservation, record visit

**M5: POS & Sales**
- When order is closed, prompt to record customer visit
- Link reward redemptions to sales transactions

**M7: Marketing**
- Send automated email when customer earns a reward
- Include loyalty status in newsletter segments

**M11: AI Assistant**
- "How many visits does John Doe have?"
- "Show me unredeemed rewards"
- "What's our loyalty redemption rate?"

## Future Enhancements

Potential features to add:

1. **Expiration Dates**: Auto-expire rewards after X days
2. **Custom Rewards**: Allow managers to create custom rewards
3. **Points System**: Earn points per visit, redeem for various rewards
4. **Tiered Program**: Bronze/Silver/Gold tiers
5. **Email Notifications**: Auto-notify customers when they earn rewards
6. **QR Code Redemption**: Customers scan QR code to redeem
7. **Referral Rewards**: Reward customers who bring friends
8. **Birthday Bonus**: Extra reward on customer's birthday

## Migrations

- `001_initial_schema.sql`: Creates `loyalty_rewards` table
- `015_crm_enhancements.sql`: Adds functions and RLS policies
- `016_loyalty_redemption.sql`: Adds redemption tracking fields and functions
