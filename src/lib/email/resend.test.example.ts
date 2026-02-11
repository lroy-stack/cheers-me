/**
 * GrandCafe Cheers - Resend Email Integration Test Examples
 *
 * This file contains example usage of the Resend email functions.
 * To run actual tests, you'll need to:
 * 1. Set up RESEND_API_KEY in .env
 * 2. Set up EMAIL_FROM in .env
 * 3. Verify your sending domain with Resend
 *
 * NOTE: This is an example file showing usage patterns.
 * For actual tests, use Vitest or Jest with proper mocking.
 */

import {
  sendReservationConfirmation,
  sendNewsletterEmail,
  sendShiftNotification,
  sendStockAlert,
} from './resend'

// ============================================================================
// EXAMPLE 1: Reservation Confirmation Email
// ============================================================================

async function exampleReservationConfirmation() {
  const result = await sendReservationConfirmation({
    to: 'customer@example.com',
    guest_name: 'Jan de Vries',
    reservation_id: '123e4567-e89b-12d3-a456-426614174000',
    party_size: 4,
    reservation_date: '2024-07-15',
    start_time: '19:30',
    table_number: '12',
    section: 'Terrace',
    special_requests: 'Birthday celebration, would appreciate a table near the beach',
    language: 'nl',
  })

  console.log('Reservation confirmation result:', result)
  // Expected output:
  // {
  //   success: true,
  //   messageId: 're_...'
  // }
}

// ============================================================================
// EXAMPLE 2: Newsletter Email
// ============================================================================

async function exampleNewsletterEmail() {
  // Example 1: Simple newsletter with plain text content
  const result1 = await sendNewsletterEmail({
    to: 'subscriber@example.com',
    subject: '🏖️ Summer Special Menu - Now Available!',
    content: `Hello beach lovers!

We're excited to announce our new Summer Special Menu, featuring:

🍔 Premium Beach Burgers
🍺 22 Craft Beers on Tap
🍹 Tropical Cocktails
🥗 Fresh Mediterranean Salads

Visit us at El Arenal and enjoy our beachfront dining experience!

Open daily from 10:30 until late.

Cheers,
The GrandCafe Cheers Team`,
    subscriber_name: 'Maria',
    subscriber_id: '123e4567-e89b-12d3-a456-426614174001',
    language: 'en',
  })

  console.log('Newsletter result (plain text):', result1)

  // Example 2: Newsletter with custom HTML content
  const customHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #d97706;">🎵 DJ Night Every Friday!</h1>
      <p>Join us for amazing music and drinks!</p>
      <img src="https://example.com/dj-night.jpg" alt="DJ Night" style="max-width: 100%;">
      <a href="https://cheersmallorca.com/events" style="
        display: inline-block;
        background-color: #f59e0b;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        margin: 20px 0;
      ">View Events</a>
    </div>
  `

  const result2 = await sendNewsletterEmail({
    to: 'subscriber@example.com',
    subject: '🎵 DJ Night Every Friday at Cheers!',
    content: 'Join us for amazing music and drinks!', // Fallback for text version
    html_content: customHTML,
    subscriber_name: 'Klaus',
    subscriber_id: '123e4567-e89b-12d3-a456-426614174002',
    language: 'en',
  })

  console.log('Newsletter result (custom HTML):', result2)
}

// ============================================================================
// EXAMPLE 3: Shift Notification Email
// ============================================================================

async function exampleShiftNotification() {
  const result = await sendShiftNotification({
    to: 'employee@example.com',
    employee_name: 'Sofia Martinez',
    shift_date: 'Saturday, July 20, 2024',
    start_time: '17:00',
    end_time: '01:00',
    role: 'Bartender',
    language: 'es',
  })

  console.log('Shift notification result:', result)
}

// ============================================================================
// EXAMPLE 4: Stock Alert Email
// ============================================================================

async function exampleStockAlert() {
  const result = await sendStockAlert({
    to: 'manager@cheersmallorca.com',
    product_name: 'Estrella Damm (Keg)',
    current_stock: 2,
    min_stock: 5,
    unit: 'kegs',
    language: 'en',
  })

  console.log('Stock alert result:', result)
}

// ============================================================================
// EXAMPLE 5: Bulk Newsletter Sending (Multiple Subscribers)
// ============================================================================

async function exampleBulkNewsletter() {
  const subscribers = [
    { email: 'subscriber1@example.com', name: 'John', language: 'en' as const, id: 'uuid-1' },
    { email: 'subscriber2@example.com', name: 'Maria', language: 'es' as const, id: 'uuid-2' },
    { email: 'subscriber3@example.com', name: 'Hans', language: 'nl' as const, id: 'uuid-3' },
  ]

  const newsletterContent = {
    en: 'Check out our new summer menu!',
    es: '¡Echa un vistazo a nuestro nuevo menú de verano!',
    nl: 'Bekijk onze nieuwe zomermenu!',
  }

  const subject = {
    en: '🏖️ New Summer Menu Available',
    es: '🏖️ Nuevo Menú de Verano Disponible',
    nl: '🏖️ Nieuw Zomermenu Beschikbaar',
  }

  // Send to all subscribers in parallel
  const results = await Promise.allSettled(
    subscribers.map((subscriber) =>
      sendNewsletterEmail({
        to: subscriber.email,
        subject: subject[subscriber.language],
        content: newsletterContent[subscriber.language],
        subscriber_name: subscriber.name,
        subscriber_id: subscriber.id,
        language: subscriber.language,
      })
    )
  )

  const successful = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  console.log(`Bulk send results: ${successful} successful, ${failed} failed`)
  console.log('Detailed results:', results)
}

// ============================================================================
// EXAMPLE 6: Error Handling
// ============================================================================

async function exampleErrorHandling() {
  // Example with invalid email address
  const result = await sendNewsletterEmail({
    to: 'invalid-email', // Invalid email format
    subject: 'Test',
    content: 'Test content',
    subscriber_id: 'uuid-test',
    language: 'en',
  })

  if (!result.success) {
    console.error('Email sending failed:', result.error)
    // Handle error appropriately:
    // - Log to monitoring system
    // - Update newsletter status to 'failed'
    // - Retry with exponential backoff
    // - Alert admin
  } else {
    console.log('Email sent successfully:', result.messageId)
  }
}

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================

export const examples = {
  exampleReservationConfirmation,
  exampleNewsletterEmail,
  exampleShiftNotification,
  exampleStockAlert,
  exampleBulkNewsletter,
  exampleErrorHandling,
}

// Run examples (uncomment to test)
// exampleReservationConfirmation()
// exampleNewsletterEmail()
// exampleShiftNotification()
// exampleStockAlert()
// exampleBulkNewsletter()
// exampleErrorHandling()
