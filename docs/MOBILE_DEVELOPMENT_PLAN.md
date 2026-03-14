# GrandCafe Cheers Employee App — Complete Development Plan

**Stack:** Expo SDK 53 (managed) + Expo Router v4 + NativeWind v4 + TanStack Query v5 + Zustand v5 + MMKV + Supabase JS v2
**Target:** iOS primary (App Store), Android secondary
**Users:** 20-30 employees (waiter, bar, kitchen, dj), 4 languages (NL/EN/ES/DE)
**Backend:** Existing Next.js 16 at `https://app.cheersmallorca.com` + Supabase (PostgreSQL 17, RLS, 7 roles)

---

## 1. COMPLETE FILE TREE

```
grandcafe-cheers-mobile/
├── app.json
├── eas.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── .env.example
├── .env.local
├── .gitignore
├── CLAUDE.md
├── global.css
├── nativewind-env.d.ts
├── index.ts                              # Expo entry point (registerRootComponent)
│
├── app/
│   ├── _layout.tsx                       # Root layout: providers stack
│   │
│   ├── (auth)/
│   │   ├── _layout.tsx                   # Auth stack layout (no tabs)
│   │   ├── login.tsx                     # Email + password login screen
│   │   └── forgot-password.tsx           # Password reset request
│   │
│   ├── (tabs)/
│   │   ├── _layout.tsx                   # Tab bar layout (5 tabs)
│   │   │
│   │   ├── index.tsx                     # Tab 1: Home / Dashboard
│   │   │
│   │   ├── schedule/
│   │   │   ├── _layout.tsx              # Schedule stack layout
│   │   │   ├── index.tsx                # Weekly schedule view (my shifts)
│   │   │   └── [date].tsx               # Day detail (all staff on that day)
│   │   │
│   │   ├── hours/
│   │   │   ├── _layout.tsx              # Hours stack layout
│   │   │   ├── index.tsx                # Current period hours overview
│   │   │   └── [recordId].tsx           # Clock record detail
│   │   │
│   │   ├── chat/
│   │   │   ├── _layout.tsx              # Chat stack layout
│   │   │   └── index.tsx                # AI chat interface
│   │   │
│   │   └── more/
│   │       ├── _layout.tsx              # More stack layout
│   │       ├── index.tsx                # More menu (grid/list)
│   │       ├── profile.tsx              # Edit profile
│   │       ├── notifications.tsx        # Notification center
│   │       ├── tasks/
│   │       │   ├── _layout.tsx          # Tasks stack
│   │       │   ├── index.tsx            # My tasks list
│   │       │   └── [taskId].tsx         # Task detail + checklist
│   │       ├── availability.tsx          # Set availability
│   │       ├── swap-requests.tsx         # Shift swap requests
│   │       ├── leave/
│   │       │   ├── _layout.tsx          # Leave stack
│   │       │   ├── index.tsx            # Leave balance + requests
│   │       │   └── request.tsx          # New leave request form
│   │       ├── documents.tsx             # Payslips, contract docs
│   │       ├── training/
│   │       │   ├── _layout.tsx          # Training stack
│   │       │   ├── index.tsx            # Training materials list
│   │       │   └── [guideCode].tsx      # Course viewer + test
│   │       └── settings.tsx              # Language, theme, notifications
│
├── components/
│   ├── ui/
│   │   ├── button.tsx                    # Base button (pressable + haptics)
│   │   ├── text.tsx                      # Themed Text component
│   │   ├── card.tsx                      # Card container
│   │   ├── badge.tsx                     # Status badge
│   │   ├── input.tsx                     # Text input with label
│   │   ├── select.tsx                    # Bottom sheet select
│   │   ├── switch.tsx                    # Toggle switch
│   │   ├── skeleton.tsx                  # Loading skeleton
│   │   ├── empty-state.tsx              # Empty state illustration
│   │   ├── error-state.tsx              # Error state with retry
│   │   ├── avatar.tsx                    # User avatar (image + fallback)
│   │   ├── divider.tsx                   # Section divider
│   │   ├── bottom-sheet.tsx             # Reusable bottom sheet (@gorhom)
│   │   ├── icon.tsx                      # Icon wrapper (expo-symbols/lucide)
│   │   ├── pull-to-refresh.tsx          # Pull-to-refresh wrapper
│   │   ├── safe-area-view.tsx           # Safe area with keyboard
│   │   ├── header.tsx                    # Screen header bar
│   │   └── toast.tsx                     # Toast notification
│   │
│   ├── home/
│   │   ├── greeting-banner.tsx           # "Good morning, {name}" + date
│   │   ├── today-shift-card.tsx          # Today's shift summary
│   │   ├── hours-summary-card.tsx        # Weekly hours mini-stat
│   │   ├── upcoming-shifts-list.tsx      # Next 3 shifts
│   │   ├── pending-tasks-card.tsx        # Tasks due today
│   │   ├── notification-bell.tsx         # Bell icon + badge count
│   │   └── quick-actions.tsx             # Quick action buttons
│   │
│   ├── schedule/
│   │   ├── week-header.tsx               # Week selector (swipe L/R)
│   │   ├── day-column.tsx                # Single day in week view
│   │   ├── shift-card.tsx                # Individual shift display
│   │   ├── shift-legend.tsx              # M/T/N/D color legend
│   │   ├── colleagues-on-shift.tsx       # Who's working same shift
│   │   └── swap-shift-modal.tsx          # Initiate swap bottom sheet
│   │
│   ├── hours/
│   │   ├── period-selector.tsx           # Week / month toggle
│   │   ├── hours-chart.tsx               # Bar chart (daily hours)
│   │   ├── clock-record-row.tsx          # Single clock record
│   │   ├── hours-total-card.tsx          # Period total + net hours
│   │   └── break-timeline.tsx            # Visual break display
│   │
│   ├── chat/
│   │   ├── message-bubble.tsx            # Single message (user/AI)
│   │   ├── message-list.tsx              # Scrollable messages
│   │   ├── chat-input.tsx                # Text input + send button
│   │   ├── tool-indicator.tsx            # "Looking up schedule..."
│   │   ├── pending-action-card.tsx       # Confirm/reject action
│   │   ├── typing-indicator.tsx          # AI typing dots
│   │   └── conversation-drawer.tsx       # Past conversations list
│   │
│   ├── tasks/
│   │   ├── task-card.tsx                 # Task summary card
│   │   ├── task-checklist.tsx            # Checklist items (toggleable)
│   │   ├── task-priority-badge.tsx       # Priority indicator
│   │   └── task-filter-bar.tsx           # Status/priority filters
│   │
│   ├── leave/
│   │   ├── leave-balance-card.tsx        # Remaining days by type
│   │   ├── leave-request-card.tsx        # Single request display
│   │   └── leave-calendar.tsx            # Calendar with leave markers
│   │
│   ├── training/
│   │   ├── course-card.tsx               # Course with progress ring
│   │   ├── section-viewer.tsx            # Course section content
│   │   ├── test-question.tsx             # Quiz question
│   │   └── certificate-card.tsx          # Completed cert
│   │
│   ├── notifications/
│   │   ├── notification-item.tsx         # Single notification row
│   │   └── notification-badge.tsx        # Unread count badge
│   │
│   └── shared/
│       ├── role-badge.tsx                # Colored role pill
│       ├── date-range-picker.tsx         # Date range selector
│       ├── locale-flag.tsx               # Language flag icon
│       ├── offline-banner.tsx            # "You're offline" banner
│       └── version-info.tsx              # App version display
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # Supabase client (with SecureStore)
│   │   └── realtime.ts                   # Realtime subscription helpers
│   │
│   ├── api/
│   │   ├── client.ts                     # Base fetch client (auth token injection)
│   │   ├── auth.ts                       # signIn, signOut, refreshSession
│   │   ├── profile.ts                    # getProfile, updateProfile, uploadAvatar
│   │   ├── schedule.ts                   # getMyShifts, getWeekSchedule, getDayDetail
│   │   ├── clock.ts                      # getClockRecords (read-only)
│   │   ├── tasks.ts                      # getMyTasks, updateTaskItem, completeTask
│   │   ├── availability.ts              # getAvailability, setAvailability
│   │   ├── swap-requests.ts             # getSwapRequests, createSwap, respondSwap
│   │   ├── leave.ts                      # getLeaveRequests, getEntitlements, createRequest
│   │   ├── notifications.ts             # getNotifications, markRead, registerPush
│   │   ├── training.ts                  # getMaterials, getCourse, submitTest
│   │   ├── documents.ts                 # getDocuments (payslips)
│   │   └── chat.ts                       # sendMessage (SSE streaming)
│   │
│   ├── utils/
│   │   ├── date.ts                       # date-fns wrappers (Europe/Madrid TZ)
│   │   ├── format.ts                     # Currency, hours, minutes formatters
│   │   ├── shift-colors.ts              # Shift type → color mapping
│   │   ├── haptics.ts                    # Haptic feedback helpers
│   │   ├── linking.ts                    # Deep link URL handling
│   │   └── platform.ts                   # Platform detection helpers
│   │
│   └── push/
│       ├── registration.ts              # Expo push token registration
│       └── handler.ts                    # Notification tap routing
│
├── hooks/
│   ├── queries/
│   │   ├── use-profile.ts                # useProfile query + mutation
│   │   ├── use-my-shifts.ts              # useMyShifts (week range)
│   │   ├── use-day-schedule.ts           # useDaySchedule (all staff)
│   │   ├── use-clock-records.ts          # useClockRecords (date range)
│   │   ├── use-my-tasks.ts              # useMyTasks + useUpdateTaskItem
│   │   ├── use-availability.ts          # useAvailability + useSetAvailability
│   │   ├── use-swap-requests.ts         # useSwapRequests + mutations
│   │   ├── use-leave.ts                 # useLeaveRequests + useLeaveEntitlements
│   │   ├── use-notifications.ts         # useNotifications + useMarkRead
│   │   ├── use-training.ts              # useTrainingMaterials + useCourse
│   │   └── use-documents.ts             # useDocuments
│   │
│   ├── use-auth.ts                       # Auth state + session management
│   ├── use-ai-chat.ts                    # SSE streaming chat hook
│   ├── use-online-status.ts              # NetInfo online/offline
│   ├── use-app-state.ts                  # App foreground/background
│   └── use-haptics.ts                    # Haptic feedback hook
│
├── stores/
│   ├── auth-store.ts                     # Session, profile, employee_id
│   ├── ui-store.ts                       # Theme, locale, tab state
│   ├── chat-store.ts                     # Messages, conversations, streaming
│   └── notification-store.ts             # Unread count, push permission
│
├── providers/
│   ├── query-provider.tsx                # TanStack QueryClientProvider + persister
│   ├── auth-provider.tsx                 # Session listener + auto-refresh
│   ├── theme-provider.tsx                # NativeWind + system theme
│   ├── locale-provider.tsx               # i18n context provider
│   ├── notification-provider.tsx         # Push notification lifecycle
│   ├── offline-provider.tsx              # NetInfo + offline banner
│   └── toast-provider.tsx                # Toast context
│
├── i18n/
│   ├── index.ts                          # i18n-js setup + locale detection
│   ├── types.ts                          # Translation key types
│   └── messages/
│       ├── nl/
│       │   ├── common.json
│       │   ├── home.json
│       │   ├── schedule.json
│       │   ├── hours.json
│       │   ├── chat.json
│       │   ├── tasks.json
│       │   ├── leave.json
│       │   ├── training.json
│       │   ├── notifications.json
│       │   ├── profile.json
│       │   └── settings.json
│       ├── en/
│       │   ├── common.json
│       │   ├── home.json
│       │   ├── schedule.json
│       │   ├── hours.json
│       │   ├── chat.json
│       │   ├── tasks.json
│       │   ├── leave.json
│       │   ├── training.json
│       │   ├── notifications.json
│       │   ├── profile.json
│       │   └── settings.json
│       ├── es/
│       │   └── (same 11 files)
│       └── de/
│           └── (same 11 files)
│
├── constants/
│   ├── config.ts                         # API_URL, SUPABASE_URL, timeouts
│   ├── colors.ts                         # Brand colors + shift type colors
│   ├── layout.ts                         # Spacing, radius, font sizes
│   ├── roles.ts                          # Role labels + colors
│   ├── query-keys.ts                     # TanStack Query key factory
│   └── shift-types.ts                    # Shift type labels + icons
│
├── types/
│   ├── index.ts                          # Re-export from web app types
│   ├── navigation.ts                     # Expo Router param types
│   └── api.ts                            # API response envelope types
│
├── assets/
│   ├── images/
│   │   ├── logo.png                      # GrandCafe Cheers logo
│   │   ├── logo-dark.png                 # Dark mode logo
│   │   ├── splash.png                    # Splash screen
│   │   └── adaptive-icon.png             # Android adaptive icon
│   ├── fonts/
│   │   └── (custom fonts if any)
│   └── icons/
│       └── tab-icons/
│           ├── home.svg
│           ├── calendar.svg
│           ├── clock.svg
│           ├── chat.svg
│           └── more.svg
│
└── __tests__/
    ├── unit/
    │   ├── lib/
    │   │   ├── date.test.ts
    │   │   ├── format.test.ts
    │   │   └── shift-colors.test.ts
    │   ├── stores/
    │   │   ├── auth-store.test.ts
    │   │   └── ui-store.test.ts
    │   └── hooks/
    │       └── use-auth.test.ts
    ├── integration/
    │   ├── api/
    │   │   ├── auth.test.ts
    │   │   ├── schedule.test.ts
    │   │   └── clock.test.ts
    │   └── queries/
    │       └── use-my-shifts.test.ts
    └── e2e/
        ├── login.test.ts
        ├── schedule.test.ts
        └── chat.test.ts
```

---

## 2. ROUTE ARCHITECTURE (Expo Router)

### Root Layout: `app/_layout.tsx`

| Property | Value |
|----------|-------|
| Purpose | Provider stack, auth gate, splash screen |
| Layout type | Slot (switches between auth/tabs groups) |
| Auth requirement | No (handles routing TO auth vs tabs) |
| Data dependencies | `auth-store` session check, `useOnlineStatus` |

### Auth Group: `app/(auth)/`

| Route | Purpose | Layout | Auth | Data |
|-------|---------|--------|------|------|
| `_layout.tsx` | Stack navigator for auth screens | Stack | No | None |
| `login.tsx` | Email + password sign-in form | Stack screen | No | `signIn` mutation |
| `forgot-password.tsx` | Request password reset email | Stack screen | No | `resetPassword` mutation |

### Tabs Group: `app/(tabs)/`

| Route | Purpose | Layout | Auth | Data |
|-------|---------|--------|------|------|
| `_layout.tsx` | Bottom tab bar with 5 tabs | Tabs | Yes | `useNotifications` (badge count) |
| `index.tsx` (Home) | Dashboard: today's shift, hours, tasks, upcoming shifts | Tab screen | Yes | `useMyShifts(today)`, `useClockRecords(currentWeek)`, `useMyTasks(pending)`, `useNotifications(unread)` |

#### Schedule Stack: `app/(tabs)/schedule/`

| Route | Purpose | Layout | Auth | Data |
|-------|---------|--------|------|------|
| `_layout.tsx` | Stack within schedule tab | Stack | Yes | None |
| `index.tsx` | Week view showing my shifts Mon-Sun, swipeable | Stack screen | Yes | `useMyShifts(weekRange)` |
| `[date].tsx` | All colleagues working on selected date | Stack screen (push) | Yes | `useDaySchedule(date)` |

#### Hours Stack: `app/(tabs)/hours/`

| Route | Purpose | Layout | Auth | Data |
|-------|---------|--------|------|------|
| `_layout.tsx` | Stack within hours tab | Stack | Yes | None |
| `index.tsx` | Clock records list with period totals (READ-ONLY) | Stack screen | Yes | `useClockRecords(dateRange)` |
| `[recordId].tsx` | Single record detail: in/out times, breaks, net hours | Stack screen (push) | Yes | Single record from cache |

#### Chat Stack: `app/(tabs)/chat/`

| Route | Purpose | Layout | Auth | Data |
|-------|---------|--------|------|------|
| `_layout.tsx` | Stack within chat tab | Stack | Yes | None |
| `index.tsx` | AI assistant chat interface (SSE streaming) | Stack screen | Yes | `useAIChat` (custom SSE hook), `chat-store` |

#### More Stack: `app/(tabs)/more/`

| Route | Purpose | Layout | Auth | Data |
|-------|---------|--------|------|------|
| `_layout.tsx` | Stack within more tab | Stack | Yes | None |
| `index.tsx` | Grid/list of features: profile, tasks, leave, docs, training, settings | Stack screen | Yes | None |
| `profile.tsx` | View/edit name, phone, emergency contact, avatar, language | Stack screen (push) | Yes | `useProfile` query + `updateProfile` mutation |
| `notifications.tsx` | All notifications, mark as read | Stack screen (push) | Yes | `useNotifications` |
| `tasks/index.tsx` | My assigned tasks with filters | Stack screen (push) | Yes | `useMyTasks` |
| `tasks/[taskId].tsx` | Task detail with checklist toggle | Stack screen (push) | Yes | `useMyTasks` (single), `useUpdateTaskItem` mutation |
| `availability.tsx` | Calendar to mark available/unavailable dates | Stack screen (push) | Yes | `useAvailability` + `useSetAvailability` mutation |
| `swap-requests.tsx` | List swap requests (incoming + outgoing) | Stack screen (push) | Yes | `useSwapRequests` + `respondSwap` mutation |
| `leave/index.tsx` | Leave balance + request history | Stack screen (push) | Yes | `useLeaveEntitlements`, `useLeaveRequests` |
| `leave/request.tsx` | New leave request form | Stack screen (push) | Yes | `createLeaveRequest` mutation |
| `documents.tsx` | Payslips, contracts list | Stack screen (push) | Yes | `useDocuments` |
| `training/index.tsx` | Training courses list with progress | Stack screen (push) | Yes | `useTrainingMaterials` |
| `training/[guideCode].tsx` | Course content viewer + test | Stack screen (push) | Yes | `useCourse(guideCode)` |
| `settings.tsx` | Language, theme, notification prefs | Stack screen (push) | Yes | `ui-store`, `useProfile` mutation |

---

## 3. DATA ARCHITECTURE

### 3a. TanStack Query Layer

#### Query Key Factory (`constants/query-keys.ts`)

```ts
export const queryKeys = {
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
  },
  shifts: {
    all: ['shifts'] as const,
    mine: (weekStart: string) => [...queryKeys.shifts.all, 'mine', weekStart] as const,
    day: (date: string) => [...queryKeys.shifts.all, 'day', date] as const,
  },
  clock: {
    all: ['clock'] as const,
    records: (startDate: string, endDate: string) =>
      [...queryKeys.clock.all, 'records', startDate, endDate] as const,
    record: (id: string) => [...queryKeys.clock.all, 'record', id] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    mine: (status?: string) => [...queryKeys.tasks.all, 'mine', status] as const,
    detail: (id: string) => [...queryKeys.tasks.all, 'detail', id] as const,
  },
  availability: {
    all: ['availability'] as const,
    mine: (startDate: string, endDate: string) =>
      [...queryKeys.availability.all, 'mine', startDate, endDate] as const,
  },
  swapRequests: {
    all: ['swapRequests'] as const,
    list: (status?: string) => [...queryKeys.swapRequests.all, 'list', status] as const,
  },
  leave: {
    all: ['leave'] as const,
    requests: (year?: string) => [...queryKeys.leave.all, 'requests', year] as const,
    entitlements: (year: string) => [...queryKeys.leave.all, 'entitlements', year] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (unreadOnly?: boolean) =>
      [...queryKeys.notifications.all, 'list', unreadOnly] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
  },
  training: {
    all: ['training'] as const,
    materials: () => [...queryKeys.training.all, 'materials'] as const,
    course: (guideCode: string) => [...queryKeys.training.all, 'course', guideCode] as const,
    records: () => [...queryKeys.training.all, 'records'] as const,
  },
  documents: {
    all: ['documents'] as const,
    list: () => [...queryKeys.documents.all, 'list'] as const,
  },
} as const
```

#### Query Hooks

**`hooks/queries/use-profile.ts`**

```ts
export function useProfile() {
  const { employeeId } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: () => profileApi.getMyProfile(),
    staleTime: 5 * 60 * 1000,      // 5 min — profile rarely changes
    gcTime: 30 * 60 * 1000,         // 30 min
    enabled: !!employeeId,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => profileApi.updateProfile(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(queryKeys.profile.me(), updatedProfile) // optimistic
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all })
    },
  })
}
```

**`hooks/queries/use-my-shifts.ts`**

```ts
export function useMyShifts(weekStart: string) {
  const { employeeId } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.shifts.mine(weekStart),
    queryFn: () => scheduleApi.getMyShifts(weekStart),
    staleTime: 2 * 60 * 1000,       // 2 min — schedule can change
    gcTime: 24 * 60 * 60 * 1000,    // 24h (cached for offline)
    enabled: !!employeeId,
  })
}
```

**`hooks/queries/use-day-schedule.ts`**

```ts
export function useDaySchedule(date: string) {
  return useQuery({
    queryKey: queryKeys.shifts.day(date),
    queryFn: () => scheduleApi.getDaySchedule(date),
    staleTime: 2 * 60 * 1000,
    gcTime: 60 * 60 * 1000,         // 1h
    enabled: !!date,
  })
}
```

**`hooks/queries/use-clock-records.ts`**

```ts
export function useClockRecords(startDate: string, endDate: string) {
  const { employeeId } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.clock.records(startDate, endDate),
    queryFn: () => clockApi.getClockRecords(startDate, endDate),
    staleTime: 60 * 1000,            // 1 min
    gcTime: 24 * 60 * 60 * 1000,     // 24h (offline-friendly)
    enabled: !!employeeId,
  })
}
```

**`hooks/queries/use-my-tasks.ts`**

```ts
export function useMyTasks(status?: string) {
  return useQuery({
    queryKey: queryKeys.tasks.mine(status),
    queryFn: () => tasksApi.getMyTasks(status),
    staleTime: 30 * 1000,            // 30s — tasks change during shift
    gcTime: 60 * 60 * 1000,
  })
}

export function useUpdateTaskItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, itemId, completed }: {
      taskId: string; itemId: string; completed: boolean
    }) => tasksApi.toggleTaskItem(taskId, itemId, completed),
    onMutate: async ({ taskId, itemId, completed }) => {
      // Optimistic update: toggle item in cache
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })
      const previous = queryClient.getQueryData(queryKeys.tasks.mine())

      queryClient.setQueryData(queryKeys.tasks.mine(), (old: any) => {
        if (!old) return old
        return old.map((task: any) =>
          task.id === taskId
            ? {
                ...task,
                items: task.items.map((item: any) =>
                  item.id === itemId ? { ...item, completed } : item
                ),
              }
            : task
        )
      })

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks.mine(), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}
```

**`hooks/queries/use-availability.ts`**

```ts
export function useAvailability(startDate: string, endDate: string) {
  const { employeeId } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.availability.mine(startDate, endDate),
    queryFn: () => availabilityApi.getAvailability(employeeId!, startDate, endDate),
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: !!employeeId,
  })
}

export function useSetAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { date: string; available: boolean; reason?: string }) =>
      availabilityApi.setAvailability(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.all })
    },
  })
}
```

**`hooks/queries/use-swap-requests.ts`**

```ts
export function useSwapRequests(status?: string) {
  return useQuery({
    queryKey: queryKeys.swapRequests.list(status),
    queryFn: () => swapRequestsApi.getSwapRequests(status),
    staleTime: 30 * 1000,
    gcTime: 60 * 60 * 1000,
  })
}

export function useCreateSwapRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { shift_id: string; offered_to: string; reason?: string }) =>
      swapRequestsApi.createSwapRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swapRequests.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all })
    },
  })
}

export function useRespondSwapRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'rejected' }) =>
      swapRequestsApi.respondToSwap(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swapRequests.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all })
    },
  })
}
```

**`hooks/queries/use-leave.ts`**

```ts
export function useLeaveRequests(year?: string) {
  const { employeeId } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.leave.requests(year),
    queryFn: () => leaveApi.getLeaveRequests(employeeId!, year),
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: !!employeeId,
  })
}

export function useLeaveEntitlements(year: string) {
  const { employeeId } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.leave.entitlements(year),
    queryFn: () => leaveApi.getEntitlements(employeeId!, year),
    staleTime: 30 * 60 * 1000,      // 30 min — rarely changes
    gcTime: 24 * 60 * 60 * 1000,
    enabled: !!employeeId,
  })
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateLeaveRequestInput) => leaveApi.createRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leave.all })
    },
  })
}
```

**`hooks/queries/use-notifications.ts`**

```ts
export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: queryKeys.notifications.list(unreadOnly),
    queryFn: () => notificationsApi.getNotifications(unreadOnly),
    staleTime: 15 * 1000,            // 15s — real-time is better, this is fallback
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,      // Poll every 30s as fallback
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,      // Fast poll for badge
  })
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) => notificationsApi.markRead(ids),
    onMutate: async (ids) => {
      // Optimistic: decrement unread count
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all })
      const prev = queryClient.getQueryData<number>(queryKeys.notifications.unreadCount())
      if (prev !== undefined) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount(),
          Math.max(0, prev - ids.length)
        )
      }
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}
```

**`hooks/queries/use-training.ts`**

```ts
export function useTrainingMaterials() {
  return useQuery({
    queryKey: queryKeys.training.materials(),
    queryFn: () => trainingApi.getMaterials(),
    staleTime: 30 * 60 * 1000,       // 30 min
    gcTime: 24 * 60 * 60 * 1000,
  })
}

export function useCourse(guideCode: string) {
  return useQuery({
    queryKey: queryKeys.training.course(guideCode),
    queryFn: () => trainingApi.getCourse(guideCode),
    staleTime: 60 * 60 * 1000,       // 1h — course content is static
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    enabled: !!guideCode,
  })
}

export function useSubmitTest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ guideCode, answers }: {
      guideCode: string; answers: Record<string, number>
    }) => trainingApi.submitTest(guideCode, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.training.all })
    },
  })
}
```

**`hooks/queries/use-documents.ts`**

```ts
export function useDocuments() {
  return useQuery({
    queryKey: queryKeys.documents.list(),
    queryFn: () => documentsApi.getDocuments(),
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
}
```

#### Persister Config (in `providers/query-provider.tsx`)

```ts
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { MMKV } from 'react-native-mmkv'

const storage = new MMKV({ id: 'tanstack-query-cache' })

const mmkvStorage = {
  setItem: (key: string, value: string) => storage.set(key, value),
  getItem: (key: string) => storage.getString(key) ?? null,
  removeItem: (key: string) => storage.delete(key),
}

const persister = createSyncStoragePersister({
  storage: mmkvStorage,
  // Only persist queries with gcTime > 1 hour
  // This means shifts, clock records, training, documents are persisted
  // Notifications, tasks (fast-changing) are NOT persisted
})

// In QueryClientProvider:
// <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}>
```

### 3b. Supabase Direct vs Next.js API

**Decision Matrix:**

| Operation | Method | Why |
|-----------|--------|-----|
| **READ my shifts** | Supabase Direct | RLS `shifts` table: employees can read own shifts via `employee_id` match. Fast, no round-trip to Next.js. |
| **READ day schedule (all staff)** | Next.js API `GET /api/staff/shifts?date=X` | Needs to read shifts for ALL employees on a date. RLS may restrict; safer through server API which has admin context for schedule reads. |
| **READ my clock records** | Supabase Direct | RLS allows own records. `clock_in_out` filtered by `employee_id`. |
| **READ my tasks** | Supabase Direct | RLS on `staff_tasks` allows reading tasks assigned to self or own role. |
| **UPDATE task item** | Next.js API `PATCH /api/staff/tasks/{id}/items/{itemId}` | Write operation. Server validates permission, updates checklist item. |
| **READ my availability** | Supabase Direct | RLS allows own records. |
| **SET availability** | Next.js API `POST /api/staff/availability` | Write. Server validates employee_id ownership. |
| **READ swap requests** | Supabase Direct | RLS filters to involved parties. |
| **CREATE swap request** | Next.js API `POST /api/staff/swap-requests` | Write. Server verifies shift ownership, prevents self-swap. |
| **RESPOND to swap** | Next.js API `PATCH /api/staff/swap-requests?id=X` | Write. Server handles shift reassignment on accept. |
| **READ leave requests** | Supabase Direct | RLS allows own records. |
| **CREATE leave request** | Next.js API `POST /api/staff/leave` | Write. Server validates entitlement balance. |
| **READ notifications** | Supabase Direct | RLS: `user_id = auth.uid()`. |
| **MARK notifications read** | Next.js API `PATCH /api/notifications` | Write. Server validates ownership. |
| **READ profile** | Supabase Direct | RLS: own profile. |
| **UPDATE profile** | Next.js API `PATCH /api/profile` | Write. Server validates, handles avatar upload. |
| **AI chat** | Next.js API `POST /api/ai/chat/stream` | Complex server-side streaming. Must go through Next.js. |
| **REGISTER push token** | Next.js API `POST /api/notifications/subscribe` | Write. Server stores push subscription. |
| **READ training materials** | Supabase Direct | RLS allows authenticated reads. |
| **SUBMIT test** | Next.js API `POST /api/staff/training/tests/{guideCode}/submit` | Write. Server grades test, creates record. |

**Supabase Direct Pattern:**

```ts
// lib/api/schedule.ts
export async function getMyShifts(weekStart: string): Promise<ShiftWithEmployee[]> {
  const weekEnd = addDays(parseISO(weekStart), 6).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(id, full_name, role)
      )
    `)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw new ApiError(error.message, error.code)
  return data ?? []
}
```

**Next.js API Pattern:**

```ts
// lib/api/client.ts
import { getSession } from './auth'

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'https://app.cheersmallorca.com'

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await getSession()

  if (!session?.access_token) {
    throw new ApiError('Not authenticated', 'AUTH_REQUIRED')
  }

  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(
      body.error || `HTTP ${response.status}`,
      String(response.status)
    )
  }

  return response.json()
}
```

**Next.js API Call Example:**

```ts
// lib/api/tasks.ts
export async function toggleTaskItem(
  taskId: string,
  itemId: string,
  completed: boolean
): Promise<StaffTaskItem> {
  return apiFetch<StaffTaskItem>(
    `/staff/tasks/${taskId}/items/${itemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    }
  )
}
```

### 3c. Real-time Subscriptions

```ts
// lib/supabase/realtime.ts

type SubscriptionConfig = {
  channel: string
  table: string
  filter?: string
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  onData: (payload: any) => void
}

export function createSubscription(
  config: SubscriptionConfig
): RealtimeChannel {
  return supabase
    .channel(config.channel)
    .on(
      'postgres_changes',
      {
        event: config.event,
        schema: 'public',
        table: config.table,
        filter: config.filter,
      },
      config.onData
    )
    .subscribe()
}
```

**Subscriptions to establish (in `providers/auth-provider.tsx` after login):**

| Channel Name | Table | Filter | Event | Invalidates |
|-------------|-------|--------|-------|-------------|
| `shifts:${employeeId}` | `shifts` | `employee_id=eq.${employeeId}` | `*` | `queryKeys.shifts.all` |
| `notifications:${userId}` | `notifications` | `user_id=eq.${userId}` | `INSERT` | `queryKeys.notifications.all` |
| `tasks:${employeeId}` | `staff_tasks` | `assigned_to=eq.${employeeId}` | `*` | `queryKeys.tasks.all` |
| `swap:${employeeId}` | `shift_swap_requests` | `offered_to=eq.${employeeId}` | `INSERT,UPDATE` | `queryKeys.swapRequests.all` |
| `leave:${employeeId}` | `leave_requests` | `employee_id=eq.${employeeId}` | `UPDATE` | `queryKeys.leave.all` |

**Subscription Lifecycle:**

```ts
// providers/auth-provider.tsx (simplified)
useEffect(() => {
  if (!session || !employeeId) return

  const channels = [
    createSubscription({
      channel: `shifts:${employeeId}`,
      table: 'shifts',
      filter: `employee_id=eq.${employeeId}`,
      event: '*',
      onData: () => queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all }),
    }),
    createSubscription({
      channel: `notifications:${session.user.id}`,
      table: 'notifications',
      filter: `user_id=eq.${session.user.id}`,
      event: 'INSERT',
      onData: (payload) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
        // Also show local notification if app is foregrounded
        showToast(payload.new.title)
      },
    }),
    // ... tasks, swap, leave channels
  ]

  return () => {
    channels.forEach((ch) => supabase.removeChannel(ch))
  }
}, [session, employeeId])
```

### 3d. Offline Strategy

**Persisted queries (via MMKV persister):**

| Query Key | Max Age | Rationale |
|-----------|---------|-----------|
| `shifts.mine(*)` | 24h | Employee must see their schedule offline |
| `clock.records(*)` | 24h | Hours worked must be viewable offline |
| `profile.me` | 24h | Name, role needed for UI |
| `training.course(*)` | 7 days | Course content is static |
| `training.materials` | 24h | Course list is stable |
| `leave.entitlements(*)` | 24h | Leave balance rarely changes |

**NOT persisted (fast-changing, need fresh data):**

| Query Key | Reason |
|-----------|--------|
| `notifications.*` | Must be current |
| `tasks.mine(*)` | Tasks change during shifts |
| `swapRequests.*` | Time-sensitive |
| `shifts.day(*)` | Other people's data changes |

**Queued offline mutations:**

Mutations that CAN be queued:
- `setAvailability` — idempotent upsert
- `toggleTaskItem` — idempotent boolean toggle
- `markNotificationsRead` — idempotent

Mutations that CANNOT be queued (require immediate server response):
- `createSwapRequest` — needs server validation
- `createLeaveRequest` — needs entitlement check
- `sendChatMessage` — SSE streaming
- `submitTest` — needs grading

**Implementation:**

```ts
// providers/query-provider.tsx
import { onlineManager } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'

// Sync onlineManager with NetInfo
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected)
  })
})
```

**Stale data indicator:**

```tsx
// components/shared/offline-banner.tsx
export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <View className="bg-amber-500 px-4 py-2">
      <Text className="text-center text-white text-sm font-medium">
        {t('common.offlineMode')}
      </Text>
    </View>
  )
}

// In individual screens, show data freshness:
const { data, dataUpdatedAt } = useMyShifts(weekStart)
const isStale = Date.now() - dataUpdatedAt > 5 * 60 * 1000
// Show subtle indicator if stale
```

---

## 4. STATE MANAGEMENT MAP

| State | Location | Why | Persistence | Invalidation |
|-------|----------|-----|-------------|--------------|
| Auth session (access_token, refresh_token) | `auth-store` (Zustand) | Global, needed before any query | SecureStore (encrypted) | On sign-out, token expiry |
| User profile (name, role, language) | `auth-store` (Zustand) + TanStack `profile.me` | Zustand for sync access (headers), TQ for fresh data | MMKV (TQ cache) + SecureStore (Zustand) | On profile update mutation |
| Employee ID | `auth-store` (Zustand) | Needed to scope all queries | SecureStore | On sign-out |
| Current week (schedule) | `useState` in schedule screen | Local UI state, no need to persist | Memory | On swipe |
| Date range (hours) | `useState` in hours screen | Local UI state | Memory | On picker change |
| Theme (light/dark/system) | `ui-store` (Zustand) | Sync, pre-render needed | MMKV | On user toggle |
| Locale (nl/en/es/de) | `ui-store` (Zustand) | Sync, pre-render needed | MMKV | On user selection, syncs to profile API |
| Unread notification count | TanStack `notifications.unreadCount` | Async, polled, realtime-updated | Memory only | On realtime INSERT, markRead mutation, poll |
| Chat messages | `chat-store` (Zustand) | Complex SSE state, streaming text | Memory only (conversations stored server-side) | On new conversation, load conversation |
| Streaming text buffer | `chat-store` (Zustand) | Must be synchronous for smooth rendering | Memory | On stream end |
| Active tools (AI chat) | `chat-store` (Zustand) | UI indicator during streaming | Memory | On stream end |
| Push notification permission | `notification-store` (Zustand) | Sync access for UI | MMKV | On permission change |
| Expo push token | `notification-store` (Zustand) | Needed for registration | SecureStore | On token refresh |
| Online/offline status | `use-online-status` hook (NetInfo) | Real-time, no persistence needed | Memory | NetInfo events |
| Task filter state | `useState` in tasks screen | Local UI state | Memory | On filter change |
| Bottom sheet open state | `useState` / `useRef` | Local UI state | Memory | On user interaction |

---

## 5. PROVIDER STACK

```tsx
// app/_layout.tsx
export default function RootLayout() {
  return (
    // 1. GestureHandlerRootView — MUST wrap everything for bottom sheets, swipe
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* 2. SafeAreaProvider — provides safe area insets to all children */}
      <SafeAreaProvider>
        {/* 3. ThemeProvider — NativeWind theme, must be above all styled components */}
        <ThemeProvider>
          {/* 4. LocaleProvider — i18n, must be above any component using t() */}
          <LocaleProvider>
            {/* 5. QueryProvider — TanStack Query + MMKV persister, must be above any useQuery */}
            <QueryProvider>
              {/* 6. AuthProvider — session listener, realtime subs, must be above auth-gated screens */}
              <AuthProvider>
                {/* 7. NotificationProvider — push registration, must be after auth (needs userId) */}
                <NotificationProvider>
                  {/* 8. OfflineProvider — NetInfo banner, must be above Slot to overlay */}
                  <OfflineProvider>
                    {/* 9. ToastProvider — toast overlay, must be near top of tree */}
                    <ToastProvider>
                      {/* 10. StatusBar config */}
                      <StatusBar style="auto" />
                      {/* Expo Router renders here */}
                      <Slot />
                    </ToastProvider>
                  </OfflineProvider>
                </NotificationProvider>
              </AuthProvider>
            </QueryProvider>
          </LocaleProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
```

**Why this order:**

1. **GestureHandlerRootView** — React Native Gesture Handler requires this at the root for `@gorhom/bottom-sheet` and swipe gestures to work.
2. **SafeAreaProvider** — `react-native-safe-area-context` provides inset values. Must wrap everything that renders content.
3. **ThemeProvider** — NativeWind/Tailwind theme (dark mode). Must be above any `className`-styled component.
4. **LocaleProvider** — Sets up i18n-js with the stored locale. Must be above any `t()` call.
5. **QueryProvider** — Creates `QueryClient`, wraps with `PersistQueryClientProvider` for MMKV. Must be above all `useQuery`/`useMutation` hooks.
6. **AuthProvider** — Listens to Supabase `onAuthStateChange`, stores session in Zustand, establishes realtime subscriptions. Must be above auth-gated routes but below QueryProvider (uses `useQueryClient` to set up invalidation).
7. **NotificationProvider** — Registers Expo push token after auth, handles notification taps. Needs userId from AuthProvider.
8. **OfflineProvider** — Renders the offline banner. Must be above `Slot` to overlay content.
9. **ToastProvider** — Toast overlay rendered on top of everything.

---

## 6. API LAYER DESIGN

### `lib/api/client.ts` — Base Client

```ts
import Constants from 'expo-constants'
import { useAuthStore } from '@/stores/auth-store'

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'https://app.cheersmallorca.com'

export class ApiError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { session } = useAuthStore.getState()

  if (!session?.access_token) {
    throw new ApiError('Not authenticated', 'AUTH_REQUIRED', 401)
  }

  const url = `${API_URL}/api${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'Accept': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 401) {
    // Session expired — trigger refresh
    const refreshed = await refreshSessionIfNeeded()
    if (refreshed) {
      // Retry once with new token
      return apiFetch<T>(path, options)
    }
    throw new ApiError('Session expired', 'SESSION_EXPIRED', 401)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new ApiError(
      body.error || `HTTP ${response.status}`,
      String(response.status),
      response.status
    )
  }

  return response.json() as Promise<T>
}

async function refreshSessionIfNeeded(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data.session) return false
    useAuthStore.getState().setSession(data.session)
    return true
  } catch {
    return false
  }
}
```

### `lib/api/auth.ts`

```ts
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

// Uses Supabase directly — NOT through Next.js API
// Mobile app authenticates directly with Supabase Auth,
// then uses the JWT to call Next.js API routes

export async function signIn(email: string, password: string): Promise<{
  userId: string; profile: Profile; employeeId: string
}> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new ApiError(error.message, 'AUTH_ERROR')

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url, language, phone, emergency_contact, emergency_phone, active')
    .eq('id', data.user.id)
    .single()
  if (profileError) throw new ApiError('Failed to fetch profile', 'PROFILE_ERROR')

  // Fetch employee ID
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', data.user.id)
    .single()
  if (empError) throw new ApiError('Employee record not found', 'EMPLOYEE_ERROR')

  return {
    userId: data.user.id,
    profile,
    employeeId: employee.id,
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw new ApiError(error.message, 'RESET_ERROR')
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}
```

### `lib/api/profile.ts`

```ts
import { supabase } from '@/lib/supabase/client'
import { apiFetch } from './client'

// READ: Supabase Direct (own profile via RLS)
export async function getMyProfile(): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new ApiError('Not authenticated', 'AUTH')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url, language, phone, emergency_contact, emergency_phone, active, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (error) throw new ApiError(error.message, error.code)
  return data
}

// WRITE: Next.js API (server handles avatar upload, validation)
export async function updateProfile(data: UpdateProfileRequest): Promise<Profile> {
  return apiFetch<Profile>('/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// WRITE: Next.js API (multipart form data for file upload)
export async function uploadAvatar(uri: string): Promise<{ avatar_url: string }> {
  const { session } = useAuthStore.getState()
  const formData = new FormData()
  formData.append('avatar', {
    uri,
    type: 'image/jpeg',
    name: 'avatar.jpg',
  } as any)

  const response = await fetch(`${API_URL}/api/profile/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.error || 'Upload failed', 'UPLOAD_ERROR')
  }

  return response.json()
}
```

### `lib/api/schedule.ts`

```ts
import { supabase } from '@/lib/supabase/client'
import { apiFetch } from './client'
import { useAuthStore } from '@/stores/auth-store'
import { addDays, parseISO, format } from 'date-fns'

// READ: Supabase Direct (RLS: own shifts)
export async function getMyShifts(weekStart: string): Promise<ShiftWithEmployee[]> {
  const { employeeId } = useAuthStore.getState()
  const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(id, full_name, role)
      )
    `)
    .eq('employee_id', employeeId)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .order('date')
    .order('start_time')

  if (error) throw new ApiError(error.message, error.code)
  return data ?? []
}

// READ: Next.js API (needs all employees' shifts — beyond RLS scope for non-managers)
export async function getDaySchedule(date: string): Promise<ShiftWithEmployee[]> {
  return apiFetch<ShiftWithEmployee[]>(`/staff/shifts?date=${date}`)
}
```

### `lib/api/clock.ts`

```ts
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

// READ ONLY — no clock-in/out from mobile app
// All reads via Supabase Direct (RLS: own records)

export async function getClockRecords(
  startDate: string,
  endDate: string
): Promise<ClockInOutWithDetails[]> {
  const { employeeId } = useAuthStore.getState()

  const { data, error } = await supabase
    .from('clock_in_out')
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(id, full_name, role)
      ),
      shift:shifts(
        id, date, shift_type, start_time, end_time
      ),
      breaks:clock_breaks(*)
    `)
    .eq('employee_id', employeeId)
    .gte('clock_in_time', `${startDate}T00:00:00`)
    .lte('clock_in_time', `${endDate}T23:59:59`)
    .not('clock_out_time', 'is', null)
    .order('clock_in_time', { ascending: false })

  if (error) throw new ApiError(error.message, error.code)
  return data ?? []
}
```

### `lib/api/tasks.ts`

```ts
import { supabase } from '@/lib/supabase/client'
import { apiFetch } from './client'
import { useAuthStore } from '@/stores/auth-store'

// READ: Supabase Direct (RLS handles filtering to assigned tasks)
export async function getMyTasks(status?: string): Promise<StaffTaskWithDetails[]> {
  const { employeeId } = useAuthStore.getState()

  let query = supabase
    .from('staff_tasks')
    .select(`
      *,
      items:staff_task_items(*),
      assigned_employee:employees!staff_tasks_assigned_to_fkey(
        id,
        profile:profiles(id, full_name, role)
      ),
      assigner:profiles!staff_tasks_assigned_by_fkey(id, full_name)
    `)
    .or(`assigned_to.eq.${employeeId}`)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw new ApiError(error.message, error.code)
  return data ?? []
}

// WRITE: Next.js API
export async function toggleTaskItem(
  taskId: string,
  itemId: string,
  completed: boolean
): Promise<StaffTaskItem> {
  return apiFetch<StaffTaskItem>(
    `/staff/tasks/${taskId}/items/${itemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    }
  )
}

export async function completeTask(taskId: string): Promise<StaffTask> {
  return apiFetch<StaffTask>(
    `/staff/tasks/${taskId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    }
  )
}
```

### `lib/api/availability.ts`

```ts
import { supabase } from '@/lib/supabase/client'
import { apiFetch } from './client'

// READ: Supabase Direct
export async function getAvailability(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<Availability[]> {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  if (error) throw new ApiError(error.message, error.code)
  return data ?? []
}

// WRITE: Next.js API
export async function setAvailability(data: {
  date: string; available: boolean; reason?: string
}): Promise<Availability> {
  const { employeeId } = useAuthStore.getState()
  return apiFetch<Availability>('/staff/availability', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId, ...data }),
  })
}
```

### `lib/api/swap-requests.ts`

```ts
import { supabase } from '@/lib/supabase/client'
import { apiFetch } from './client'

// READ: Supabase Direct (RLS: involved parties)
export async function getSwapRequests(status?: string): Promise<any[]> {
  let query = supabase
    .from('shift_swap_requests')
    .select(`
      *,
      shift:shifts(id, date, shift_type, start_time, end_time),
      requester:requested_by(
        id, profile:profiles(id, full_name, role)
      ),
      offered_employee:offered_to(
        id, profile:profiles(id, full_name, role)
      )
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new ApiError(error.message, error.code)
  return data ?? []
}

// WRITE: Next.js API
export async function createSwapRequest(data: {
  shift_id: string; offered_to: string; reason?: string
}) {
  return apiFetch('/staff/swap-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function respondToSwap(id: string, status: 'accepted' | 'rejected') {
  return apiFetch(`/staff/swap-requests?id=${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
```

### `lib/api/leave.ts`

```ts
import { supabase } from '@/lib/supabase/client'
import { apiFetch } from './client'

// READ: Supabase Direct
export async function getLeaveRequests(employeeId: string, year?: string): Promise<LeaveRequest[]> {
  let query = supabase
    .from('leave_requests')
    .select(`*, employee:employees(id, profile:profiles(id, full_name, role))`)
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false })

  if (year) {
    query = query.gte('start_date', `${year}-01-01`).lte('end_date', `${year}-12-31`)
  }

  const { data, error } = await query
  if (error) throw new ApiError(error.message, error.code)
  return data ?? []
}

export async function getEntitlements(employeeId: string, year: string): Promise<LeaveEntitlement[]> {
  const { data, error } = await supabase
    .from('leave_entitlements')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('year', parseInt(year))

  if (error) throw new ApiError(error.message, error.code)
  return data ?? []
}

// WRITE: Next.js API
export async function createRequest(data: CreateLeaveRequestInput) {
  return apiFetch('/staff/leave', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
```

### `lib/api/notifications.ts`

```ts
import { supabase } from '@/lib/supabase/client'
import { apiFetch } from './client'

// READ: Supabase Direct
export async function getNotifications(unreadOnly = false): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new ApiError('Not authenticated', 'AUTH')

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) query = query.is('read_at', null)

  const { data, error } = await query
  if (error) throw new ApiError(error.message, error.code)
  return data ?? []
}

export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null)

  if (error) return 0
  return count ?? 0
}

// WRITE: Next.js API
export async function markRead(ids: string[]) {
  return apiFetch('/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ notification_ids: ids }),
  })
}

// WRITE: Next.js API
export async function registerPushToken(token: string, deviceName: string) {
  return apiFetch('/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: token,
      keys: { p256dh: '', auth: '' }, // Expo push uses its own token format
      device_name: deviceName,
    }),
  })
}
```

### `lib/api/chat.ts`

```ts
import { useAuthStore } from '@/stores/auth-store'

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'https://app.cheersmallorca.com'

// SSE streaming — cannot use apiFetch, needs raw response handling
export async function streamChatMessage(
  message: string,
  conversationId: string | null,
  onEvent: (event: { type: string; data: any }) => void,
  signal?: AbortSignal
): Promise<void> {
  const { session } = useAuthStore.getState()
  if (!session) throw new ApiError('Not authenticated', 'AUTH')

  const response = await fetch(`${API_URL}/api/ai/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
    }),
    signal,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.error || 'Chat failed', String(response.status))
  }

  const reader = response.body?.getReader()
  if (!reader) throw new ApiError('No response body', 'STREAM_ERROR')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Parse SSE events from buffer
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''

    for (const part of parts) {
      const lines = part.split('\n')
      let eventType = 'message'
      let eventData = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7)
        if (line.startsWith('data: ')) eventData = line.slice(6)
      }

      if (eventData) {
        try {
          onEvent({ type: eventType, data: JSON.parse(eventData) })
        } catch {
          // Non-JSON data, skip
        }
      }
    }
  }
}
```

### `lib/api/training.ts`

```ts
import { supabase } from '@/lib/supabase/client'
import { apiFetch } from './client'

// READ: Supabase Direct
export async function getMaterials(): Promise<TrainingMaterial[]> {
  const { data, error } = await supabase
    .from('training_materials')
    .select('*')
    .eq('is_mandatory', true)
    .order('created_at')

  if (error) throw new ApiError(error.message, error.code)
  return data ?? []
}

// READ: Next.js API (course content is complex, loaded from server)
export async function getCourse(guideCode: string): Promise<GuideContent> {
  return apiFetch<GuideContent>(`/staff/training/guide-content/${guideCode}`)
}

// WRITE: Next.js API
export async function submitTest(
  guideCode: string,
  answers: Record<string, number>
): Promise<{ passed: boolean; score: number }> {
  return apiFetch(`/staff/training/tests/${guideCode}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })
}
```

### `lib/api/documents.ts`

```ts
import { apiFetch } from './client'

// READ: Next.js API (documents may require admin client)
export async function getDocuments(): Promise<any[]> {
  return apiFetch('/staff/documents')
}
```

---

## 7. AUTHENTICATION FLOW

### Step-by-Step:

**1. App Launch → `app/_layout.tsx`**

```
- AuthProvider checks SecureStore for stored session
- If found: restore session → supabase.auth.setSession(stored)
- If valid: navigate to (tabs)
- If expired: attempt refresh → supabase.auth.refreshSession()
  - Success: store new session, navigate to (tabs)
  - Failure: clear store, navigate to (auth)/login
- If not found: navigate to (auth)/login
```

**2. Login Screen → `app/(auth)/login.tsx`**

```
User enters email + password
→ signIn(email, password)
  → supabase.auth.signInWithPassword({ email, password })
  ← Returns session { access_token, refresh_token, user }
  → Fetch profile from profiles table
  → Fetch employee.id from employees table
  → Store in auth-store (Zustand):
    session: { access_token, refresh_token, expires_at }
    userId: user.id
    profile: { full_name, role, language, ... }
    employeeId: employee.id
  → Persist to SecureStore:
    'session': JSON.stringify(session)
    'employeeId': employee.id
  → Set locale from profile.language
  → Navigate to (tabs)
```

**3. Token Storage**

```ts
// stores/auth-store.ts
import * as SecureStore from 'expo-secure-store'

interface AuthState {
  session: Session | null
  userId: string | null
  profile: Profile | null
  employeeId: string | null
  isLoading: boolean
  setSession: (session: Session) => void
  setProfile: (profile: Profile) => void
  clearAuth: () => void
  hydrateFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      userId: null,
      profile: null,
      employeeId: null,
      isLoading: true,

      setSession: (session) => {
        set({ session, userId: session.user.id })
        SecureStore.setItemAsync('session', JSON.stringify(session))
      },

      setProfile: (profile) => set({ profile }),

      clearAuth: () => {
        set({ session: null, userId: null, profile: null, employeeId: null })
        SecureStore.deleteItemAsync('session')
        SecureStore.deleteItemAsync('employeeId')
      },

      hydrateFromStorage: async () => {
        try {
          const stored = await SecureStore.getItemAsync('session')
          const empId = await SecureStore.getItemAsync('employeeId')
          if (stored) {
            const session = JSON.parse(stored)
            set({ session, userId: session.user.id, employeeId: empId, isLoading: false })
          } else {
            set({ isLoading: false })
          }
        } catch {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'auth-store',
      // Custom storage using SecureStore (not MMKV — sensitive data)
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        // Only persist non-sensitive metadata to Zustand persist
        // Session tokens go to SecureStore directly
        employeeId: state.employeeId,
      }),
    }
  )
)
```

**4. Session Refresh Strategy**

```ts
// providers/auth-provider.tsx
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        useAuthStore.getState().setSession(session!)
      }
      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().clearAuth()
        router.replace('/(auth)/login')
      }
    }
  )

  return () => subscription.unsubscribe()
}, [])

// Supabase JS v2 auto-refreshes tokens when they're within 60s of expiry
// The onAuthStateChange listener above catches TOKEN_REFRESHED events
```

**5. Bearer Token Forwarding to Next.js API**

```
Every apiFetch() call reads session.access_token from auth-store
→ Sets Authorization: Bearer <access_token> header
→ Next.js API route calls requireAuth() → supabase.auth.getUser()
→ Supabase verifies the JWT (same project, same JWT secret)
→ User is authenticated server-side
```

**6. Logout + Cleanup**

```
User taps "Sign Out" in settings
→ supabase.auth.signOut()
  → Triggers onAuthStateChange('SIGNED_OUT')
    → auth-store.clearAuth() (clears Zustand + SecureStore)
    → queryClient.clear() (wipes all cached queries)
    → Remove all realtime channels
    → router.replace('/(auth)/login')
```

**7. Deep Link Handling After Auth**

```ts
// lib/utils/linking.ts
export const linking = {
  prefixes: ['cheers://', 'https://app.cheersmallorca.com'],
  config: {
    screens: {
      '(tabs)': {
        screens: {
          schedule: { path: 'schedule/:date?' },
          hours: { path: 'hours' },
          chat: { path: 'chat' },
          more: {
            screens: {
              tasks: { path: 'tasks/:taskId?' },
              notifications: { path: 'notifications' },
            },
          },
        },
      },
    },
  },
}

// If user is not authenticated when deep link arrives:
// AuthProvider stores the target URL, completes login, then navigates to stored URL
```

---

## 8. PUSH NOTIFICATION ARCHITECTURE

### Token Registration Flow

```
1. App launch → AuthProvider confirms session
2. NotificationProvider mounts
3. Check Notifications.getPermissionsAsync()
4. If not determined → Notifications.requestPermissionsAsync()
5. If granted:
   a. Notifications.getExpoPushTokenAsync({ projectId })
   b. Compare with stored token in notification-store
   c. If different or first time:
      → POST /api/notifications/subscribe
        body: { endpoint: expoPushToken, keys: {...}, device_name: Device.modelName }
      → Store token in notification-store (SecureStore)
6. If denied:
   → Store permission status, show "enable notifications" in settings
```

### Edge Function Trigger Pattern

The existing Next.js backend already creates notifications in the `notifications` table. The push delivery happens via:

```
1. Manager action (publish schedule, assign task, etc.)
   → Next.js API creates rows in `notifications` table
   → Next.js API calls POST /api/notifications/send
     → Reads push_subscriptions for target user_ids
     → Sends via web-push (for PWA) or Expo Push API (for mobile)

2. For Expo Push, extend POST /api/notifications/send:
   → Check if subscription.endpoint starts with "ExponentPushToken"
   → If yes: send via Expo Push API instead of web-push
   → expo-server-sdk: Expo.sendPushNotificationsAsync([...])
```

**Required backend change:** Update `/api/notifications/send/route.ts` to detect Expo push tokens and route through Expo's Push API instead of web-push. This is a small change (~20 lines).

### Notification Handler

```ts
// providers/notification-provider.tsx
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export function NotificationProvider({ children }: PropsWithChildren) {
  const responseListener = useRef<Notifications.Subscription>()
  const notificationListener = useRef<Notifications.Subscription>()

  useEffect(() => {
    // Foreground: notification received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Invalidate notifications query to update badge
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })

        // Show in-app toast
        const { title, body } = notification.request.content
        showToast({ title: title ?? '', message: body ?? '' })
      }
    )

    // Tap: user tapped notification (foreground, background, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data
        handleNotificationTap(data)
      }
    )

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current)
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current)
      }
    }
  }, [])

  return <>{children}</>
}

function handleNotificationTap(data: Record<string, unknown>) {
  const url = data?.url as string | undefined

  if (!url) return

  // Map notification URLs to app routes
  if (url.includes('/schedule')) router.push('/(tabs)/schedule')
  else if (url.includes('/tasks')) router.push('/(tabs)/more/tasks')
  else if (url.includes('/swap')) router.push('/(tabs)/more/swap-requests')
  else if (url.includes('/leave')) router.push('/(tabs)/more/leave')
  else router.push('/(tabs)')
}
```

### Permission Request Timing

- **First launch after login:** Request permission immediately (employees expect work notifications)
- **If denied:** Show a card in Settings screen explaining why notifications matter ("Get notified about schedule changes, new tasks, and shift swaps")
- **Never block:** The app must be fully functional without push notifications (polling fallback)

---

## 9. BUILD & DEPLOYMENT

### `eas.json`

```json
{
  "cli": {
    "version": ">= 14.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "http://localhost:3000",
        "EXPO_PUBLIC_SUPABASE_URL": "https://dedxavxwzlchapamgjov.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "..."
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "enterpriseProvisioning": "adhoc"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging.cheersmallorca.com",
        "EXPO_PUBLIC_SUPABASE_URL": "https://dedxavxwzlchapamgjov.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "..."
      },
      "channel": "preview"
    },
    "production": {
      "ios": {
        "autoIncrement": true
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://app.cheersmallorca.com",
        "EXPO_PUBLIC_SUPABASE_URL": "https://dedxavxwzlchapamgjov.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "..."
      },
      "channel": "production"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "...",
        "ascAppId": "...",
        "appleTeamId": "..."
      }
    }
  }
}
```

### `app.json` (key fields)

```json
{
  "expo": {
    "name": "GrandCafe Cheers",
    "slug": "grandcafe-cheers",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/logo.png",
    "scheme": "cheers",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a2e"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.cheersmallorca.employee",
      "config": {
        "usesNonExemptEncryption": false
      },
      "infoPlist": {
        "NSCameraUsageDescription": "Used to update your profile photo",
        "NSPhotoLibraryUsageDescription": "Used to select a profile photo"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#1a1a2e"
      },
      "package": "com.cheersmallorca.employee"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-localization",
      [
        "expo-notifications",
        {
          "icon": "./assets/icons/notification-icon.png",
          "color": "#e8b228"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Used to select a profile photo"
        }
      ]
    ],
    "extra": {
      "eas": { "projectId": "..." },
      "apiUrl": "${EXPO_PUBLIC_API_URL}",
      "supabaseUrl": "${EXPO_PUBLIC_SUPABASE_URL}",
      "supabaseAnonKey": "${EXPO_PUBLIC_SUPABASE_ANON_KEY}"
    },
    "updates": {
      "url": "https://u.expo.dev/...",
      "enabled": true,
      "fallbackToCacheTimeout": 0,
      "checkAutomatically": "ON_LOAD"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

### Environment Variables Strategy

| Variable | Where Set | Access |
|----------|----------|--------|
| `EXPO_PUBLIC_API_URL` | eas.json per build profile | `Constants.expoConfig.extra.apiUrl` |
| `EXPO_PUBLIC_SUPABASE_URL` | eas.json per build profile | `Constants.expoConfig.extra.supabaseUrl` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | eas.json per build profile | `Constants.expoConfig.extra.supabaseAnonKey` |

**No secrets in the app binary.** The anon key is safe to include (it's meant to be public, RLS enforces security). Service role key stays server-side only.

### App Store Submission Requirements

1. **Apple Developer Account** (paid, $99/year)
2. **App Store Connect** — create app record
3. **Screenshots** — 6.7" (iPhone 15 Pro Max), 6.1" (iPhone 15 Pro)
4. **Privacy policy URL** — required
5. **App Review Guidelines compliance:**
   - Must work without account creation (use demo mode or TestFlight internal)
   - Age rating: 4+ (no objectionable content)
   - NSCameraUsageDescription, NSPhotoLibraryUsageDescription in Info.plist
6. **Data use declaration** — login credentials, work schedule data
7. **Build with `eas build --platform ios --profile production`**
8. **Submit with `eas submit --platform ios`**

### OTA Update Strategy

```
- EAS Update channels: "preview", "production"
- Runtime version policy: "appVersion" (OTA only if native code hasn't changed)
- Check for updates on app launch: checkAutomatically: "ON_LOAD"
- Fallback: if update download fails, use cached version immediately
- Critical fixes: force update via EAS Update (applies on next launch)
- Native changes (new SDK, new plugin): requires new binary via EAS Build
```

### CI/CD Pipeline

```yaml
# .github/workflows/mobile.yml (suggestion)
name: Mobile CI/CD

on:
  push:
    branches: [main]
    paths: ['grandcafe-cheers-mobile/**']
  pull_request:
    paths: ['grandcafe-cheers-mobile/**']

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd grandcafe-cheers-mobile && pnpm install
      - run: cd grandcafe-cheers-mobile && pnpm lint
      - run: cd grandcafe-cheers-mobile && pnpm test

  eas-update:
    needs: lint-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd grandcafe-cheers-mobile && eas update --branch production --auto
```

---

## 10. DEVELOPMENT ORDER (Sprint Plan)

### Sprint 1: Foundation + Auth + Home (1.5 weeks)

**Goal:** Buildable app with login, home dashboard, and the provider/store architecture.

**Order of creation:**

1. **Project init:**
   - `npx create-expo-app grandcafe-cheers-mobile --template tabs`
   - Install all dependencies (see package.json below)
   - Config files: `app.json`, `eas.json`, `tsconfig.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`, `.env.example`

2. **Constants + Types** (can be done in parallel):
   - `constants/config.ts`, `colors.ts`, `layout.ts`, `roles.ts`, `query-keys.ts`, `shift-types.ts`
   - `types/index.ts` (copy from web app, prune to employee-relevant types)
   - `types/navigation.ts`, `types/api.ts`

3. **Lib layer:**
   - `lib/supabase/client.ts` — Supabase client with SecureStore adapter
   - `lib/api/client.ts` — Base apiFetch with auth token injection
   - `lib/api/auth.ts` — signIn, signOut, getSession
   - `lib/utils/date.ts`, `format.ts`, `haptics.ts`, `platform.ts`

4. **Stores:**
   - `stores/auth-store.ts` — session, profile, employeeId, hydrate
   - `stores/ui-store.ts` — theme, locale
   - `stores/notification-store.ts` — unread count, push token

5. **i18n:**
   - `i18n/index.ts` — i18n-js setup
   - `i18n/messages/nl/common.json` (primary), `en/common.json`
   - Start with `common` namespace only; other namespaces added per sprint

6. **Providers:**
   - `providers/query-provider.tsx`
   - `providers/auth-provider.tsx`
   - `providers/theme-provider.tsx`
   - `providers/locale-provider.tsx`
   - `providers/offline-provider.tsx`
   - `providers/toast-provider.tsx`

7. **UI Components (core set):**
   - `components/ui/button.tsx`
   - `components/ui/text.tsx`
   - `components/ui/input.tsx`
   - `components/ui/card.tsx`
   - `components/ui/skeleton.tsx`
   - `components/ui/error-state.tsx`
   - `components/ui/safe-area-view.tsx`
   - `components/ui/toast.tsx`
   - `components/ui/avatar.tsx`

8. **Layouts:**
   - `app/_layout.tsx` — full provider stack
   - `app/(auth)/_layout.tsx`
   - `app/(auth)/login.tsx`
   - `app/(tabs)/_layout.tsx` — 5 tabs

9. **Home screen:**
   - `lib/api/schedule.ts` (getMyShifts only)
   - `lib/api/clock.ts` (getClockRecords only)
   - `hooks/queries/use-my-shifts.ts`
   - `hooks/queries/use-clock-records.ts`
   - `hooks/use-auth.ts`
   - `hooks/use-online-status.ts`
   - `components/home/greeting-banner.tsx`
   - `components/home/today-shift-card.tsx`
   - `components/home/hours-summary-card.tsx`
   - `components/home/upcoming-shifts-list.tsx`
   - `app/(tabs)/index.tsx`

**Deliverables:** Login works, home screen shows today's shift and hours summary, offline/online banner works, theme switching works.

**Estimated effort:** 1.5 weeks (1 developer)

---

### Sprint 2: Schedule + Hours + Tasks (1.5 weeks)

**Goal:** Complete Schedule tab, Hours tab, and Tasks in More tab.

**Order:**

1. **Schedule tab:**
   - `i18n/messages/*/schedule.json`
   - `components/schedule/week-header.tsx`
   - `components/schedule/day-column.tsx`
   - `components/schedule/shift-card.tsx`
   - `components/schedule/shift-legend.tsx`
   - `components/schedule/colleagues-on-shift.tsx`
   - `hooks/queries/use-day-schedule.ts`
   - `lib/api/schedule.ts` (add getDaySchedule)
   - `app/(tabs)/schedule/_layout.tsx`
   - `app/(tabs)/schedule/index.tsx`
   - `app/(tabs)/schedule/[date].tsx`

2. **Hours tab:**
   - `i18n/messages/*/hours.json`
   - `components/hours/period-selector.tsx`
   - `components/hours/hours-chart.tsx`
   - `components/hours/clock-record-row.tsx`
   - `components/hours/hours-total-card.tsx`
   - `components/hours/break-timeline.tsx`
   - `app/(tabs)/hours/_layout.tsx`
   - `app/(tabs)/hours/index.tsx`
   - `app/(tabs)/hours/[recordId].tsx`

3. **Tasks:**
   - `i18n/messages/*/tasks.json`
   - `lib/api/tasks.ts`
   - `hooks/queries/use-my-tasks.ts`
   - `components/tasks/task-card.tsx`
   - `components/tasks/task-checklist.tsx`
   - `components/tasks/task-priority-badge.tsx`
   - `components/tasks/task-filter-bar.tsx`
   - `app/(tabs)/more/_layout.tsx`
   - `app/(tabs)/more/index.tsx` (more menu)
   - `app/(tabs)/more/tasks/_layout.tsx`
   - `app/(tabs)/more/tasks/index.tsx`
   - `app/(tabs)/more/tasks/[taskId].tsx`

4. **Realtime subscriptions:**
   - `lib/supabase/realtime.ts`
   - Wire up shifts + tasks subscriptions in auth-provider

**Deliverables:** Schedule week view with swipe navigation, day detail showing colleagues, hours with bar chart and totals (READ-ONLY, no clock in/out), task list with checklist toggle.

**Estimated effort:** 1.5 weeks

---

### Sprint 3: Chat + Notifications + More Features (1.5 weeks)

**Goal:** AI Chat tab, notification system, swap requests, availability, leave.

**Order:**

1. **AI Chat:**
   - `i18n/messages/*/chat.json`
   - `lib/api/chat.ts` (SSE streaming)
   - `stores/chat-store.ts`
   - `hooks/use-ai-chat.ts` (port from web, adapt for RN)
   - `components/chat/message-bubble.tsx`
   - `components/chat/message-list.tsx`
   - `components/chat/chat-input.tsx`
   - `components/chat/tool-indicator.tsx`
   - `components/chat/pending-action-card.tsx`
   - `components/chat/typing-indicator.tsx`
   - `components/chat/conversation-drawer.tsx`
   - `app/(tabs)/chat/_layout.tsx`
   - `app/(tabs)/chat/index.tsx`

2. **Notifications:**
   - `i18n/messages/*/notifications.json`
   - `lib/api/notifications.ts`
   - `hooks/queries/use-notifications.ts`
   - `components/notifications/notification-item.tsx`
   - `components/notifications/notification-badge.tsx`
   - `components/home/notification-bell.tsx`
   - `app/(tabs)/more/notifications.tsx`
   - Wire notification badge into tab bar

3. **Push notifications:**
   - `lib/push/registration.ts`
   - `lib/push/handler.ts`
   - `providers/notification-provider.tsx`

4. **Swap requests:**
   - `lib/api/swap-requests.ts`
   - `hooks/queries/use-swap-requests.ts`
   - `components/schedule/swap-shift-modal.tsx`
   - `app/(tabs)/more/swap-requests.tsx`

5. **Availability:**
   - `lib/api/availability.ts`
   - `hooks/queries/use-availability.ts`
   - `app/(tabs)/more/availability.tsx`

6. **Leave:**
   - `i18n/messages/*/leave.json`
   - `lib/api/leave.ts`
   - `hooks/queries/use-leave.ts`
   - `components/leave/leave-balance-card.tsx`
   - `components/leave/leave-request-card.tsx`
   - `components/leave/leave-calendar.tsx`
   - `app/(tabs)/more/leave/_layout.tsx`
   - `app/(tabs)/more/leave/index.tsx`
   - `app/(tabs)/more/leave/request.tsx`

**Deliverables:** Full AI chat with streaming, push notifications working, swap requests, availability calendar, leave requests with balance display.

**Estimated effort:** 1.5 weeks

---

### Sprint 4: Profile + Training + Polish (1 week)

**Goal:** Profile editing, training courses, documents, remaining i18n, polish.

**Order:**

1. **Profile:**
   - `i18n/messages/*/profile.json`
   - `lib/api/profile.ts` (complete with avatar upload)
   - `hooks/queries/use-profile.ts`
   - `app/(tabs)/more/profile.tsx`

2. **Training:**
   - `i18n/messages/*/training.json`
   - `lib/api/training.ts`
   - `hooks/queries/use-training.ts`
   - `components/training/course-card.tsx`
   - `components/training/section-viewer.tsx`
   - `components/training/test-question.tsx`
   - `components/training/certificate-card.tsx`
   - `app/(tabs)/more/training/_layout.tsx`
   - `app/(tabs)/more/training/index.tsx`
   - `app/(tabs)/more/training/[guideCode].tsx`

3. **Documents:**
   - `lib/api/documents.ts`
   - `hooks/queries/use-documents.ts`
   - `app/(tabs)/more/documents.tsx`

4. **Settings:**
   - `i18n/messages/*/settings.json`
   - `app/(tabs)/more/settings.tsx`

5. **Remaining i18n:**
   - Complete all 4 locales for all 11 namespaces
   - `i18n/messages/es/*`, `i18n/messages/de/*`

6. **UI Polish:**
   - `components/ui/badge.tsx`, `select.tsx`, `switch.tsx`, `empty-state.tsx`, `divider.tsx`, `bottom-sheet.tsx`, `icon.tsx`, `pull-to-refresh.tsx`, `header.tsx`
   - `components/shared/role-badge.tsx`, `date-range-picker.tsx`, `locale-flag.tsx`, `version-info.tsx`
   - `components/home/pending-tasks-card.tsx`, `quick-actions.tsx`
   - Haptic feedback on all interactions
   - Keyboard avoiding behavior on all forms
   - Loading skeletons on all screens
   - Empty states on all lists

7. **Forgot password:**
   - `app/(auth)/forgot-password.tsx`

**Deliverables:** Complete app with all features, all 4 languages, polish. Ready for internal testing.

**Estimated effort:** 1 week

---

### Sprint 5: Testing + App Store (1 week)

**Goal:** Tests, EAS Build, TestFlight, App Store submission.

**Order:**

1. **Unit tests:**
   - `__tests__/unit/lib/date.test.ts`
   - `__tests__/unit/lib/format.test.ts`
   - `__tests__/unit/stores/auth-store.test.ts`
   - `__tests__/unit/stores/ui-store.test.ts`
   - `__tests__/unit/hooks/use-auth.test.ts`

2. **Integration tests:**
   - `__tests__/integration/api/auth.test.ts`
   - `__tests__/integration/api/schedule.test.ts`
   - `__tests__/integration/api/clock.test.ts`

3. **E2E tests (Maestro or Detox):**
   - `__tests__/e2e/login.test.ts`
   - `__tests__/e2e/schedule.test.ts`
   - `__tests__/e2e/chat.test.ts`

4. **Backend change:**
   - Update `/api/notifications/send/route.ts` to support Expo push tokens
   - Add `expo-server-sdk` to web app dependencies

5. **Build + Submit:**
   - `eas build --platform ios --profile production`
   - TestFlight internal testing (1-2 days)
   - Fix any issues
   - `eas submit --platform ios`
   - App Store review (~1-3 days)

**Deliverables:** App on App Store.

**Estimated effort:** 1 week

---

## PACKAGE.JSON DEPENDENCIES

```json
{
  "dependencies": {
    "expo": "~53.0.0",
    "expo-router": "~4.0.0",
    "expo-status-bar": "~2.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-notifications": "~0.29.0",
    "expo-device": "~7.0.0",
    "expo-constants": "~17.0.0",
    "expo-localization": "~16.0.0",
    "expo-image-picker": "~16.0.0",
    "expo-haptics": "~14.0.0",
    "expo-linking": "~7.0.0",
    "expo-splash-screen": "~0.29.0",
    "expo-updates": "~0.27.0",
    "expo-symbols": "~0.2.0",
    "react": "19.0.0",
    "react-native": "0.76.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-safe-area-context": "~4.14.0",
    "react-native-screens": "~4.4.0",
    "@supabase/supabase-js": "^2.49.0",
    "@tanstack/react-query": "^5.62.0",
    "@tanstack/query-sync-storage-persister": "^5.62.0",
    "@tanstack/react-query-persist-client": "^5.62.0",
    "zustand": "^5.0.0",
    "react-native-mmkv": "^3.2.0",
    "nativewind": "^4.1.0",
    "tailwindcss": "^3.4.0",
    "date-fns": "^4.1.0",
    "date-fns-tz": "^3.2.0",
    "i18n-js": "^4.4.0",
    "@gorhom/bottom-sheet": "^5.0.0",
    "@react-native-community/netinfo": "^11.4.0",
    "react-native-svg": "^15.8.0",
    "victory-native": "^41.0.0",
    "lucide-react-native": "^0.468.0"
  },
  "devDependencies": {
    "@types/react": "~19.0.0",
    "typescript": "~5.7.0",
    "@testing-library/react-native": "^12.9.0",
    "jest": "^29.7.0",
    "jest-expo": "~53.0.0",
    "@tanstack/eslint-plugin-query": "^5.62.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0"
  }
}
```

---

## KEY BACKEND CHANGES REQUIRED

1. **Push notification routing** — Update `/api/notifications/send/route.ts` to detect Expo push tokens (format: `ExponentPushToken[...]`) and route through Expo's Push API instead of `web-push`. Install `expo-server-sdk` in the web app.

2. **CORS** — The Next.js API must accept requests from the mobile app. Since the mobile app sends requests with `Authorization: Bearer <jwt>` headers (not cookies), the existing API routes should work without changes — they already use `supabase.auth.getUser()` which validates the JWT regardless of origin. No CORS headers needed because mobile fetch is not subject to browser CORS policy.

3. **No new API routes needed** — All required endpoints already exist in the Next.js backend. The mobile app uses the exact same API surface as the web app.
