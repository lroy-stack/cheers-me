import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { sendNewsletterEmail } from '@/lib/email/resend'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/marketing/newsletters/[id]/send
 * Send a newsletter to subscribers (managers/admins only)
 * This will:
 * 1. Get all active subscribers matching the newsletter's segment
 * 2. Send email to each subscriber via Resend API
 * 3. Update newsletter status to 'sent'
 * 4. Record recipient count and sent timestamp
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get newsletter
  const { data: newsletter, error: newsletterError } = await supabase
    .from('newsletters')
    .select('*')
    .eq('id', id)
    .single()

  if (newsletterError || !newsletter) {
    return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
  }

  // Check if already sent
  if (newsletter.status === 'sent') {
    return NextResponse.json(
      { error: 'Newsletter has already been sent' },
      { status: 400 }
    )
  }

  // Get subscribers based on segment
  let subscribersQuery = supabase
    .from('newsletter_subscribers')
    .select('*')
    .eq('is_active', true)

  // Apply segment filter
  switch (newsletter.segment) {
    case 'language_nl':
      subscribersQuery = subscribersQuery.eq('language', 'nl')
      break
    case 'language_en':
      subscribersQuery = subscribersQuery.eq('language', 'en')
      break
    case 'language_es':
      subscribersQuery = subscribersQuery.eq('language', 'es')
      break
    case 'vip':
      // Note: VIP filtering would require joining with customers table
      // For now, we'll send to all subscribers
      // TODO: Implement VIP filtering when CRM module is complete
      break
    case 'all':
    default:
      // No additional filter
      break
  }

  const { data: subscribers, error: subscribersError } = await subscribersQuery

  if (subscribersError) {
    return NextResponse.json(
      { error: 'Failed to fetch subscribers' },
      { status: 500 }
    )
  }

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json(
      { error: 'No active subscribers found for this segment' },
      { status: 400 }
    )
  }

  // Check if Resend API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email send')

    // Update newsletter status anyway for testing purposes
    const { error: updateError } = await supabase
      .from('newsletters')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: subscribers.length,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Newsletter marked as sent (email sending skipped - API key not configured)',
      recipients: subscribers.length,
    })
  }

  try {
    // Send emails using our Resend helper function
    const emailPromises = subscribers.map((subscriber) => {
      return sendNewsletterEmail({
        to: subscriber.email,
        subject: newsletter.subject,
        content: newsletter.content,
        html_content: newsletter.html_content || undefined,
        subscriber_name: subscriber.name || undefined,
        subscriber_id: subscriber.id,
        language: (subscriber.language as 'en' | 'nl' | 'es') || 'en',
      })
    })

    // Wait for all emails to be sent
    const results = await Promise.allSettled(emailPromises)

    // Count successes and failures based on EmailResult
    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length
    const failed = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    ).length

    // Update newsletter status
    const { error: updateError } = await supabase
      .from('newsletters')
      .update({
        status: failed > 0 && successful === 0 ? 'failed' : 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: successful,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update newsletter status:', updateError)
    }

    return NextResponse.json({
      success: true,
      message: `Newsletter sent successfully to ${successful} recipients`,
      recipients: successful,
      failed,
    })
  } catch (error) {
    console.error('Error sending newsletter:', error)

    // Mark as failed
    await supabase
      .from('newsletters')
      .update({ status: 'failed' })
      .eq('id', id)

    return NextResponse.json(
      { error: 'Failed to send newsletter' },
      { status: 500 }
    )
  }
}
