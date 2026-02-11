import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for unsubscribe request
const unsubscribeSchema = z.object({
  email: z.string().email(),
})

/**
 * POST /api/marketing/subscribers/unsubscribe
 * Public endpoint for unsubscribing from newsletter
 * No authentication required - this is accessed via email unsubscribe links
 *
 * Security: Uses email matching only. Consider adding a signed token in production.
 */
export async function POST(request: NextRequest) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = unsubscribeSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Find subscriber by email
  const { data: subscriber } = await supabase
    .from('newsletter_subscribers')
    .select('id, is_active')
    .eq('email', validation.data.email)
    .single()

  if (!subscriber) {
    return NextResponse.json(
      { error: 'Email not found in subscriber list' },
      { status: 404 }
    )
  }

  if (!subscriber.is_active) {
    return NextResponse.json(
      { message: 'Already unsubscribed' },
      { status: 200 }
    )
  }

  // Unsubscribe user
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq('id', subscriber.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Successfully unsubscribed from newsletter',
  }, { status: 200 })
}

/**
 * GET /api/marketing/subscribers/unsubscribe
 * Public endpoint for one-click unsubscribe via email link
 * Usage: /api/marketing/subscribers/unsubscribe?email=user@example.com
 *
 * Returns HTML page confirming unsubscription
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribe - GrandCafe Cheers</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>Invalid Unsubscribe Link</h1>
          <p class="error">Email parameter is missing.</p>
        </body>
      </html>
      `,
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    )
  }

  // Validate email format
  const emailValidation = z.string().email().safeParse(email)
  if (!emailValidation.success) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribe - GrandCafe Cheers</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>Invalid Email</h1>
          <p class="error">The provided email address is not valid.</p>
        </body>
      </html>
      `,
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    )
  }

  const supabase = await createClient()

  // Find subscriber by email
  const { data: subscriber } = await supabase
    .from('newsletter_subscribers')
    .select('id, is_active')
    .eq('email', email)
    .single()

  if (!subscriber) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribe - GrandCafe Cheers</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .info { color: #2563eb; }
          </style>
        </head>
        <body>
          <h1>Email Not Found</h1>
          <p class="info">This email address is not in our subscriber list.</p>
        </body>
      </html>
      `,
      { status: 404, headers: { 'Content-Type': 'text/html' } }
    )
  }

  if (!subscriber.is_active) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Already Unsubscribed - GrandCafe Cheers</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { color: #16a34a; }
          </style>
        </head>
        <body>
          <h1>Already Unsubscribed</h1>
          <p class="success">This email address has already been unsubscribed from our newsletter.</p>
          <p>If you'd like to subscribe again, please visit our website.</p>
        </body>
      </html>
      `,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )
  }

  // Unsubscribe user
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq('id', subscriber.id)

  if (error) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribe Error - GrandCafe Cheers</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>Unsubscribe Failed</h1>
          <p class="error">An error occurred while unsubscribing. Please try again later.</p>
        </body>
      </html>
      `,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    )
  }

  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Unsubscribed - GrandCafe Cheers</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .success { color: #16a34a; }
          .info { color: #64748b; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>✓ Successfully Unsubscribed</h1>
        <p class="success">You have been unsubscribed from the GrandCafe Cheers newsletter.</p>
        <p class="info">We're sorry to see you go. If you change your mind, you can always subscribe again on our website.</p>
        <p class="info">Thank you for being part of our community! 🍻</p>
      </body>
    </html>
    `,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )
}
