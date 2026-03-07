/**
 * WhatsApp Cloud API client
 * Sends schedule notifications and booking confirmations via WhatsApp.
 * Gracefully skips when WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set.
 */

export interface WhatsAppMessage {
  to: string // Phone number in E.164 format (+34612345678)
  type: 'text' | 'template'
  body?: string
  template?: {
    name: string
    language: string
    components?: WhatsAppTemplateComponent[]
  }
}

export interface WhatsAppTemplateComponent {
  type: 'body' | 'header' | 'button'
  parameters: Array<{ type: 'text'; text: string }>
}

export interface WhatsAppSendResult {
  success: boolean
  message_id?: string
  skipped?: boolean
  reason?: string
  error?: string
}

const WHATSAPP_API_VERSION = 'v20.0'

/**
 * Send a WhatsApp message via Cloud API.
 * Returns a result object — never throws.
 */
export async function sendWhatsApp(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    console.warn('[WhatsApp] Skipping — WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set')
    return {
      success: false,
      skipped: true,
      reason: 'WhatsApp not configured (WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing)',
    }
  }

  try {
    const body =
      message.type === 'template'
        ? {
            messaging_product: 'whatsapp',
            to: message.to,
            type: 'template',
            template: {
              name: message.template!.name,
              language: { code: message.template!.language },
              components: message.template!.components || [],
            },
          }
        : {
            messaging_product: 'whatsapp',
            to: message.to,
            type: 'text',
            text: { body: message.body! },
          }

    const res = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      const errorMsg = data?.error?.message || 'WhatsApp API error'
      console.error('[WhatsApp] API error:', errorMsg)
      return { success: false, error: errorMsg }
    }

    return {
      success: true,
      message_id: data?.messages?.[0]?.id,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[WhatsApp] Send failed:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * Send a schedule notification to an employee.
 * Uses text message (template recommended for production).
 */
export async function sendScheduleNotification(params: {
  phone: string
  employeeName: string
  date: string
  startTime: string
  endTime: string
  role: string
}): Promise<WhatsAppSendResult> {
  const { phone, employeeName, date, startTime, endTime, role } = params
  const body = `Hi ${employeeName}! Your shift at GrandCafe Cheers:\n📅 ${date}\n⏰ ${startTime} – ${endTime}\n💼 ${role}\n\nReply CONFIRM or contact your manager for changes.`

  return sendWhatsApp({ to: phone, type: 'text', body })
}

/**
 * Send a booking confirmation to a guest.
 */
export async function sendBookingConfirmation(params: {
  phone: string
  guestName: string
  date: string
  time: string
  partySize: number
  confirmationCode?: string
}): Promise<WhatsAppSendResult> {
  const { phone, guestName, date, time, partySize, confirmationCode } = params
  const codeLine = confirmationCode ? `\n📋 Confirmation: ${confirmationCode}` : ''
  const body = `Hi ${guestName}! Your reservation at GrandCafe Cheers is confirmed:\n📅 ${date} at ${time}\n👥 ${partySize} guests${codeLine}\n\nWe look forward to seeing you! 🥂`

  return sendWhatsApp({ to: phone, type: 'text', body })
}
