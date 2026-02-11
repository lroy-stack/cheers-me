import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import webpush from 'web-push'

// Configure web-push (VAPID keys should be in environment variables)
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
const vapidSubject = process.env.NEXT_PUBLIC_APP_URL || 'mailto:noreply@cheersmallorca.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

// Validation schema for sending notifications
const sendNotificationSchema = z.object({
  user_ids: z.array(z.string().uuid()).optional(),
  type: z.enum([
    'schedule_published',
    'shift_assigned',
    'shift_changed',
    'shift_reminder',
    'swap_requested',
    'swap_approved',
    'swap_rejected',
    'clock_reminder',
    'system',
  ]),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  data: z.record(z.any()).optional(),
  action_url: z.string().optional(),
  send_push: z.boolean().default(true),
})

/**
 * POST /api/notifications/send
 * Send notifications to users (managers/admins only)
 */
export async function POST(request: NextRequest) {
  // Require manager or admin role
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()

  try {
    const body = await request.json()
    const validated = sendNotificationSchema.parse(body)

    // If no user_ids provided, send to all staff
    let targetUserIds = validated.user_ids || []

    if (targetUserIds.length === 0) {
      // Get all staff users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['manager', 'kitchen', 'bar', 'waiter', 'dj'])
        .eq('active', true)

      if (profiles) {
        targetUserIds = profiles.map((p) => p.id)
      }
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: 'No target users found' },
        { status: 400 }
      )
    }

    // Create notifications in database
    const notifications = targetUserIds.map((userId) => ({
      user_id: userId,
      type: validated.type,
      title: validated.title,
      body: validated.body,
      data: validated.data,
      action_url: validated.action_url,
    }))

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    // Send push notifications if enabled
    if (validated.send_push && vapidPublicKey && vapidPrivateKey) {
      // Get active push subscriptions for target users
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh_key, auth_key')
        .in('user_id', targetUserIds)
        .eq('active', true)

      if (subscriptions && subscriptions.length > 0) {
        const pushPromises = subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh_key,
                  auth: sub.auth_key,
                },
              },
              JSON.stringify({
                title: validated.title,
                body: validated.body,
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                data: {
                  url: validated.action_url || '/',
                  ...validated.data,
                },
              })
            )
          } catch (error) {
            console.error('Push notification failed:', error)
            // Mark subscription as inactive if it's gone (410 status)
            if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 410) {
              await supabase
                .from('push_subscriptions')
                .update({ active: false })
                .eq('endpoint', sub.endpoint)
            }
          }
        })

        await Promise.allSettled(pushPromises)
      }
    }

    return NextResponse.json({
      success: true,
      sent_to: targetUserIds.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid notification data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error sending notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
