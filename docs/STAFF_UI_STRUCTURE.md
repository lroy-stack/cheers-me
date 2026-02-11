# Staff Management UI - Component Structure

## 📐 Component Architecture

```
src/app/staff/
├── layout.tsx              (Server Component - Auth & Role Check)
└── page.tsx                (Client Component - Main Page)
    ├── Stats Cards (4x)
    ├── EmployeeList        (src/components/staff/employee-list.tsx)
    │   ├── Search Input
    │   └── Table
    │       ├── TableHeader
    │       └── TableBody
    │           └── TableRow (per employee)
    │               ├── Avatar + Name + Email
    │               ├── Role Badge
    │               ├── Contract Type
    │               ├── Contact Info
    │               ├── Hire Date
    │               ├── Hourly Rate
    │               └── Actions Menu
    │                   ├── Edit
    │                   └── Delete
    └── EmployeeForm        (src/components/staff/employee-form.tsx)
        └── Sheet (slide-out)
            ├── Basic Information
            │   ├── Full Name
            │   ├── Email
            │   ├── Password (new only)
            │   ├── Role
            │   └── Phone
            ├── Contract Details
            │   ├── Contract Type
            │   ├── Hourly Rate
            │   └── Date Hired
            └── Emergency Contact
                ├── Contact Name
                └── Contact Phone
```

---

## 🔄 Data Flow

```
1. User navigates to /staff
   ↓
2. layout.tsx (Server)
   - Checks authentication
   - Verifies role (admin/manager)
   - Redirects if unauthorized
   ↓
3. page.tsx (Client)
   - Calls useEmployees hook
   ↓
4. useEmployees hook
   - Fetches GET /api/staff/employees?active=true
   - Returns { employees, loading, error, refetch }
   ↓
5. page.tsx renders
   - Stats cards (calculated from employees data)
   - EmployeeList component (displays table)
   ↓
6. User clicks "Add Employee"
   - Opens EmployeeForm (Sheet)
   ↓
7. EmployeeForm submission
   - POST /api/auth/sign-up (create user)
   - POST /api/staff/employees (create employee record)
   - Shows toast notification
   - Calls refetch() to update list
```

---

## 🎨 Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Staff Management                        [+ Add Employee]   │
│  Manage team members and their employment details           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  👥 24   │  │  🕐 12   │  │  💰 €15  │  │  ⚠️  —   │   │
│  │  Active  │  │  Full-   │  │  Average │  │  Shifts  │   │
│  │  Empl.   │  │  time    │  │  Rate    │  │  Week    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔍  Search by name, email, or role...  (24 empl.)  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Employee       │ Role    │ Contract  │ Contact │... │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ [🧑] John Doe │ [WAITER]│ Part-time │ +34...  │... │   │
│  │   john@...    │         │           │         │    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ [👩] Jane Sm. │ [MGR]   │ Full-time │ +34...  │... │   │
│  │   jane@...    │         │           │         │    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Mobile View (< 768px)
```
┌──────────────────────────┐
│  Staff Management        │
│  [+ Add Employee]        │
├──────────────────────────┤
│  ┌─────┐  ┌─────┐       │
│  │ 👥  │  │ 🕐  │       │
│  │ 24  │  │ 12  │       │
│  └─────┘  └─────┘       │
│  ┌─────┐  ┌─────┐       │
│  │ 💰  │  │ ⚠️  │       │
│  │ €15 │  │  —  │       │
│  └─────┘  └─────┘       │
├──────────────────────────┤
│  🔍  Search...  (24)     │
├──────────────────────────┤
│  Employee  │ Role │ Rate │
├──────────────────────────┤
│  [🧑] John │[WAI]│€15/h │
│  john@...  │     │      │
├──────────────────────────┤
│  [👩] Jane │[MGR]│€20/h │
│  jane@...  │     │      │
└──────────────────────────┘
```

---

## 🎯 Responsive Breakpoints

### Desktop (≥ 1024px)
- All 4 stat cards in one row
- Full table with all columns
- Side sheet (400px width)

### Tablet (768px - 1023px)
- 4 stat cards in 2x2 grid
- Hide "Contact" column
- Side sheet (400px width)

### Mobile (< 768px)
- 4 stat cards in 2x2 grid
- Hide "Contact" and "Hired" columns
- Full-width sheet overlay

---

## 🌈 Color Coding

### Role Badges
```css
admin     → bg-red-500      (red)
manager   → bg-blue-500     (blue)
kitchen   → bg-orange-500   (orange)
bar       → bg-green-500    (green)
waiter    → bg-purple-500   (purple)
dj        → bg-pink-500     (pink)
owner     → bg-amber-500    (amber)
```

### Action Colors
```css
Edit button   → default (muted)
Delete button → text-red-600
Add button    → bg-blue-500 (Staff module color)
```

---

## 📊 State Management

### Local State (useState)
- `formOpen` - Sheet visibility
- `selectedEmployee` - Employee being edited
- `searchQuery` - Search filter in EmployeeList

### Server State (useEmployees hook)
- `employees` - Array of EmployeeWithProfile
- `loading` - Fetch in progress
- `error` - Error message if fetch fails
- `refetch()` - Function to reload data

---

## 🔐 Security

### Authentication (layout.tsx)
```typescript
1. Check if user is authenticated
   → If not: redirect to /login

2. Check user role (admin or manager)
   → If not: redirect to /dashboard
```

### API Security
- All endpoints require authentication
- Role-based access control on API level
- RLS policies on Supabase tables

---

## 🎭 Interaction Patterns

### Add Employee Flow
```
1. Click "+ Add Employee" button
2. Sheet slides in from right
3. Fill form (name, email, password, role, rate, etc.)
4. Click "Create Employee"
5. Loading spinner appears
6. Success toast appears
7. Sheet closes
8. Employee list auto-refreshes
```

### Edit Employee Flow (Not Yet Implemented)
```
1. Click "⋮" menu on employee row
2. Click "Edit"
3. Sheet slides in with pre-filled data
4. Modify fields
5. Click "Update Employee"
6. Success toast
7. Sheet closes
8. List refreshes
```

### Search Flow
```
1. Type in search input
2. Table filters in real-time
3. Result count updates
4. Empty state if no matches
```

---

## 📦 Dependencies

### npm Packages
- `@supabase/ssr` - Supabase client (server/browser)
- `date-fns` - Date formatting
- `lucide-react` - Icons
- `next` - Framework
- `react` - UI library
- `tailwindcss` - Styling

### shadcn/ui Components
- Avatar
- Badge
- Button
- Card
- Dialog
- Dropdown Menu
- Form
- Input
- Label
- Select
- Sheet
- Skeleton
- Table
- Toast

---

## 🔧 Customization Points

### Easy to Modify
1. **Role colors** - `roleColors` object in employee-list.tsx
2. **Contract labels** - `contractTypeLabels` object
3. **Table columns** - Add/remove TableHead/TableCell
4. **Form fields** - Add sections to EmployeeForm
5. **Filters** - Extend search logic in EmployeeList

### Extension Ideas
1. **Sorting** - Add onClick handlers to table headers
2. **Pagination** - Wrap table with pagination controls
3. **Export** - Add "Export CSV" button
4. **Bulk actions** - Add checkbox column + bulk action bar
5. **Details page** - Click row → navigate to /staff/[id]

---

## ✅ Accessibility

### Implemented
- ✅ Semantic HTML (table, form elements)
- ✅ ARIA labels on icon buttons
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Focus management (Sheet auto-focuses)
- ✅ Screen reader text ("sr-only")
- ✅ Color contrast (WCAG AA compliant)
- ✅ Touch targets (44px minimum)

### Future Improvements
- Add ARIA live regions for dynamic updates
- Implement keyboard shortcuts (Cmd+K for search)
- Add skip-to-content link
- Improve screen reader announcements

---

## 🚀 Performance

### Optimizations
- ✅ Client-side search (no API calls)
- ✅ Lazy render (Sheet only when open)
- ✅ Debouncing not needed (small dataset)
- ✅ No unnecessary re-renders
- ✅ Efficient array operations

### Future Optimizations (if dataset grows)
- Virtual scrolling for table
- Debounced search
- Server-side pagination
- Memoization (useMemo, React.memo)
- Code splitting per route

---

This structure provides a solid foundation for the Staff Management module with room for future enhancements! 🎉
