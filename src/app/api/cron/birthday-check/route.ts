import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

/**
 * POST /api/cron/birthday-check
 * Daily cron: checks upcoming birthdays/anniversaries and sends personalized emails.
 * Called by Vercel Cron or external scheduler.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron endpoint not configured' }, { status: 503 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get customers with birthdays in the next 1 day (send day before)
  const { data: birthdayCustomers, error: bdError } = await supabase.rpc(
    'get_upcoming_birthdays',
    { days_ahead: 1 }
  )

  // Get customers with anniversaries in the next 1 day
  let anniversaryCustomers: Array<{ email: string; name: string }> | null = null
  let annError: unknown = null
  try {
    const annRes = await supabase.rpc('get_upcoming_anniversaries', { days_ahead: 1 })
    anniversaryCustomers = annRes.data
    annError = annRes.error
  } catch {
    annError = new Error('Function not available')
  }

  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.EMAIL_FROM || 'GrandCafe Cheers <noreply@cheersmallorca.com>'

  let birthdaysSent = 0
  let anniversariesSent = 0
  let errors: string[] = []

  if (resendKey && birthdayCustomers && !bdError) {
    const resend = new Resend(resendKey)

    for (const customer of birthdayCustomers) {
      if (!customer.email) continue

      try {
        await resend.emails.send({
          from: fromEmail,
          to: customer.email,
          subject: `Happy Birthday, ${customer.name}! 🎂`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #f59e0b;">Happy Birthday, ${customer.name}!</h1>
              <p>We at GrandCafe Cheers want to wish you a wonderful birthday!</p>
              <p>Come celebrate with us — we'd love to make your special day even more memorable.</p>
              <p>Book a table and enjoy a special birthday treat from our team.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://grandcafe-cheers-app.vercel.app'}/booking"
                 style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
                Book Your Birthday Table
              </a>
              <p style="margin-top: 24px; color: #666;">With love,<br>The GrandCafe Cheers Team</p>
            </div>
          `,
        })
        birthdaysSent++
      } catch (err) {
        errors.push(`Birthday email to ${customer.email}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
  }

  if (resendKey && anniversaryCustomers && !annError) {
    const resend = new Resend(resendKey)

    for (const customer of anniversaryCustomers) {
      if (!customer.email) continue

      try {
        await resend.emails.send({
          from: fromEmail,
          to: customer.email,
          subject: `Happy Anniversary, ${customer.name}! 🥂`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #f59e0b;">Happy Anniversary, ${customer.name}!</h1>
              <p>We at GrandCafe Cheers want to celebrate your special anniversary!</p>
              <p>Join us for an unforgettable evening — book a table and let us make this anniversary extra special.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://grandcafe-cheers-app.vercel.app'}/booking"
                 style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
                Book Your Anniversary Dinner
              </a>
              <p style="margin-top: 24px; color: #666;">With love,<br>The GrandCafe Cheers Team</p>
            </div>
          `,
        })
        anniversariesSent++
      } catch (err) {
        errors.push(`Anniversary email to ${customer.email}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
  }

  return NextResponse.json({
    success: true,
    birthdaysSent,
    anniversariesSent,
    skipped: !resendKey ? 'RESEND_API_KEY not configured' : undefined,
    errors: errors.length > 0 ? errors : undefined,
  })
}
