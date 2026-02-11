# Staff Management UI - Testing Guide

## 🧪 Testing Checklist

### Prerequisites

1. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Run database migrations**
   ```bash
   cd supabase
   supabase db reset  # or apply migrations manually
   ```

3. **Create test users**
   - Create an admin user via sign-up
   - Update their role in the database:
     ```sql
     UPDATE profiles
     SET role = 'admin'
     WHERE email = 'admin@test.com';
     ```

4. **Start dev server**
   ```bash
   pnpm dev
   ```

---

## ✅ Manual Test Cases

### 1. Authentication & Authorization

#### Test 1.1: Unauthenticated Access
- **Steps:**
  1. Log out (if logged in)
  2. Navigate to `/staff`
- **Expected:** Redirect to `/login`
- **Status:** [ ]

#### Test 1.2: Unauthorized Role Access
- **Steps:**
  1. Log in as user with role "waiter"
  2. Navigate to `/staff`
- **Expected:** Redirect to `/dashboard`
- **Status:** [ ]

#### Test 1.3: Authorized Access (Admin)
- **Steps:**
  1. Log in as admin
  2. Navigate to `/staff`
- **Expected:** Page loads successfully
- **Status:** [ ]

#### Test 1.4: Authorized Access (Manager)
- **Steps:**
  1. Log in as manager
  2. Navigate to `/staff`
- **Expected:** Page loads successfully
- **Status:** [ ]

---

### 2. Page Load & Display

#### Test 2.1: Loading States
- **Steps:**
  1. Open `/staff` with slow network (DevTools throttling)
  2. Observe loading states
- **Expected:**
  - Skeleton loaders for stat cards
  - Skeleton loaders for employee rows
- **Status:** [ ]

#### Test 2.2: Empty State
- **Steps:**
  1. Access page with no employees
- **Expected:**
  - Stats show "0"
  - Table shows "No employees found"
- **Status:** [ ]

#### Test 2.3: Stats Calculation
- **Steps:**
  1. Add 3 employees (2 full-time, 1 part-time)
  2. Set hourly rates: €15, €18, €12
  3. Refresh page
- **Expected:**
  - Total Employees: 3
  - Full-time Staff: 2
  - Average Rate: €15.00
- **Status:** [ ]

---

### 3. Employee List

#### Test 3.1: Display All Employees
- **Steps:**
  1. Add 5+ test employees
  2. Navigate to `/staff`
- **Expected:**
  - All employees displayed in table
  - Avatar, name, email visible
  - Role badge color-coded
  - Contract type shown
  - Hourly rate formatted (€XX.XX/h)
- **Status:** [ ]

#### Test 3.2: Search Functionality
- **Steps:**
  1. Type "john" in search box
- **Expected:**
  - Only employees with "john" in name/email/role visible
  - Result count updates
- **Status:** [ ]

#### Test 3.3: Search Clear
- **Steps:**
  1. Search for "john"
  2. Clear search box
- **Expected:**
  - All employees visible again
- **Status:** [ ]

#### Test 3.4: Search No Results
- **Steps:**
  1. Search for "xyz123"
- **Expected:**
  - Table shows "No employees found"
  - Result count: "0 employees"
- **Status:** [ ]

#### Test 3.5: Avatar Display
- **Steps:**
  1. Check employees with/without avatars
- **Expected:**
  - If avatar_url exists: Image displayed
  - If no avatar: Initials displayed (e.g., "JD")
- **Status:** [ ]

#### Test 3.6: Role Badge Colors
- **Steps:**
  1. Create employees with different roles
- **Expected:**
  | Role    | Badge Color |
  |---------|-------------|
  | admin   | Red         |
  | manager | Blue        |
  | kitchen | Orange      |
  | bar     | Green       |
  | waiter  | Purple      |
  | dj      | Pink        |
  | owner   | Amber       |
- **Status:** [ ]

---

### 4. Add Employee Form

#### Test 4.1: Open Form
- **Steps:**
  1. Click "+ Add Employee" button
- **Expected:**
  - Sheet slides in from right
  - Form is empty
  - Title: "Add New Employee"
- **Status:** [ ]

#### Test 4.2: Close Form (Cancel)
- **Steps:**
  1. Open form
  2. Click "Cancel" button
- **Expected:**
  - Sheet closes
  - Form data cleared
- **Status:** [ ]

#### Test 4.3: Close Form (X button)
- **Steps:**
  1. Open form
  2. Click X in top-right
- **Expected:**
  - Sheet closes
- **Status:** [ ]

#### Test 4.4: Close Form (Escape key)
- **Steps:**
  1. Open form
  2. Press Escape key
- **Expected:**
  - Sheet closes
- **Status:** [ ]

#### Test 4.5: Form Validation - Required Fields
- **Steps:**
  1. Open form
  2. Click "Create Employee" without filling fields
- **Expected:**
  - Browser validation errors
  - Form not submitted
- **Status:** [ ]

#### Test 4.6: Form Validation - Email Format
- **Steps:**
  1. Enter invalid email (e.g., "notanemail")
  2. Submit form
- **Expected:**
  - Browser validation error
- **Status:** [ ]

#### Test 4.7: Form Validation - Password Length
- **Steps:**
  1. Enter password with < 6 characters
  2. Submit form
- **Expected:**
  - Browser validation error
- **Status:** [ ]

#### Test 4.8: Successful Employee Creation
- **Steps:**
  1. Open form
  2. Fill all required fields:
     - Full Name: "Test Employee"
     - Email: "test@example.com"
     - Password: "password123"
     - Role: Waiter
     - Hourly Rate: 15.00
     - Contract Type: Part-time
  3. Click "Create Employee"
- **Expected:**
  - Loading spinner appears
  - Success toast: "Employee added successfully"
  - Sheet closes
  - Employee list refreshes
  - New employee appears in table
- **Status:** [ ]

#### Test 4.9: Duplicate Email Error
- **Steps:**
  1. Create employee with email "test@example.com"
  2. Try to create another with same email
- **Expected:**
  - Error toast with message
  - Form stays open
- **Status:** [ ]

#### Test 4.10: Optional Fields
- **Steps:**
  1. Create employee with only required fields
  2. Leave phone, date hired, emergency contact empty
- **Expected:**
  - Employee created successfully
  - Optional fields show "—" or empty in table
- **Status:** [ ]

---

### 5. Edit Employee (Future)

#### Test 5.1: Open Edit Form
- **Steps:**
  1. Click ⋮ menu on employee row
  2. Click "Edit"
- **Expected:**
  - Sheet opens with employee data pre-filled
  - Email field disabled
  - No password field
  - Title: "Edit Employee"
- **Status:** [ ] (Not implemented)

---

### 6. Delete Employee (Future)

#### Test 6.1: Delete Confirmation
- **Steps:**
  1. Click ⋮ menu on employee row
  2. Click "Delete"
- **Expected:**
  - Confirmation dialog appears
  - "Are you sure..." message
- **Status:** [ ] (Not implemented)

---

### 7. Responsive Design

#### Test 7.1: Desktop (≥ 1024px)
- **Steps:**
  1. Resize browser to 1280px width
- **Expected:**
  - 4 stat cards in one row
  - All table columns visible
  - Sheet 400px wide from right
- **Status:** [ ]

#### Test 7.2: Tablet (768-1023px)
- **Steps:**
  1. Resize browser to 800px width
- **Expected:**
  - Stat cards in 2x2 grid
  - "Contact" column hidden
  - Other columns visible
- **Status:** [ ]

#### Test 7.3: Mobile (< 768px)
- **Steps:**
  1. Resize browser to 375px width (iPhone SE)
- **Expected:**
  - Stat cards in 2x2 grid
  - Only show: Employee, Role, Rate columns
  - Sheet takes full width
  - Touch targets easily tappable
- **Status:** [ ]

#### Test 7.4: Mobile Form
- **Steps:**
  1. Open form on mobile (375px)
  2. Try to fill form
- **Expected:**
  - Form sections clearly separated
  - Input fields full width
  - Buttons stack vertically
  - Keyboard doesn't obscure inputs
- **Status:** [ ]

---

### 8. Accessibility

#### Test 8.1: Keyboard Navigation
- **Steps:**
  1. Use Tab key to navigate
- **Expected:**
  - Can reach all interactive elements
  - Focus visible (outline)
  - Can open dropdown menus
  - Can submit form with Enter
  - Can close sheet with Escape
- **Status:** [ ]

#### Test 8.2: Screen Reader (VoiceOver/NVDA)
- **Steps:**
  1. Enable screen reader
  2. Navigate through page
- **Expected:**
  - Proper announcements
  - Table structure clear
  - Form labels read correctly
  - Button purposes clear
- **Status:** [ ]

#### Test 8.3: Color Contrast
- **Steps:**
  1. Check contrast with DevTools
- **Expected:**
  - All text meets WCAG AA (4.5:1)
  - Badge text readable
- **Status:** [ ]

---

### 9. Performance

#### Test 9.1: Large Dataset
- **Steps:**
  1. Add 50+ employees
  2. Navigate to page
- **Expected:**
  - Page loads quickly (< 2s)
  - Scrolling smooth
  - Search responsive
- **Status:** [ ]

#### Test 9.2: Search Performance
- **Steps:**
  1. With 50+ employees
  2. Type in search box
- **Expected:**
  - Results update immediately
  - No lag or stuttering
- **Status:** [ ]

---

### 10. Error Handling

#### Test 10.1: Network Error
- **Steps:**
  1. Disconnect network
  2. Navigate to `/staff`
- **Expected:**
  - Error message displayed
  - Red error card with message
- **Status:** [ ]

#### Test 10.2: API Error (500)
- **Steps:**
  1. Mock API to return 500 error
  2. Refresh page
- **Expected:**
  - Error message: "Failed to load employees"
- **Status:** [ ]

#### Test 10.3: Form Submission Error
- **Steps:**
  1. Try to create employee with invalid data
- **Expected:**
  - Error toast appears
  - Form stays open
  - Data preserved
- **Status:** [ ]

---

## 🤖 Automated Testing (Future)

### E2E Tests (Playwright)
```typescript
// tests/staff-management.spec.ts

test('should display employee list', async ({ page }) => {
  await page.goto('/staff')
  await expect(page.locator('h1')).toContainText('Staff Management')
  await expect(page.locator('table')).toBeVisible()
})

test('should search employees', async ({ page }) => {
  await page.goto('/staff')
  await page.fill('input[placeholder*="Search"]', 'john')
  await expect(page.locator('table tbody tr')).toHaveCount(1)
})

test('should create new employee', async ({ page }) => {
  await page.goto('/staff')
  await page.click('button:has-text("Add Employee")')

  await page.fill('#full_name', 'Test User')
  await page.fill('#email', 'test@example.com')
  await page.fill('#password', 'password123')
  await page.selectOption('#role', 'waiter')
  await page.fill('#hourly_rate', '15.00')

  await page.click('button[type="submit"]')

  await expect(page.locator('text=Employee added successfully')).toBeVisible()
  await expect(page.locator('table')).toContainText('Test User')
})
```

### Unit Tests (Vitest)
```typescript
// tests/components/employee-list.test.tsx

import { render, screen } from '@testing-library/react'
import { EmployeeList } from '@/components/staff/employee-list'

test('displays employee name', () => {
  const employees = [
    { /* mock employee data */ }
  ]

  render(<EmployeeList employees={employees} />)

  expect(screen.getByText('John Doe')).toBeInTheDocument()
})
```

---

## 📝 Test Report Template

```markdown
# Staff UI Test Report

**Date:** YYYY-MM-DD
**Tester:** Name
**Environment:** Development / Staging / Production
**Browser:** Chrome 120 / Safari 17 / Firefox 121

## Summary
- Total Tests: X
- Passed: X
- Failed: X
- Blocked: X

## Failed Tests
1. Test X.X - Issue description
   - Expected: ...
   - Actual: ...
   - Screenshot: [link]

## Notes
- Any additional observations
- Performance concerns
- Browser-specific issues

## Next Steps
- Fix failing tests
- Add automated tests
- Retest on production
```

---

## 🚀 Quick Test Script

```bash
#!/bin/bash
# quick-test.sh - Run basic smoke tests

echo "🧪 Starting Staff UI Tests..."

# 1. Check TypeScript compilation
echo "1. TypeScript check..."
pnpm tsc --noEmit || exit 1

# 2. Check linting
echo "2. Lint check..."
pnpm lint || exit 1

# 3. Build check
echo "3. Build check..."
pnpm build || exit 1

# 4. Run unit tests (when available)
# pnpm test

echo "✅ All checks passed!"
```

Make executable:
```bash
chmod +x quick-test.sh
./quick-test.sh
```

---

## ✅ Sign-off Checklist

Before marking task as complete:

- [ ] All critical test cases passed
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Build succeeds
- [ ] Tested on Chrome
- [ ] Tested on Safari
- [ ] Tested on mobile (375px, 414px)
- [ ] Tested on tablet (768px)
- [ ] Tested on desktop (1280px, 1920px)
- [ ] Keyboard navigation works
- [ ] Loading states work
- [ ] Error states work
- [ ] Forms validate correctly
- [ ] Success toasts appear
- [ ] Data refreshes after actions
- [ ] No console errors
- [ ] No React warnings
- [ ] Responsive design verified
- [ ] Accessibility checked (basic)

---

**Ready for next module:** Shift Scheduler UI ✨
