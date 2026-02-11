# GrandCafe Cheers - Resend Email Integration

This directory contains the Resend email integration for the GrandCafe Cheers platform. All transactional emails and newsletters are sent through the Resend API.

## 📦 Setup

### 1. Install Dependencies

The Resend SDK is already included in `package.json`:

```json
{
  "dependencies": {
    "resend": "^3.0.0"
  }
}
```

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx

# Email sender address (must be verified domain)
EMAIL_FROM=noreply@cheersmallorca.com

# App URL for unsubscribe links
NEXT_PUBLIC_APP_URL=https://app.cheersmallorca.com
```

### 3. Verify Your Domain

Before sending emails, you must verify your domain with Resend:

1. Go to https://resend.com/domains
2. Add your domain (e.g., `cheersmallorca.com`)
3. Add the provided DNS records to your domain registrar
4. Wait for verification (usually takes a few minutes)

**For Development/Testing:**

You can use Resend's test mode which allows sending to your own email address without domain verification. Just use your verified email in the `to` field.

## 🚀 Usage

### Import Functions

```typescript
import {
  sendReservationConfirmation,
  sendNewsletterEmail,
  sendShiftNotification,
  sendStockAlert,
} from '@/lib/email/resend'
```

### 1. Reservation Confirmation Emails

Send confirmation emails when customers make reservations:

```typescript
const result = await sendReservationConfirmation({
  to: 'customer@example.com',
  guest_name: 'Jan de Vries',
  reservation_id: 'uuid',
  party_size: 4,
  reservation_date: '2024-07-15',
  start_time: '19:30',
  table_number: '12',
  section: 'Terrace',
  special_requests: 'Birthday celebration',
  language: 'nl', // 'en' | 'nl' | 'es' | 'de'
})

if (result.success) {
  console.log('Email sent! Message ID:', result.messageId)
} else {
  console.error('Failed to send email:', result.error)
}
```

**Supported Languages:**
- `en` - English
- `nl` - Dutch
- `es` - Spanish
- `de` - German

### 2. Newsletter Emails

Send marketing newsletters to subscribers:

```typescript
// Simple newsletter with plain text
const result = await sendNewsletterEmail({
  to: 'subscriber@example.com',
  subject: '🏖️ Summer Special Menu',
  content: 'Check out our new menu...',
  subscriber_name: 'Maria', // Optional
  subscriber_id: 'uuid',
  language: 'en', // 'en' | 'nl' | 'es'
})

// Newsletter with custom HTML
const result = await sendNewsletterEmail({
  to: 'subscriber@example.com',
  subject: '🏖️ Summer Special Menu',
  content: 'Fallback text for plain email clients',
  html_content: '<div><h1>Custom HTML</h1></div>',
  subscriber_name: 'Maria',
  subscriber_id: 'uuid',
  language: 'en',
})
```

**Features:**
- Auto-generates beautiful HTML templates
- Includes unsubscribe link
- Multi-language support (EN/NL/ES)
- Social media links
- Restaurant branding

### 3. Shift Notification Emails

Notify employees about their scheduled shifts:

```typescript
const result = await sendShiftNotification({
  to: 'employee@example.com',
  employee_name: 'Sofia Martinez',
  shift_date: 'Saturday, July 20, 2024',
  start_time: '17:00',
  end_time: '01:00',
  role: 'Bartender',
  language: 'es', // 'en' | 'nl' | 'es'
})
```

### 4. Stock Alert Emails

Send low stock alerts to managers:

```typescript
const result = await sendStockAlert({
  to: 'manager@cheersmallorca.com',
  product_name: 'Estrella Damm (Keg)',
  current_stock: 2,
  min_stock: 5,
  unit: 'kegs',
  language: 'en', // 'en' | 'nl' | 'es'
})
```

## 📧 Email Templates

All email templates are responsive and include:

- **Mobile-first design** - Looks great on all devices
- **Dark/light mode compatible** - Respects user preferences
- **Accessible** - Proper semantic HTML
- **Branded** - GrandCafe Cheers colors and logo
- **Multi-language** - Full translations for NL/EN/ES

### Template Structure

```
┌─────────────────────────────┐
│   🏖️ GrandCafe Cheers      │
│   El Arenal, Mallorca       │
├─────────────────────────────┤
│                             │
│   Email Content Here        │
│                             │
├─────────────────────────────┤
│   Social Links              │
│   📱 Instagram 👍 Facebook  │
├─────────────────────────────┤
│   Footer / Contact Info     │
│   Unsubscribe Link          │
└─────────────────────────────┘
```

## 🔄 Integration with API Routes

### Newsletter Sending API

The newsletter send API route uses the `sendNewsletterEmail` function:

```typescript
// src/app/api/marketing/newsletters/[id]/send/route.ts

import { sendNewsletterEmail } from '@/lib/email/resend'

export async function POST(request: NextRequest) {
  // Get newsletter and subscribers from database
  const newsletter = await getNewsletter(id)
  const subscribers = await getSubscribers(newsletter.segment)

  // Send to all subscribers
  const results = await Promise.allSettled(
    subscribers.map((sub) =>
      sendNewsletterEmail({
        to: sub.email,
        subject: newsletter.subject,
        content: newsletter.content,
        html_content: newsletter.html_content,
        subscriber_name: sub.name,
        subscriber_id: sub.id,
        language: sub.language,
      })
    )
  )

  // Handle results...
}
```

## ⚠️ Error Handling

All email functions return an `EmailResult` type:

```typescript
interface EmailResult {
  success: boolean
  messageId?: string // Resend message ID (for tracking)
  error?: string // Error message if failed
}
```

**Example error handling:**

```typescript
const result = await sendNewsletterEmail(data)

if (!result.success) {
  // Log error
  console.error('Email failed:', result.error)

  // Update database status
  await updateNewsletterStatus(newsletterId, 'failed')

  // Send to monitoring system (e.g., Sentry)
  captureException(new Error(result.error))

  // Retry logic (optional)
  await retryEmailSend(data)
}
```

## 🧪 Testing

### Development Testing

For development, you can test emails without sending to real recipients:

1. **Use your own email address** - Resend allows sending to verified email addresses in test mode

2. **Mock the Resend client** - In tests, mock the Resend SDK:

```typescript
// vitest example
import { vi } from 'vitest'

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      }),
    },
  })),
}))
```

3. **Check API key** - If `RESEND_API_KEY` is not set, the newsletter send route will skip email sending but still update the database (for testing).

### Production Testing

Before going live:

1. ✅ Verify domain in Resend dashboard
2. ✅ Test each email type (reservation, newsletter, shift, stock alert)
3. ✅ Verify unsubscribe links work
4. ✅ Check all languages (EN/NL/ES/DE)
5. ✅ Test on multiple email clients (Gmail, Outlook, Apple Mail)
6. ✅ Verify mobile responsiveness

## 📊 Monitoring & Analytics

### Resend Dashboard

Monitor email delivery in the Resend dashboard:

- **Sent emails** - Track all sent messages
- **Delivery status** - See bounces, opens, clicks
- **Domain health** - Monitor DNS and reputation

### Application Monitoring

Log all email sends for debugging:

```typescript
const result = await sendNewsletterEmail(data)

// Log to your monitoring system
logEmailSend({
  type: 'newsletter',
  recipient: data.to,
  success: result.success,
  messageId: result.messageId,
  error: result.error,
  timestamp: new Date(),
})
```

## 🔐 Security Best Practices

1. **Never expose API key** - Keep `RESEND_API_KEY` in `.env` and never commit to git

2. **Validate recipient emails** - Always validate email format before sending

3. **Rate limiting** - Implement rate limits to prevent abuse

4. **Unsubscribe compliance** - All marketing emails include unsubscribe links (GDPR/CAN-SPAM compliant)

5. **Data sanitization** - Sanitize user input before including in emails

## 🌍 Multi-language Support

All emails support multiple languages:

- **Reservation emails**: EN, NL, ES, DE
- **Newsletter emails**: EN, NL, ES
- **Shift notifications**: EN, NL, ES
- **Stock alerts**: EN, NL, ES

Language is determined by:
1. User profile language preference
2. Newsletter subscriber language preference
3. Fallback to English if not specified

## 📚 API Reference

### `sendReservationConfirmation(data)`

Send reservation confirmation email.

**Parameters:**
- `to` (string) - Recipient email
- `guest_name` (string) - Guest name
- `reservation_id` (string) - Reservation UUID
- `party_size` (number) - Number of guests
- `reservation_date` (string) - Date (YYYY-MM-DD)
- `start_time` (string) - Time (HH:MM)
- `table_number?` (string) - Optional table number
- `section?` (string) - Optional section name
- `special_requests?` (string) - Optional special requests
- `language` ('en' | 'nl' | 'es' | 'de') - Email language

**Returns:** `Promise<EmailResult>`

---

### `sendNewsletterEmail(data)`

Send newsletter email to subscriber.

**Parameters:**
- `to` (string) - Recipient email
- `subject` (string) - Email subject
- `content` (string) - Email content (plain text or markdown)
- `html_content?` (string) - Optional custom HTML
- `subscriber_name?` (string) - Optional subscriber name
- `subscriber_id` (string) - Subscriber UUID (for unsubscribe)
- `language` ('en' | 'nl' | 'es') - Email language

**Returns:** `Promise<EmailResult>`

---

### `sendShiftNotification(data)`

Send shift notification to employee.

**Parameters:**
- `to` (string) - Recipient email
- `employee_name` (string) - Employee name
- `shift_date` (string) - Formatted date
- `start_time` (string) - Start time (HH:MM)
- `end_time` (string) - End time (HH:MM)
- `role` (string) - Employee role
- `language` ('en' | 'nl' | 'es') - Email language

**Returns:** `Promise<EmailResult>`

---

### `sendStockAlert(data)`

Send stock alert to manager.

**Parameters:**
- `to` (string) - Recipient email
- `product_name` (string) - Product name
- `current_stock` (number) - Current stock level
- `min_stock` (number) - Minimum stock level
- `unit` (string) - Stock unit (e.g., 'kegs', 'bottles')
- `language` ('en' | 'nl' | 'es') - Email language

**Returns:** `Promise<EmailResult>`

---

## 🆘 Troubleshooting

### Emails not sending

1. **Check API key** - Verify `RESEND_API_KEY` is set correctly
2. **Check domain** - Ensure domain is verified in Resend
3. **Check logs** - Look for errors in console/logs
4. **Check Resend dashboard** - See delivery status

### Emails going to spam

1. **Verify domain** - Add SPF/DKIM records
2. **Warm up domain** - Start with small volumes
3. **Avoid spam triggers** - Don't use ALL CAPS, excessive emojis
4. **Include unsubscribe** - Always include unsubscribe link

### Wrong language

1. **Check language parameter** - Ensure correct language code
2. **Check fallback** - Falls back to English if invalid language

## 📞 Support

- **Resend Documentation**: https://resend.com/docs
- **Resend Support**: support@resend.com
- **GrandCafe Cheers Dev Team**: Internal Slack channel

## 📝 License

Copyright © 2024 GrandCafe Cheers Mallorca. All rights reserved.
