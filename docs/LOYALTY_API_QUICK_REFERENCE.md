# Loyalty Program API - Quick Reference

**Status:** ✅ Backend Complete | **Module:** M10 - CRM

---

## 🎯 Quick Links

- **Full Documentation:** [LOYALTY_PROGRAM.md](./LOYALTY_PROGRAM.md)
- **Tests:** `tests/integration/loyalty-program.test.ts`
- **Migration:** `supabase/migrations/016_loyalty_redemption.sql`

---

## 📋 Loyalty Milestones

| Visits | Reward |
|--------|--------|
| 5 | 🍺 Free drink |
| 10 | 🍰 Free dessert |
| 20 | 🥗 Free appetizer |
| 50 | 💰 20% off next meal |
| 100 | 🎉 Free dinner for two |

---

## 🔌 API Endpoints

### 1. Record Customer Visit ⭐
```typescript
POST /api/crm/customers/{customerId}/visit
Auth: Admin, Manager, Waiter

Response:
{
  customer: { id, name, visit_count, ... },
  newReward: { visit_milestone, reward_description, ... } | null,
  message: "Visit recorded! Customer reached 5 visits milestone."
}
```
**Use:** Every time a customer visits the restaurant

---

### 2. Get Customer's Rewards ⭐
```typescript
GET /api/crm/customers/{customerId}/loyalty-rewards
Auth: Admin, Manager, Waiter

Response:
{
  customer: { id, name, visit_count },
  unredeemed: [...],  // Active rewards
  all_rewards: [...], // Full history
  stats: { total_rewards, unredeemed_count, redeemed_count }
}
```
**Use:** Display on customer profile page

---

### 3. Redeem Reward ⭐
```typescript
POST /api/crm/loyalty-rewards/{rewardId}/redeem
Auth: Admin, Manager, Waiter

Body: { notes?: "Corona Extra given" }

Response:
{
  success: true,
  reward: { id, redeemed_at, redeemed_by, ... },
  message: "Reward redeemed successfully"
}
```
**Use:** When customer uses their reward

---

### 4. List All Rewards
```typescript
GET /api/crm/loyalty-rewards
Auth: Admin, Manager, Owner

Query: ?page=1&limit=50&customer_id=...&milestone=5

Response:
{
  data: [...],
  pagination: { page, limit, total, totalPages }
}
```
**Use:** Loyalty rewards management page

---

### 5. Get Statistics
```typescript
GET /api/crm/loyalty-rewards/statistics
Auth: Admin, Manager, Owner

Response:
{
  total_rewards_issued: 156,
  total_rewards_redeemed: 89,
  total_rewards_pending: 67,
  redemption_rate: 57.05,
  rewards_by_milestone: { "5": {...}, "10": {...}, ... },
  avg_redemption_days: 12.5,
  rewards_issued_this_month: 15,
  rewards_redeemed_this_month: 8
}
```
**Use:** Loyalty dashboard, analytics

---

### 6. Get Top Customers
```typescript
GET /api/crm/loyalty-rewards/top-customers?limit=10
Auth: Admin, Manager, Owner

Response:
{
  data: [
    {
      customer_id, customer_name, customer_email,
      visit_count, total_rewards, redeemed_rewards,
      pending_rewards, vip
    },
    ...
  ],
  count: 10
}
```
**Use:** Leaderboard, VIP identification

---

## 💡 Common UI Patterns

### Customer Profile Card
```typescript
// Fetch customer rewards
const { unredeemed, stats } = await fetch(
  `/api/crm/customers/${id}/loyalty-rewards`
).then(r => r.json())

// Display:
// - Visit count with progress bar (e.g., "8/10 visits to next reward")
// - Unredeemed rewards list with "Redeem" button
// - Reward history table
```

### Recording a Visit
```typescript
const handleRecordVisit = async () => {
  const res = await fetch(`/api/crm/customers/${id}/visit`, {
    method: 'POST'
  })
  const data = await res.json()

  if (data.newReward) {
    // 🎉 Show celebration modal/toast
    showCelebration(data.newReward)
  }

  // Refresh customer data
  refetchCustomer()
}
```

### Redeeming a Reward
```typescript
const handleRedeem = async (rewardId: string) => {
  const confirmed = await showConfirmDialog(
    "Redeem this reward?",
    "Enter what was given:"
  )

  if (!confirmed) return

  const res = await fetch(`/api/crm/loyalty-rewards/${rewardId}/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: confirmed.notes })
  })

  const data = await res.json()

  if (data.success) {
    showToast("✅ Reward redeemed!")
    refetchRewards()
  } else {
    showToast(`❌ ${data.error}`)
  }
}
```

### Dashboard Statistics
```typescript
const LoyaltyDashboard = () => {
  const { data: stats } = useQuery(
    'loyalty-stats',
    () => fetch('/api/crm/loyalty-rewards/statistics').then(r => r.json())
  )

  return (
    <div>
      <KPICard title="Redemption Rate" value={`${stats.redemption_rate}%`} />
      <KPICard title="Pending Rewards" value={stats.total_rewards_pending} />
      <MilestoneChart data={stats.rewards_by_milestone} />
    </div>
  )
}
```

---

## 🎨 UI Components to Build

### 1. Customer Visit Badge
```tsx
{unredeemedCount > 0 && (
  <Badge variant="success">{unredeemedCount} reward(s)</Badge>
)}
```

### 2. Milestone Progress
```tsx
<ProgressBar
  value={visitCount % 5}
  max={5}
  label={`${visitCount % 5}/5 visits to next reward`}
/>
```

### 3. Reward Card
```tsx
<Card>
  <h3>{reward.visit_milestone} Visit Reward</h3>
  <p>{reward.reward_description}</p>
  {!reward.redeemed_at ? (
    <Button onClick={() => handleRedeem(reward.id)}>Redeem</Button>
  ) : (
    <p className="text-muted">
      Redeemed on {formatDate(reward.redeemed_at)}
    </p>
  )}
</Card>
```

### 4. Celebration Modal
```tsx
<Dialog open={showCelebration}>
  <Confetti />
  <h1>🎉 Milestone Reached!</h1>
  <p>{newReward.reward_description}</p>
  <Button onClick={handleClose}>Awesome!</Button>
</Dialog>
```

---

## 🔐 Access Control

| Endpoint | Admin | Manager | Waiter | Owner |
|----------|-------|---------|--------|-------|
| Record visit | ✅ | ✅ | ✅ | ❌ |
| Redeem reward | ✅ | ✅ | ✅ | ❌ |
| View rewards | ✅ | ✅ | ✅ (own) | ✅ |
| View statistics | ✅ | ✅ | ❌ | ✅ |

---

## 🧪 Testing Tips

### Test in Browser Console
```javascript
// Record 5 visits for a customer
const customerId = 'your-customer-id'
for (let i = 0; i < 5; i++) {
  await fetch(`/api/crm/customers/${customerId}/visit`, { method: 'POST' })
}

// Check rewards
const res = await fetch(`/api/crm/customers/${customerId}/loyalty-rewards`)
const data = await res.json()
console.log('Rewards:', data)
```

### Mock Data for Development
```typescript
const mockReward = {
  id: 'mock-reward-1',
  visit_milestone: 5,
  reward_description: 'Free drink on your 5th visit!',
  reward_issued_at: new Date().toISOString(),
  redeemed_at: null,
}
```

---

## ⚠️ Common Errors

### Error: "Reward already redeemed"
- **Cause:** Trying to redeem a reward twice
- **Fix:** Check `redeemed_at` field before showing redeem button

### Error: "Unauthorized"
- **Cause:** User doesn't have permission
- **Fix:** Check user role with `requireRole()` on API route

### Error: "Reward not found"
- **Cause:** Invalid reward ID
- **Fix:** Validate reward exists before redemption

---

## 📊 Database Schema (Reference)

```sql
loyalty_rewards
├── id                 UUID (PK)
├── customer_id        UUID (FK → customers)
├── visit_milestone    INTEGER (5, 10, 20, 50, 100)
├── reward_description TEXT
├── reward_issued_at   TIMESTAMPTZ
├── redeemed_at        TIMESTAMPTZ (NULL = unredeemed)
├── redeemed_by        UUID (FK → profiles)
├── redeemed_notes     TEXT
└── created_at         TIMESTAMPTZ
```

---

## 🚀 Next Steps

1. ✅ Backend complete
2. 🔄 Build UI components (frontend agent)
3. 🔄 Add to customer profile page
4. 🔄 Create loyalty dashboard
5. 🔄 Add celebration animations
6. 🔄 Add push notifications for new rewards

---

## 📞 Need Help?

- See full docs: [LOYALTY_PROGRAM.md](./LOYALTY_PROGRAM.md)
- Check implementation: [LOYALTY_IMPLEMENTATION_SUMMARY.md](../LOYALTY_IMPLEMENTATION_SUMMARY.md)
- Run tests: `npm test tests/integration/loyalty-program.test.ts`

---

**Last Updated:** February 6, 2024
