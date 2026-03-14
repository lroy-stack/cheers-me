# iOS Native Integrations for GrandCafe Cheers Employee App

> Research date: 2026-03-14
> Target: React Native + Expo employee app (iOS-primary)
> Context: Companion app for the existing Next.js management platform

---

## Table of Contents

1. [Calendar Integration (EventKit)](#1-calendar-integration-eventkit)
2. [Reminders Integration (EventKit Reminders)](#2-reminders-integration-eventkit-reminders)
3. [iOS 26 Liquid Glass Design](#3-ios-26-liquid-glass-design)
4. [Widgets (iOS WidgetKit)](#4-widgets-ios-widgetkit)
5. [Live Activities (Dynamic Island)](#5-live-activities-dynamic-island)
6. [Sharing (UIActivityViewController)](#6-sharing-uiactivityviewcontroller)
7. [Haptic Feedback](#7-haptic-feedback)
8. [Push Notification Rich Content](#8-push-notification-rich-content)
9. [App Clips](#9-app-clips)
10. [Siri Shortcuts](#10-siri-shortcuts)
11. [Apple Watch (watchOS)](#11-apple-watch-watchos)
12. [Face ID / Touch ID](#12-face-id--touch-id)
13. [Health & Fitness Integration](#13-health--fitness-integration)
14. [Notes Integration](#14-notes-integration)
15. [WhatsApp Integration](#15-whatsapp-integration)
16. [Priority Matrix](#16-priority-matrix)

---

## 1. Calendar Integration (EventKit)

### Feasibility: YES (Expo managed workflow)

### Package

- **`expo-calendar`** (latest, included in Expo SDK 55)
- Install: `npx expo install expo-calendar`
- Alternative: `react-native-calendar-events@2.2.0` (older, no Expo config plugin)

### Permissions Required

- iOS: `NSCalendarsUsageDescription` (for events), `NSRemindersUsageDescription` (for reminders)
- Configured via config plugin in `app.json`:

```json
{
  "expo": {
    "plugins": [
      ["expo-calendar", {
        "calendarPermission": "GrandCafe Cheers needs calendar access to add your work shifts",
        "remindersPermission": "GrandCafe Cheers needs reminders access to add task reminders"
      }]
    ]
  }
}
```

### iOS Version Requirement

- iOS 15.1+ (Expo SDK 55 minimum)

### Creating a Dedicated "Work Schedule" Calendar

```typescript
import * as Calendar from 'expo-calendar';

async function getOrCreateWorkCalendar(): Promise<string> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Calendar permission denied');
  }

  // Check if our calendar already exists
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find(c => c.title === 'GrandCafe Cheers Shifts');
  if (existing) {
    return existing.id;
  }

  // Find the default iOS source for local calendars
  const defaultSource = calendars.find(
    c => c.source?.type === 'local'
  )?.source ?? calendars[0]?.source;

  if (!defaultSource) {
    throw new Error('No calendar source available');
  }

  const calendarId = await Calendar.createCalendarAsync({
    title: 'GrandCafe Cheers Shifts',
    color: '#F59E0B',  // Amber / brand color
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultSource.id,
    source: defaultSource,
    name: 'grandcafe_cheers_shifts',
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  return calendarId;
}
```

### Adding a Shift as Calendar Event

```typescript
interface ShiftEvent {
  readonly title: string;
  readonly role: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly notes?: string;
}

async function addShiftToCalendar(
  calendarId: string,
  shift: ShiftEvent
): Promise<string> {
  const eventId = await Calendar.createEventAsync(calendarId, {
    title: `${shift.role} Shift - GrandCafe Cheers`,
    startDate: shift.startTime,
    endDate: shift.endTime,
    timeZone: 'Europe/Madrid',
    location: 'GrandCafe Cheers, El Arenal, Mallorca',
    notes: shift.notes ?? 'Remember to clock in when you arrive!',
    alarms: [
      { relativeOffset: -30 },  // 30 min before (travel time reminder)
      { relativeOffset: -60 },  // 1 hour before
    ],
    // iOS supports travel time via structured location alarms
    // but expo-calendar uses relativeOffset as the primary mechanism
  });

  return eventId;
}
```

### Adding Recurring Shifts

```typescript
async function addRecurringShift(
  calendarId: string,
  shift: ShiftEvent,
  daysOfWeek: number[],  // 1=Sunday, 2=Monday, ..., 7=Saturday
  endDate: Date
): Promise<string> {
  const eventId = await Calendar.createEventAsync(calendarId, {
    title: `${shift.role} Shift - GrandCafe Cheers`,
    startDate: shift.startTime,
    endDate: shift.endTime,
    timeZone: 'Europe/Madrid',
    location: 'GrandCafe Cheers, El Arenal, Mallorca',
    alarms: [{ relativeOffset: -30 }],
    recurrenceRule: {
      frequency: Calendar.Frequency.WEEKLY,
      interval: 1,
      daysOfTheWeek: daysOfWeek.map(day => ({ dayOfTheWeek: day })),
      endDate: endDate,
    },
  });

  return eventId;
}
```

### Timezone Handling

- Set `timeZone: 'Europe/Madrid'` on every event
- Expo-calendar passes this through to EventKit
- iOS handles DST transitions automatically for `Europe/Madrid`
- All shift times from the API should be in UTC; convert to `Europe/Madrid` for display

### Travel Time and Alerts

- `relativeOffset: -30` gives a 30-minute-before alert (acts as travel time warning)
- `relativeOffset: -60` gives a 1-hour-before alert
- Structured geo-fence alarms are supported by iOS but `expo-calendar` exposes them via the alarm `structuredLocation` property (limited documentation)
- Practical approach: use two alarms (1h and 30min before) which achieves the same user experience

### Sync Strategy

- On login/schedule update, sync all upcoming shifts to the local calendar
- Store `eventId` mapping in AsyncStorage: `{ shiftId: eventId }`
- On schedule change, update or delete existing events
- Use `Calendar.updateEventAsync()` and `Calendar.deleteEventAsync()`

---

## 2. Reminders Integration (EventKit Reminders)

### Feasibility: YES (iOS only, Expo managed workflow)

### Package

- **`expo-calendar`** -- same package, reminders are a separate API within it

### Permissions Required

- iOS: `NSRemindersUsageDescription`
- Use `Calendar.requestRemindersPermissionsAsync()`

### Creating a "Work Tasks" Reminder List

```typescript
async function getOrCreateTaskList(): Promise<string> {
  const { status } = await Calendar.requestRemindersPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Reminders permission denied');
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER);
  const existing = calendars.find(c => c.title === 'GrandCafe Tasks');
  if (existing) {
    return existing.id;
  }

  const defaultSource = calendars.find(
    c => c.source?.type === 'local'
  )?.source ?? calendars[0]?.source;

  if (!defaultSource) {
    throw new Error('No reminder source available');
  }

  const calendarId = await Calendar.createCalendarAsync({
    title: 'GrandCafe Tasks',
    color: '#3B82F6',
    entityType: Calendar.EntityTypes.REMINDER,
    sourceId: defaultSource.id,
    source: defaultSource,
    name: 'grandcafe_tasks',
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  return calendarId;
}
```

### Adding a Task as Reminder

```typescript
interface WorkTask {
  readonly title: string;
  readonly dueDate: Date;
  readonly notes?: string;
  readonly priority?: number;  // 0=none, 1=high, 5=medium, 9=low
}

async function addTaskAsReminder(
  calendarId: string,
  task: WorkTask
): Promise<string> {
  const reminderId = await Calendar.createReminderAsync(calendarId, {
    title: task.title,
    dueDate: task.dueDate,
    completed: false,
    notes: task.notes,
    alarms: [{ relativeOffset: -15 }],  // 15 min before due
  });

  return reminderId;
}
```

### Limitations

- **iOS only** -- Android has no native Reminders app integration
- Reminders appear in the Apple Reminders app immediately
- No "Urgent" reminder flag through expo-calendar (iOS 26 Reminders app has "Urgent" but the EventKit API for priority is numeric only)

---

## 3. iOS 26 Liquid Glass Design

### What Is Liquid Glass?

Liquid Glass is Apple's new design language introduced in iOS 26 (WWDC 2025), the most significant visual overhaul since iOS 7. Key characteristics:

- **Translucent glass material** that allows content to shine through UI elements
- **Dynamic light reflection** that responds to device movement via real-time rendering
- **Layered depth** with glass-like effects on app icons, navigation bars, tab bars, toolbars, and sheets
- **Rounded corners everywhere** -- pill-shaped navigation bars, circular buttons
- **Contextual collapsing** -- tab bars and navigation elements collapse/expand based on scroll context
- **Reduced visual clutter** with increased spacing and condensed bottom nav bars
- **Extends across all Apple platforms** (iOS, iPadOS, macOS, watchOS, visionOS)

### Impact on React Native / NativeWind

**What happens automatically:**

- Native iOS system components (navigation bars, tab bars, alerts, action sheets, share sheets) will adopt Liquid Glass styling automatically when the app is compiled with Xcode 26 SDK
- `UINavigationBar`, `UITabBar`, `UIToolbar` get the glass material by default
- System dialogs, share sheets, and modal presentations update automatically

**What does NOT happen automatically:**

- Custom UI built with React Native `<View>`, `<Text>`, etc. stays as-is
- NativeWind/Tailwind CSS classes have no Liquid Glass awareness
- Custom tab bars or navigation headers need manual adaptation
- App icons need updating to the new translucent style option

### How to Achieve Glass Effects in React Native

**`expo-blur`** (v55+) supports iOS system materials:

```typescript
import { BlurView } from 'expo-blur';

// iOS system material that approximates Liquid Glass
<BlurView
  intensity={80}
  tint="systemChromeMaterial"  // or "systemThinMaterial", "systemUltraThinMaterial"
  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 88 }}
>
  <NavigationHeader />
</BlurView>
```

Available tint options that approximate Liquid Glass:
- `'systemUltraThinMaterial'` / `'systemUltraThinMaterialDark'`
- `'systemThinMaterial'` / `'systemThinMaterialDark'`
- `'systemMaterial'` / `'systemMaterialDark'`
- `'systemThickMaterial'` / `'systemThickMaterialDark'`
- `'systemChromeMaterial'` / `'systemChromeMaterialDark'`

### Design Recommendations for the Employee App

1. **Use React Navigation's native stack** (`@react-navigation/native-stack`) -- it uses native `UINavigationController` which gets Liquid Glass automatically
2. **Use native tab bar** via `@react-navigation/bottom-tabs` with `tabBarStyle: { position: 'absolute' }` for translucency
3. **Use `expo-blur` BlurView** for any custom overlay panels, floating action bars, or modal backgrounds
4. **Update app icons** to the new translucent option Apple offers
5. **Increase corner radii** on cards and containers to match iOS 26 aesthetics (16-20px)
6. **Reduce border usage** -- Liquid Glass relies on material differentiation, not borders
7. **Test with Xcode 26** to see which system components auto-adopt the new style

### Widget Visual Changes

- iOS 26 widgets get automatic glass treatment
- StandBy mode and Lock Screen widgets respect the new materials
- No code changes needed for WidgetKit widgets to adopt the style

---

## 4. Widgets (iOS WidgetKit)

### Feasibility: YES (needs config plugin, requires native Swift code)

### Approach Options

| Package | Version | Approach | Maturity |
|---------|---------|----------|----------|
| `@bacons/apple-targets` | 4.0.6 | Generates Apple extension targets via Expo prebuild | Active, by Evan Bacon (Expo team) |
| `@bittingz/expo-widgets` | 3.0.2 | Expo module for native widgets | Active, community |
| `react-native-widget-extension` | 0.2.0 | Config plugin for widgets + live activities | Less active |

**Recommended: `@bacons/apple-targets`** -- most flexible, actively maintained by Expo core team member, supports all Apple target types.

### Widget Types Available

| Widget Type | iOS Version | Display Location |
|-------------|-------------|-----------------|
| Home Screen (small/medium/large) | iOS 14+ | Home Screen |
| Lock Screen (circular/rectangular/inline) | iOS 16+ | Lock Screen |
| StandBy | iOS 17+ | StandBy mode |
| Interactive Widgets | iOS 17+ | All placements |

### Use Case: "Next Shift" Widget

Shows the employee's next shift time with a countdown.

**Setup with `@bacons/apple-targets`:**

```bash
npx expo install @bacons/apple-targets
npx create-target widget
```

**`targets/next-shift-widget/expo-target.config.js`:**
```javascript
module.exports = (config) => ({
  type: 'widget',
  name: 'NextShiftWidget',
  displayName: 'Next Shift',
  deploymentTarget: '16.0',
  bundleIdentifier: '.nextShiftWidget',
  icon: '../../assets/widget-icon.png',
  frameworks: ['SwiftUI', 'WidgetKit'],
  colors: {
    $accent: { color: '#F59E0B', darkColor: '#FBBF24' },
    $widgetBackground: { color: '#FFFFFF', darkColor: '#1F2937' },
  },
  entitlements: {
    'com.apple.security.application-groups': [
      `group.${config.ios.bundleIdentifier}`,
    ],
  },
});
```

**`targets/next-shift-widget/NextShiftWidget.swift`:**
```swift
import WidgetKit
import SwiftUI

struct ShiftEntry: TimelineEntry {
    let date: Date
    let shiftRole: String
    let shiftStart: Date
    let shiftEnd: Date
    let isEmpty: Bool
}

struct NextShiftProvider: TimelineProvider {
    func placeholder(in context: Context) -> ShiftEntry {
        ShiftEntry(date: Date(), shiftRole: "Bar", shiftStart: Date(), shiftEnd: Date(), isEmpty: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (ShiftEntry) -> Void) {
        let entry = loadShiftFromAppGroup()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ShiftEntry>) -> Void) {
        let entry = loadShiftFromAppGroup()
        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadShiftFromAppGroup() -> ShiftEntry {
        guard let defaults = UserDefaults(suiteName: "group.com.grandcafe.cheers"),
              let shiftData = defaults.data(forKey: "nextShift"),
              let shift = try? JSONDecoder().decode(ShiftData.self, from: shiftData)
        else {
            return ShiftEntry(date: Date(), shiftRole: "", shiftStart: Date(), shiftEnd: Date(), isEmpty: true)
        }
        return ShiftEntry(
            date: Date(),
            shiftRole: shift.role,
            shiftStart: shift.startTime,
            shiftEnd: shift.endTime,
            isEmpty: false
        )
    }
}

struct NextShiftWidgetView: View {
    let entry: ShiftEntry

    var body: some View {
        if entry.isEmpty {
            Text("No upcoming shift")
                .font(.caption)
        } else {
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.shiftRole)
                    .font(.headline)
                    .foregroundColor(.accentColor)
                Text(entry.shiftStart, style: .time)
                    .font(.title2)
                    .bold()
                Text(entry.shiftStart, style: .relative)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
        }
    }
}

@main
struct NextShiftWidget: Widget {
    let kind = "NextShiftWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NextShiftProvider()) { entry in
            NextShiftWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Next Shift")
        .description("Shows your upcoming shift at GrandCafe Cheers")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}
```

### Data Sharing (App Groups)

React Native app writes shift data to shared UserDefaults:

```typescript
import { NativeModules } from 'react-native';

// You need a small native module or use @bacons/apple-targets shared code
// to write to App Group UserDefaults from the RN side.
// One approach: use react-native-shared-group-preferences

import SharedGroupPreferences from 'react-native-shared-group-preferences';

const APP_GROUP = 'group.com.grandcafe.cheers';

interface NextShiftData {
  readonly role: string;
  readonly startTime: string;  // ISO 8601
  readonly endTime: string;
}

async function updateWidgetData(shift: NextShiftData): Promise<void> {
  await SharedGroupPreferences.setItem(
    'nextShift',
    JSON.stringify(shift),
    APP_GROUP
  );
  // Tell WidgetKit to refresh (requires native bridge or expo-live-activity)
}
```

### Use Case: "Clock In/Out" Interactive Widget (iOS 17+)

Interactive widgets can trigger app intents directly from the widget surface -- the button opens the app to the clock-in screen via deep link.

---

## 5. Live Activities (Dynamic Island)

### Feasibility: YES (needs config plugin, requires native Swift code)

### Package

- **`expo-live-activity`** v0.4.2 (by Software Mansion Labs)
- Install: `npm install expo-live-activity`
- Requires: iOS 16.2+, Expo development build (not Expo Go)

### Setup

```json
{
  "expo": {
    "plugins": [
      ["expo-live-activity", { "enablePushNotifications": true }]
    ]
  }
}
```

Place images in `assets/liveActivity/` (max 4KB per image).
Run `npx expo prebuild --clean` after setup.

### Use Case: Active Shift Timer

When an employee clocks in, start a Live Activity showing elapsed shift time on Dynamic Island and Lock Screen.

```typescript
import * as LiveActivity from 'expo-live-activity';

// Start when employee clocks in
async function startShiftLiveActivity(
  role: string,
  clockInTime: Date
): Promise<string> {
  const state = {
    title: `${role} Shift`,
    subtitle: 'Clocked In',
    progressBar: {
      elapsedTimer: {
        startDate: clockInTime.getTime(),
      },
    },
    imageName: 'shift_icon',  // from assets/liveActivity/
    dynamicIslandImageName: 'shift_di',
  };

  const config = {
    backgroundColor: '#F59E0B',
    titleColor: '#FFFFFF',
    subtitleColor: '#FEF3C7',
    timerType: 'digital' as const,
    deepLinkUrl: '/shift/active',
  };

  const activityId = LiveActivity.startActivity(state, config);
  return activityId;
}

// Update when break starts
async function updateShiftForBreak(activityId: string): Promise<void> {
  LiveActivity.updateActivity(activityId, {
    title: 'On Break',
    subtitle: 'Break Time',
    progressBar: {
      elapsedTimer: {
        startDate: Date.now(),
      },
    },
  });
}

// Stop when employee clocks out
async function stopShiftActivity(activityId: string): Promise<void> {
  LiveActivity.stopActivity(activityId, {
    title: 'Shift Complete',
    subtitle: 'Clocked Out',
    progressBar: {
      progress: 1.0,
    },
  });
}
```

### Push Notification Updates

Server can update the Live Activity via push notifications when the app is in background:

```typescript
// Listen for push token to send to server
useEffect(() => {
  const subscription = LiveActivity.addActivityTokenListener(
    ({ activityID, activityPushToken }) => {
      // Send token to backend API
      fetch('/api/live-activity/register', {
        method: 'POST',
        body: JSON.stringify({ activityID, token: activityPushToken }),
      });
    }
  );
  return () => subscription?.remove();
}, []);
```

### Dynamic Island Display

- **Compact leading**: Shift icon
- **Compact trailing**: Elapsed timer (digital format)
- **Expanded**: Full shift card with role, timer, break button
- **Minimal**: Small timer pill
- Timer type: `'circular'` or `'digital'`

### Limitations

- iOS 16.2+ required
- Push-to-start tokens: iOS 17.2+
- Cannot receive push tokens on Simulator
- Max 4KB per image asset
- Only one progress type per activity (date OR progress OR elapsed timer)
- Requires development build (not Expo Go)
- Package is early-stage: breaking changes in minor versions

---

## 6. Sharing (UIActivityViewController / Share Sheet)

### Feasibility: YES (Expo managed workflow)

### Packages

| Package | Purpose | Version |
|---------|---------|---------|
| `expo-sharing` | Native share sheet | Latest (SDK 55) |
| `expo-file-system` | File creation | Latest (SDK 55) |
| `react-native-view-shot` | Capture view as image | 4.0.3 |
| `expo-print` | Generate PDF | Latest (SDK 55) |

### Share Schedule as Image

```typescript
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

// 1. Capture the schedule view as an image
const scheduleViewRef = useRef<View>(null);

async function shareScheduleAsImage(): Promise<void> {
  if (!scheduleViewRef.current) return;

  const uri = await captureRef(scheduleViewRef, {
    format: 'png',
    quality: 0.9,
  });

  // 2. Share via native share sheet
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Share Schedule',
    });
  }
}
```

### Share Schedule as PDF

```typescript
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

async function shareScheduleAsPdf(
  shifts: readonly ShiftEvent[]
): Promise<void> {
  const html = generateScheduleHtml(shifts);  // Build HTML table

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share Schedule',
    UTI: 'com.adobe.pdf',
  });
}
```

### WhatsApp Direct Share (Deep Link)

```typescript
import { Linking } from 'react-native';

async function shareToWhatsApp(text: string): Promise<void> {
  const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
  const canOpen = await Linking.canOpenURL(url);

  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // Fallback: open regular share sheet
    // or prompt to install WhatsApp
  }
}

// Share shift details
async function shareShiftViaWhatsApp(shift: ShiftEvent): Promise<void> {
  const text = [
    `My shift at GrandCafe Cheers:`,
    `Role: ${shift.role}`,
    `Date: ${formatDate(shift.startTime)}`,
    `Time: ${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`,
    `Location: El Arenal, Mallorca`,
  ].join('\n');

  await shareToWhatsApp(text);
}
```

### Share to Specific Contact on WhatsApp

```typescript
// With phone number (opens chat with that person)
async function shareToWhatsAppContact(phone: string, text: string): Promise<void> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  await Linking.openURL(url);
}
```

### LSApplicationQueriesSchemes

Add to `app.json` for `canOpenURL` to work:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "LSApplicationQueriesSchemes": ["whatsapp", "whatsapp-business"]
      }
    }
  }
}
```

---

## 7. Haptic Feedback

### Feasibility: YES (Expo managed workflow)

### Package

- **`expo-haptics`** (latest, included in Expo SDK 55)
- Install: `npx expo install expo-haptics`

### Permission Required

- None. No user permission needed.

### iOS Version Requirement

- iOS 10+ (Taptic Engine required)

### Haptic Patterns for the Employee App

```typescript
import * as Haptics from 'expo-haptics';

// Clock In / Clock Out confirmation
async function clockInHaptic(): Promise<void> {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

// Break start
async function breakStartHaptic(): Promise<void> {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

// Break end (back to work)
async function breakEndHaptic(): Promise<void> {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

// Shift swap request received
async function shiftSwapHaptic(): Promise<void> {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

// Error (e.g., clock-in failed, not at location)
async function errorHaptic(): Promise<void> {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

// Tab/menu selection
async function selectionHaptic(): Promise<void> {
  await Haptics.selectionAsync();
}

// Task completion checkmark
async function taskCompleteHaptic(): Promise<void> {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
```

### Impact Styles Reference

| Style | Use Case | Intensity |
|-------|----------|-----------|
| `Light` | Selection, checkbox toggle | Subtle tap |
| `Medium` | Button press, break start | Standard tap |
| `Heavy` | Clock in/out, shift start | Strong tap |
| `Rigid` | Snap-to-grid, drag drop | Sharp, precise |
| `Soft` | Subtle transitions | Gentle, cushioned |

### Notification Types Reference

| Type | Use Case | Feel |
|------|----------|------|
| `Success` | Clock in confirmed, task done | Positive double-tap |
| `Warning` | Shift swap request, late alert | Attention-getting |
| `Error` | Clock-in failed, permission denied | Error pattern |

### Platform Notes

- Haptics are disabled when iOS Low Power Mode is active
- Haptics are disabled when camera or dictation is running
- No user permission required
- Works in Expo Go

---

## 8. Push Notification Rich Content

### Feasibility: YES (Expo managed workflow)

### Package

- **`expo-notifications`** (latest, included in Expo SDK 55)
- Install: `npx expo install expo-notifications`

### Notification Actions (Interactive Buttons)

```typescript
import * as Notifications from 'expo-notifications';

// Define categories with action buttons
async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('SHIFT_REMINDER', [
    {
      identifier: 'CLOCK_IN',
      buttonTitle: 'Clock In Now',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'VIEW_SCHEDULE',
      buttonTitle: 'View Schedule',
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('SHIFT_SWAP', [
    {
      identifier: 'ACCEPT_SWAP',
      buttonTitle: 'Accept',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'DECLINE_SWAP',
      buttonTitle: 'Decline',
      options: {
        isDestructive: true,
      },
    },
    {
      identifier: 'REPLY_SWAP',
      buttonTitle: 'Reply',
      textInput: {
        submitButtonTitle: 'Send',
        placeholder: 'Type a message...',
      },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('TASK_ASSIGNED', [
    {
      identifier: 'MARK_DONE',
      buttonTitle: 'Mark Done',
    },
    {
      identifier: 'VIEW_TASK',
      buttonTitle: 'View Details',
      options: {
        opensAppToForeground: true,
      },
    },
  ]);
}
```

### Time-Sensitive Notifications

```typescript
// Server-side push payload for shift reminders
const pushPayload = {
  to: expoPushToken,
  title: 'Shift Starting Soon',
  body: 'Your Bar shift starts in 30 minutes',
  data: { shiftId: '123', type: 'shift_reminder' },
  categoryId: 'SHIFT_REMINDER',
  // iOS interruption levels:
  // 'passive' - silent, goes to notification list
  // 'active' - default behavior
  // 'timeSensitive' - breaks through Focus mode
  // 'critical' - bypasses mute (requires Apple entitlement)
  priority: 'high',
  _contentAvailable: true,
  // For iOS:
  interruptionLevel: 'timeSensitive',
};
```

### Notification Grouping

```typescript
// Group shift notifications together
const notification = {
  content: {
    title: 'Schedule Update',
    body: 'Your Thursday shift has been changed',
    threadIdentifier: 'schedule-updates',  // iOS groups these together
    summaryArgument: 'schedule',
    categoryIdentifier: 'SHIFT_REMINDER',
  },
  trigger: null,  // Immediate
};
```

### Rich Media Attachments (iOS)

```typescript
// Attach an image to the notification (iOS)
const notification = {
  content: {
    title: 'New Schedule Published',
    body: 'Tap to view your shifts for next week',
    attachments: [
      {
        identifier: 'schedule-preview',
        url: 'https://api.grandcafe.app/schedules/preview.png',
        type: 'image/png',
      },
    ],
  },
  trigger: null,
};
```

### Handling Notification Actions

```typescript
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data;

      switch (actionId) {
        case 'CLOCK_IN':
          navigation.navigate('ClockIn', { shiftId: data.shiftId });
          break;
        case 'ACCEPT_SWAP':
          handleSwapAccept(data.swapId);
          break;
        case 'DECLINE_SWAP':
          handleSwapDecline(data.swapId);
          break;
        case 'MARK_DONE':
          handleTaskComplete(data.taskId);
          break;
        default:
          // Default tap opens the app
          break;
      }
    }
  );

  return () => subscription.remove();
}, []);
```

### Notification Handler (Foreground)

```typescript
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const category = notification.request.content.categoryIdentifier;

    return {
      shouldShowBanner: true,
      shouldPlaySound: category === 'SHIFT_REMINDER',
      shouldSetBadge: true,
    };
  },
});
```

---

## 9. App Clips

### Feasibility: YES (needs config plugin, requires native code)

### Package

- **`@bacons/apple-targets`** v4.0.6 -- supports `type: 'clip'`

### Use Case: NFC Kiosk Clock-In

1. Place an NFC tag at the restaurant entrance
2. Employee taps phone to NFC tag
3. App Clip launches (or full app if installed)
4. Shows a minimal clock-in UI
5. Employee authenticates with Face ID and clocks in

### Setup

```javascript
// targets/clock-in-clip/expo-target.config.js
module.exports = (config) => ({
  type: 'clip',
  name: 'ClockInClip',
  displayName: 'Clock In - GrandCafe Cheers',
  deploymentTarget: '16.0',
  bundleIdentifier: '.clip',
  exportJs: true,  // Bundle JS for the clip
  entitlements: {
    'com.apple.developer.parent-application-identifiers': [
      config.ios.bundleIdentifier,
    ],
    'com.apple.security.application-groups': [
      `group.${config.ios.bundleIdentifier}`,
    ],
  },
});
```

### NFC Tag Configuration

- Register your App Clip Experience URL in App Store Connect
- NFC tag contains: `https://cheers.app/clock-in`
- Apple validates the URL and launches the App Clip
- App Clip must be under 10MB

### Technical Limitations

- App Clips are limited to 10MB
- They expire after a period of inactivity (deleted by iOS)
- Limited to location/NFC/QR/Safari Smart Banner/Messages invocations
- Cannot access HealthKit, CallKit, or some other frameworks
- With `exportJs: true`, you can use React Native code in the clip
- BUT the JS bundle adds significant size -- may be tight with 10MB limit

### Practical Assessment

App Clips for clock-in is technically feasible but **may not be worth the complexity**:
- Employees will already have the full app installed
- NFC can trigger a Universal Link that opens the full app to the clock-in screen
- The full app experience is better than a minimal App Clip

**Better alternative**: Use NFC tags with Universal Links to deep-link into the installed app's clock-in screen. Reserve App Clips for guest-facing features (like the customer menu/ordering).

---

## 10. Siri Shortcuts

### Feasibility: YES (needs config plugin or native module)

### Package

- **`react-native-siri-shortcut`** v3.2.4 -- most established package
- Supports iOS 12+ Siri Shortcuts
- No official Expo config plugin -- requires manual native setup or custom config plugin

### What It Can Do

1. **Donate activities** -- tell Siri about actions the user performs
2. **Respond to Siri invocations** -- handle when user triggers shortcut via voice
3. **Siri Suggestions** -- appear in Spotlight, lock screen, and Siri based on usage patterns

### Use Cases

```typescript
// "Hey Siri, what's my next shift?"
// "Hey Siri, clock me in"
// "Hey Siri, am I working today?"

import { donateShortcut, SiriButton } from 'react-native-siri-shortcut';

// Donate a "next shift" shortcut after user views their schedule
function donateNextShiftShortcut(nextShift: ShiftEvent): void {
  donateShortcut({
    activityType: 'com.grandcafe.cheers.nextShift',
    title: 'Check Next Shift',
    suggestedInvocationPhrase: "What's my next shift?",
    userInfo: {
      shiftId: nextShift.id,
    },
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
  });
}

// Donate a "clock in" shortcut after user clocks in
function donateClockInShortcut(): void {
  donateShortcut({
    activityType: 'com.grandcafe.cheers.clockIn',
    title: 'Clock In at GrandCafe',
    suggestedInvocationPhrase: 'Clock me in',
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
  });
}
```

### Handling Siri Invocations

```typescript
import { getInitialShortcut, addShortcutListener } from 'react-native-siri-shortcut';

// Handle shortcut that launched the app
const initial = await getInitialShortcut();
if (initial?.activityType === 'com.grandcafe.cheers.clockIn') {
  navigation.navigate('ClockIn');
}

// Listen for shortcuts while app is running
const subscription = addShortcutListener(({ activityType, userInfo }) => {
  switch (activityType) {
    case 'com.grandcafe.cheers.nextShift':
      navigation.navigate('Schedule');
      break;
    case 'com.grandcafe.cheers.clockIn':
      navigation.navigate('ClockIn');
      break;
  }
});
```

### Expo Compatibility

- Does NOT have a config plugin -- requires `expo prebuild` and manual Xcode configuration
- Or: create a custom Expo config plugin (medium effort)
- Alternative: use `@bacons/apple-targets` to create a Siri Intent extension with full App Intents (iOS 16+) -- more powerful but more native Swift code

### Practical Assessment

Siri Shortcuts for "clock me in" is a genuinely useful feature for hands-free operation (e.g., employee arriving on bicycle/scooter). However, the setup complexity is moderate and the package lacks first-class Expo support.

---

## 11. Apple Watch (watchOS)

### Feasibility: PARTIAL (requires significant native code)

### Packages

| Package | Version | Notes |
|---------|---------|-------|
| `@bacons/apple-targets` | 4.0.6 | Can generate Watch App target |
| `react-native-watch-connectivity` | 1.1.0 | Communication bridge between phone and watch |

### What's Possible

1. **Watch App target** via `@bacons/apple-targets` with `type: 'watch'`
2. **Communication** via `WatchConnectivity` framework (send data between phone/watch)
3. **Watch Face Complications** via `type: 'complication'`

### Use Cases

- Shift timer complication on watch face
- Clock in/out from wrist
- Break timer
- Next shift glance

### Setup Pattern

```javascript
// targets/watch-app/expo-target.config.js
module.exports = {
  type: 'watch',
  name: 'CheersWatch',
  displayName: 'GrandCafe Watch',
  deploymentTarget: '10.0',
  frameworks: ['SwiftUI', 'WatchKit', 'ClockKit'],
};
```

### Practical Assessment

Watch app development requires:
- Entirely Swift/SwiftUI code for the watch interface
- Complex data synchronization between phone and watch
- Separate testing on watch hardware or simulator
- Ongoing maintenance of two native codebases

**Recommendation**: Start with Live Activities (they appear on Apple Watch Ultra automatically). A dedicated watch app is a Phase 3+ feature.

---

## 12. Face ID / Touch ID

### Feasibility: YES (Expo managed workflow)

### Package

- **`expo-local-authentication`** (latest, included in Expo SDK 55)
- Install: `npx expo install expo-local-authentication`

### Permissions

- iOS: `NSFaceIDUsageDescription` (for Face ID)
- Configured via config plugin:

```json
{
  "expo": {
    "plugins": [
      ["expo-local-authentication", {
        "faceIDPermission": "GrandCafe Cheers uses Face ID to securely clock you in"
      }]
    ]
  }
}
```

### Code Pattern for Clock-In Authentication

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

async function authenticateForClockIn(): Promise<boolean> {
  // Check hardware availability
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    return false;  // Fall back to PIN
  }

  // Check enrollment
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) {
    return false;  // No biometrics enrolled
  }

  // Authenticate
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to clock in',
    cancelLabel: 'Use PIN instead',
    disableDeviceFallback: false,  // Allow passcode fallback
    fallbackLabel: 'Enter PIN',
  });

  return result.success;
}
```

### iOS 26 Changes

- No breaking changes to the LocalAuthentication API
- Face ID continues to work as before under Liquid Glass
- The biometric prompt UI may adopt Liquid Glass styling automatically (system-provided)
- iOS 26 introduced optic ID for Vision Pro but that does not affect iPhone Face ID

---

## 13. Health & Fitness Integration

### Feasibility: YES (needs config plugin)

### Package

- **`react-native-health`** v1.19.0 -- wraps Apple HealthKit
- Has Expo config plugin support (`@expo/config-plugins` dependency)
- `expo-health` exists as placeholder (v0.0.0, not functional)

### What Could Be Tracked

- Steps during shift
- Standing time
- Distance walked
- Heart rate (if Watch connected)

### Permissions

- `NSHealthShareUsageDescription` (read)
- `NSHealthUpdateUsageDescription` (write)
- HealthKit entitlement required in provisioning profile

### Practical Assessment

**Verdict: Overkill for Phase 1-2.**

Reasons against:
- Health data is extremely personal and sensitive -- GDPR implications in Spain/EU
- Employees may view health tracking by employer as invasive
- Minimal business value for a restaurant app
- Complex permissions and privacy review
- Apple may reject App Store submission if health tracking seems surveillance-like

**If ever implemented**: Frame it as opt-in personal wellness ("See how active your shift was!"), never as employer monitoring.

---

## 14. Notes Integration

### Feasibility: PARTIAL (via Share Sheet only)

There is no direct API to write to Apple Notes from React Native. The approach is:

### Via Share Sheet

```typescript
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

async function shareToNotes(content: string): Promise<void> {
  // Create a text file
  const fileUri = FileSystem.documentDirectory + 'shift-notes.txt';
  await FileSystem.writeAsStringAsync(fileUri, content);

  // Share sheet will include "Save to Notes" option
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/plain',
    dialogTitle: 'Save Shift Notes',
  });
}
```

### Via URL Scheme

Apple Notes does not have a public URL scheme for creating new notes. The share sheet is the only path.

### Practical Assessment

**Nice-to-have, low effort.** The share sheet approach works well enough. Employees can save shift handover notes to their personal Notes app via the standard iOS share flow.

---

## 15. WhatsApp Integration

### Feasibility: YES (deep links + share sheet)

### Text Sharing (Deep Link)

```typescript
import { Linking } from 'react-native';

// Share text to WhatsApp (general)
async function shareTextToWhatsApp(text: string): Promise<void> {
  const encoded = encodeURIComponent(text);
  const url = `whatsapp://send?text=${encoded}`;

  if (await Linking.canOpenURL(url)) {
    await Linking.openURL(url);
  }
}

// Share to specific phone number
async function shareToContact(phone: string, text: string): Promise<void> {
  // phone should include country code, no + or spaces: "34612345678"
  const encoded = encodeURIComponent(text);
  await Linking.openURL(`https://wa.me/${phone}?text=${encoded}`);
}
```

### File Sharing (Schedule Image via WhatsApp)

```typescript
import * as Sharing from 'expo-sharing';

// After capturing schedule as image with react-native-view-shot:
async function shareScheduleImageToWhatsApp(imageUri: string): Promise<void> {
  // The native share sheet includes WhatsApp as a target
  await Sharing.shareAsync(imageUri, {
    mimeType: 'image/png',
  });
  // User selects WhatsApp from the share sheet
}
```

### WhatsApp Business API (Server-Side)

For automated shift notifications from the server:

- Uses WhatsApp Business API (separate from the mobile app integration)
- Requires WhatsApp Business account verification
- Template messages need pre-approval by WhatsApp/Meta
- Costs per message (conversation-based pricing)
- Best for: automated shift reminders, schedule publications, shift swap notifications

This is a **server-side integration** (not a mobile app feature) and would be implemented in the Next.js backend, not the React Native app.

### Required Configuration

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "LSApplicationQueriesSchemes": [
          "whatsapp",
          "whatsapp-business"
        ]
      }
    }
  }
}
```

---

## 16. Priority Matrix

### Must-Have (Phase 1)

| Integration | Effort | Impact | Package |
|-------------|--------|--------|---------|
| **Calendar (shifts)** | Low | High | `expo-calendar` |
| **Haptic Feedback** | Low | Medium | `expo-haptics` |
| **Face ID / Touch ID** | Low | High | `expo-local-authentication` |
| **Push Notifications (rich)** | Medium | High | `expo-notifications` |
| **Sharing (share sheet)** | Low | Medium | `expo-sharing` |
| **WhatsApp deep links** | Low | Medium | `Linking` (built-in) |

### Nice-to-Have (Phase 2)

| Integration | Effort | Impact | Package |
|-------------|--------|--------|---------|
| **Live Activities (shift timer)** | Medium | High | `expo-live-activity` |
| **Widgets (next shift)** | Medium-High | High | `@bacons/apple-targets` |
| **Reminders (tasks)** | Low | Low | `expo-calendar` |
| **Siri Shortcuts** | Medium | Medium | `react-native-siri-shortcut` |
| **Notes (via share)** | Low | Low | `expo-sharing` |
| **Liquid Glass adaptation** | Low | Medium | `expo-blur` + native navigation |

### Future/Evaluate (Phase 3+)

| Integration | Effort | Impact | Package |
|-------------|--------|--------|---------|
| **Apple Watch** | Very High | Medium | `@bacons/apple-targets` + native Swift |
| **App Clips (NFC clock-in)** | High | Low-Medium | `@bacons/apple-targets` |
| **Health/Fitness** | Medium | Low | `react-native-health` |
| **WhatsApp Business API** | Medium | Medium | Server-side (not mobile) |

### Expo Workflow Compatibility Summary

| Integration | Managed Workflow | Config Plugin Needed | Native Code Needed |
|-------------|-----------------|---------------------|-------------------|
| Calendar | Yes | Yes (built-in) | No |
| Reminders | Yes | Yes (built-in) | No |
| Haptics | Yes | No | No |
| Face ID | Yes | Yes (built-in) | No |
| Push Notifications | Yes | Yes (built-in) | No |
| Sharing | Yes | No | No |
| Blur/Glass effects | Yes | No | No |
| Live Activities | Dev build only | Yes | Swift widget code |
| Widgets | Dev build only | Yes | Swift widget code |
| Siri Shortcuts | Dev build only | Custom or manual | ObjC/Swift bridging |
| Apple Watch | Dev build only | Yes | Full Swift app |
| App Clips | Dev build only | Yes | Minimal Swift |
| HealthKit | Dev build only | Yes | No (wrapper handles) |

### Development Build Requirement

Features marked "Dev build only" cannot be tested in Expo Go. Use EAS Build or local `npx expo prebuild` + Xcode for these features. All Phase 1 features work in Expo Go except rich push notifications (which need device testing regardless).

---

## Appendix A: Recommended `app.json` Plugin Configuration (Phase 1)

```json
{
  "expo": {
    "plugins": [
      ["expo-calendar", {
        "calendarPermission": "GrandCafe Cheers adds your work shifts to your calendar",
        "remindersPermission": "GrandCafe Cheers adds work tasks to your reminders"
      }],
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#F59E0B"
      }],
      ["expo-local-authentication", {
        "faceIDPermission": "GrandCafe Cheers uses Face ID to verify your identity for clock-in"
      }]
    ],
    "ios": {
      "infoPlist": {
        "LSApplicationQueriesSchemes": ["whatsapp", "whatsapp-business"]
      }
    }
  }
}
```

## Appendix B: Recommended `app.json` Plugin Configuration (Phase 2)

```json
{
  "expo": {
    "plugins": [
      ["expo-calendar", {
        "calendarPermission": "GrandCafe Cheers adds your work shifts to your calendar",
        "remindersPermission": "GrandCafe Cheers adds work tasks to your reminders"
      }],
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#F59E0B"
      }],
      ["expo-local-authentication", {
        "faceIDPermission": "GrandCafe Cheers uses Face ID to verify your identity for clock-in"
      }],
      ["expo-live-activity", {
        "enablePushNotifications": true
      }],
      "@bacons/apple-targets"
    ],
    "ios": {
      "infoPlist": {
        "LSApplicationQueriesSchemes": ["whatsapp", "whatsapp-business"]
      },
      "appleTeamId": "YOUR_TEAM_ID"
    }
  }
}
```
