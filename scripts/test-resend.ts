#!/usr/bin/env tsx
/**
 * GrandCafe Cheers - Resend Email Integration Test Script
 *
 * This script tests the Resend email integration by sending test emails.
 *
 * Usage:
 *   1. Set up your .env.local file with RESEND_API_KEY and EMAIL_FROM
 *   2. Run: npx tsx scripts/test-resend.ts
 *
 * IMPORTANT: This will send REAL emails! Only run with test email addresses.
 */

import 'dotenv/config'

// Dynamically import the resend functions
async function testResendIntegration() {
  console.log('🧪 Testing Resend Email Integration...\n')

  // Check environment variables
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not set in environment variables')
    console.log('   Please add RESEND_API_KEY to your .env.local file')
    process.exit(1)
  }

  if (!process.env.EMAIL_FROM) {
    console.warn('⚠️  EMAIL_FROM not set, will use default')
  }

  console.log('✅ Environment variables configured\n')

  // Import after env check
  const {
    sendReservationConfirmation,
    sendNewsletterEmail,
    sendShiftNotification,
    sendStockAlert,
  } = await import('../src/lib/email/resend')

  // Get test email from command line or use default
  const testEmail = process.argv[2] || 'test@example.com'

  console.log(`📧 Test emails will be sent to: ${testEmail}\n`)
  console.log('⏳ Sending test emails...\n')

  // Test 1: Newsletter Email
  console.log('1️⃣  Testing Newsletter Email...')
  const newsletterResult = await sendNewsletterEmail({
    to: testEmail,
    subject: '🏖️ Test Newsletter - GrandCafe Cheers',
    content: `This is a test newsletter email to verify the Resend integration.

Our new summer menu is here!

🍔 Premium Beach Burgers
🍺 22 Craft Beers on Tap
🍹 Tropical Cocktails
🥗 Fresh Mediterranean Salads

Visit us at El Arenal, Mallorca!`,
    subscriber_name: 'Test User',
    subscriber_id: '00000000-0000-0000-0000-000000000001',
    language: 'en',
  })

  if (newsletterResult.success) {
    console.log(`   ✅ Newsletter sent! Message ID: ${newsletterResult.messageId}`)
  } else {
    console.error(`   ❌ Newsletter failed: ${newsletterResult.error}`)
  }

  // Test 2: Shift Notification
  console.log('\n2️⃣  Testing Shift Notification Email...')
  const shiftResult = await sendShiftNotification({
    to: testEmail,
    employee_name: 'Test Employee',
    shift_date: 'Saturday, July 20, 2024',
    start_time: '17:00',
    end_time: '01:00',
    role: 'Bartender',
    language: 'en',
  })

  if (shiftResult.success) {
    console.log(`   ✅ Shift notification sent! Message ID: ${shiftResult.messageId}`)
  } else {
    console.error(`   ❌ Shift notification failed: ${shiftResult.error}`)
  }

  // Test 3: Stock Alert
  console.log('\n3️⃣  Testing Stock Alert Email...')
  const stockResult = await sendStockAlert({
    to: testEmail,
    product_name: 'Estrella Damm (Keg)',
    current_stock: 2,
    min_stock: 5,
    unit: 'kegs',
    language: 'en',
  })

  if (stockResult.success) {
    console.log(`   ✅ Stock alert sent! Message ID: ${stockResult.messageId}`)
  } else {
    console.error(`   ❌ Stock alert failed: ${stockResult.error}`)
  }

  // Test 4: Reservation Confirmation
  console.log('\n4️⃣  Testing Reservation Confirmation Email...')
  const reservationResult = await sendReservationConfirmation({
    to: testEmail,
    guest_name: 'Test Guest',
    reservation_id: '00000000-0000-0000-0000-000000000002',
    party_size: 4,
    reservation_date: '2024-07-15',
    start_time: '19:30',
    table_number: '12',
    section: 'Terrace',
    special_requests: 'Test reservation',
    language: 'en',
  })

  if (reservationResult.success) {
    console.log(`   ✅ Reservation confirmation sent! Message ID: ${reservationResult.messageId}`)
  } else {
    console.error(`   ❌ Reservation confirmation failed: ${reservationResult.error}`)
  }

  // Summary
  const results = [newsletterResult, shiftResult, stockResult, reservationResult]
  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Summary')
  console.log('='.repeat(50))
  console.log(`✅ Successful: ${successful}/4`)
  console.log(`❌ Failed: ${failed}/4`)

  if (failed === 0) {
    console.log('\n🎉 All email tests passed! Resend integration is working correctly.')
  } else {
    console.log('\n⚠️  Some email tests failed. Check the errors above.')
    process.exit(1)
  }
}

// Run the tests
testResendIntegration().catch((error) => {
  console.error('\n❌ Fatal error running tests:', error)
  process.exit(1)
})
