# Notifications Components

This directory contains all UI components for the push notification system.

## Components

### `<NotificationBell />`
The main notification icon with badge shown in the topbar.

**Usage:**
```tsx
import { NotificationBell } from '@/components/notifications/notification-bell'

<NotificationBell />
```

**Features:**
- Bell icon with unread count badge
- Opens popover with notification list
- Accessible via keyboard
- Auto-updates in real-time

---

### `<NotificationList />`
The dropdown list of notifications (shown in the bell popover).

**Usage:**
```tsx
import { NotificationList } from '@/components/notifications/notification-list'

<PopoverContent>
  <NotificationList />
</PopoverContent>
```

**Features:**
- Scrollable list (max 400px height)
- "Mark all as read" button
- Empty state when no notifications
- Loading skeleton

---

### `<NotificationItem />`
Individual notification item with icon and actions.

**Usage:**
```tsx
import { NotificationItem } from '@/components/notifications/notification-item'

<NotificationItem notification={notification} />
```

**Features:**
- Type-specific icon (calendar, clock, users, etc.)
- Clickable to navigate to action URL
- Marks as read on click
- Delete button (visible on hover)
- Relative timestamp ("2 hours ago")
- Unread indicator dot

---

### `<NotificationPermissionPrompt />`
Dismissible card prompting user to enable notifications.

**Usage:**
```tsx
import { NotificationPermissionPrompt } from '@/components/notifications/notification-permission-prompt'

// In your dashboard or any page
export default function DashboardPage() {
  return (
    <div>
      <NotificationPermissionPrompt />
      {/* rest of page */}
    </div>
  )
}
```

**Features:**
- Only shows if not subscribed
- Dismissible
- Auto-hides if browser doesn't support push
- Shows error states

---

### `<NotificationSettings />`
Settings panel for managing notification preferences.

**Usage:**
```tsx
import { NotificationSettings } from '@/components/notifications/notification-permission-prompt'

// In settings page
<Card>
  <CardHeader>
    <CardTitle>Notifications</CardTitle>
  </CardHeader>
  <CardContent>
    <NotificationSettings />
  </CardContent>
</Card>
```

**Features:**
- Enable/disable push notifications
- Shows current subscription status
- Handles permission denied state
- Shows browser support status

---

## Example: Add to Topbar

```tsx
// src/components/layout/topbar.tsx
'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NotificationBell } from '@/components/notifications/notification-bell'

export function Topbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Left: Logo or title */}
        <div className="flex-1">
          <h1 className="text-lg font-semibold">GrandCafe Cheers</h1>
        </div>

        {/* Right: Notifications + User menu */}
        <div className="flex items-center gap-2">
          <NotificationBell />

          <Avatar className="h-8 w-8">
            <AvatarImage src="/avatars/user.jpg" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
```

## Example: Add to Dashboard

```tsx
// src/app/dashboard/page.tsx
import { NotificationPermissionPrompt } from '@/components/notifications/notification-permission-prompt'
import { KpiCards } from '@/components/dashboard/kpi-cards'

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back!</p>
      </div>

      {/* Notification permission prompt */}
      <NotificationPermissionPrompt />

      {/* KPI cards */}
      <KpiCards />

      {/* Rest of dashboard */}
    </div>
  )
}
```

## Example: Add to Settings

```tsx
// src/app/settings/page.tsx
import { NotificationSettings } from '@/components/notifications/notification-permission-prompt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationSettings />
        </CardContent>
      </Card>

      {/* Other settings */}
    </div>
  )
}
```

## Customization

### Change Icon Color
Edit `notification-bell.tsx`:
```tsx
<Bell className="h-5 w-5 text-amber-500" /> {/* Change color */}
```

### Change Badge Style
Edit `notification-bell.tsx`:
```tsx
<Badge
  variant="destructive"
  className="absolute -right-1 -top-1 h-5 min-w-[20px] rounded-full bg-amber-500" {/* Custom color */}
>
  {unreadCount}
</Badge>
```

### Change Popover Width
Edit `notification-bell.tsx`:
```tsx
<PopoverContent className="w-[500px] p-0" align="end"> {/* Wider */}
```

### Change Max Notifications Shown
Edit `notification-list.tsx` - modify the `limit` parameter in the API call.

## Styling

All components use Tailwind CSS classes and respect your theme configuration:
- `text-primary` - Uses your primary color
- `bg-muted` - Uses your muted background
- `text-muted-foreground` - Uses muted text color
- Dark mode support via `dark:` classes

## Accessibility

All components follow WCAG 2.1 AA guidelines:
- ✅ Keyboard navigation
- ✅ Screen reader labels (`sr-only` text)
- ✅ ARIA attributes (`role="alert"`, etc.)
- ✅ Focus indicators
- ✅ Proper heading hierarchy

## Performance

- **Lazy loading**: Notifications fetched on mount, not on every render
- **Real-time updates**: Only new notifications trigger re-renders
- **Optimized queries**: Limited to 50 recent notifications
- **Memoization**: Callbacks are memoized to prevent re-renders

## Browser Support

- ✅ All modern browsers
- ✅ Mobile browsers (iOS 16.4+, Android Chrome)
- ⚠️ Graceful degradation on unsupported browsers
