import { Resend } from 'resend'

// Lazy-initialized Resend client (avoids crash when RESEND_API_KEY is not set)
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

// Email sender configuration
const EMAIL_FROM = process.env.EMAIL_FROM || 'GrandCafe Cheers <noreply@cheersmallorca.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheersmallorca.com'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

interface ReservationConfirmationEmailData {
  to: string
  guest_name: string
  reservation_id: string
  party_size: number
  reservation_date: string
  start_time: string
  table_number?: string
  section?: string
  special_requests?: string
  language: 'en' | 'nl' | 'es' | 'de'
}

interface NewsletterEmailData {
  to: string
  subject: string
  content: string
  html_content?: string
  subscriber_name?: string
  subscriber_id: string
  language: 'en' | 'nl' | 'es'
}

interface ShiftNotificationEmailData {
  to: string
  employee_name: string
  shift_date: string
  start_time: string
  end_time: string
  role: string
  language: 'en' | 'nl' | 'es'
}

interface StockAlertEmailData {
  to: string
  product_name: string
  current_stock: number
  min_stock: number
  unit: string
  language: 'en' | 'nl' | 'es'
}

// ============================================================================
// RESERVATION CONFIRMATION EMAILS
// ============================================================================

/**
 * Send reservation confirmation email to guest
 */
export async function sendReservationConfirmation(
  data: ReservationConfirmationEmailData
): Promise<EmailResult> {
  try {
    const resend = getResend()
    if (!resend) {
      console.warn('RESEND_API_KEY not configured, skipping reservation confirmation email')
      return { success: false, error: 'Email service not configured' }
    }

    const subject = getEmailSubject(data.language)
    const htmlContent = getEmailHTML(data)
    const textContent = getEmailText(data)

    const response = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject,
      html: htmlContent,
      text: textContent,
    })

    if (response.error) {
      console.error('Resend error:', response.error)
      return {
        success: false,
        error: response.error.message,
      }
    }

    return {
      success: true,
      messageId: response.data?.id,
    }
  } catch (error) {
    console.error('Error sending reservation confirmation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get email subject based on language
 */
function getEmailSubject(language: string): string {
  const subjects: Record<string, string> = {
    en: '🍽️ Reservation Confirmation - GrandCafe Cheers',
    nl: '🍽️ Reserveringsbevestiging - GrandCafe Cheers',
    es: '🍽️ Confirmación de Reserva - GrandCafe Cheers',
    de: '🍽️ Reservierungsbestätigung - GrandCafe Cheers',
  }
  return subjects[language] || subjects.en
}

/**
 * Generate HTML email content
 */
function getEmailHTML(data: ReservationConfirmationEmailData): string {
  const translations = getTranslations(data.language)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #d97706;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
      font-size: 14px;
    }
    .status-badge {
      display: inline-block;
      background-color: #fef3c7;
      color: #92400e;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin: 20px 0;
    }
    .details-box {
      background-color: #f9fafb;
      border-left: 4px solid #d97706;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #6b7280;
      font-weight: 500;
    }
    .detail-value {
      font-weight: 600;
      color: #111827;
    }
    .special-requests {
      background-color: #fef3c7;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .info-text {
      color: #6b7280;
      font-size: 14px;
      margin: 15px 0;
    }
    .contact-info {
      background-color: #eff6ff;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    .button {
      display: inline-block;
      background-color: #d97706;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏖️ GrandCafe Cheers</div>
      <div class="subtitle">El Arenal, Platja de Palma, Mallorca</div>
    </div>

    <h1 style="color: #111827; font-size: 24px; margin-bottom: 10px;">
      ${translations.greeting}, ${data.guest_name}!
    </h1>

    <p style="font-size: 16px; color: #4b5563;">
      ${translations.confirmationMessage}
    </p>

    <div style="text-align: center;">
      <span class="status-badge">${translations.pendingStatus}</span>
    </div>

    <div class="details-box">
      <h2 style="margin-top: 0; color: #111827; font-size: 18px;">
        ${translations.reservationDetails}
      </h2>

      <div class="detail-row">
        <span class="detail-label">${translations.confirmationNumber}:</span>
        <span class="detail-value">#${data.reservation_id.substring(0, 8).toUpperCase()}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">${translations.date}:</span>
        <span class="detail-value">${formatDate(data.reservation_date, data.language)}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">${translations.time}:</span>
        <span class="detail-value">${data.start_time}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">${translations.partySize}:</span>
        <span class="detail-value">${data.party_size} ${data.party_size === 1 ? translations.guest : translations.guests}</span>
      </div>

      ${
        data.table_number
          ? `
      <div class="detail-row">
        <span class="detail-label">${translations.table}:</span>
        <span class="detail-value">${data.table_number}</span>
      </div>
      `
          : ''
      }

      ${
        data.section
          ? `
      <div class="detail-row">
        <span class="detail-label">${translations.section}:</span>
        <span class="detail-value">${data.section}</span>
      </div>
      `
          : ''
      }
    </div>

    ${
      data.special_requests
        ? `
    <div class="special-requests">
      <strong>${translations.specialRequests}:</strong><br>
      ${data.special_requests}
    </div>
    `
        : ''
    }

    <p class="info-text">
      ${translations.confirmationInfo}
    </p>

    <div class="contact-info">
      <strong>${translations.contactUs}:</strong><br>
      📍 Carrer de Cartago 22, El Arenal, 07600<br>
      📞 <a href="tel:+34971XXXXXX">+34 971 XXX XXX</a><br>
      📧 <a href="mailto:info@cheersmallorca.com">info@cheersmallorca.com</a><br>
      📱 Instagram: <a href="https://instagram.com/cheersmallorca">@cheersmallorca</a>
    </div>

    <p class="info-text">
      ${translations.lookingForward}
    </p>

    <div class="footer">
      <p>
        ${translations.footer}<br>
        GrandCafe Cheers - El Arenal, Mallorca
      </p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Generate plain text email content
 */
function getEmailText(data: ReservationConfirmationEmailData): string {
  const translations = getTranslations(data.language)

  return `
${translations.greeting}, ${data.guest_name}!

${translations.confirmationMessage}

${translations.reservationDetails}:
-----------------------------------
${translations.confirmationNumber}: #${data.reservation_id.substring(0, 8).toUpperCase()}
${translations.date}: ${formatDate(data.reservation_date, data.language)}
${translations.time}: ${data.start_time}
${translations.partySize}: ${data.party_size} ${data.party_size === 1 ? translations.guest : translations.guests}
${data.table_number ? `${translations.table}: ${data.table_number}` : ''}
${data.section ? `${translations.section}: ${data.section}` : ''}

${
  data.special_requests
    ? `${translations.specialRequests}:
${data.special_requests}
`
    : ''
}
${translations.confirmationInfo}

${translations.contactUs}:
📍 Carrer de Cartago 22, El Arenal, 07600
📞 +34 971 XXX XXX
📧 info@cheersmallorca.com
📱 Instagram: @cheersmallorca

${translations.lookingForward}

${translations.footer}
GrandCafe Cheers - El Arenal, Mallorca
  `.trim()
}

/**
 * Get translations for email content
 */
function getTranslations(language: string): Record<string, string> {
  const translations: Record<string, Record<string, string>> = {
    en: {
      greeting: 'Hello',
      confirmationMessage:
        'Thank you for your reservation at GrandCafe Cheers! We have received your booking request.',
      pendingStatus: 'Pending Confirmation',
      reservationDetails: 'Reservation Details',
      confirmationNumber: 'Confirmation Number',
      date: 'Date',
      time: 'Time',
      partySize: 'Party Size',
      guest: 'guest',
      guests: 'guests',
      table: 'Table',
      section: 'Section',
      specialRequests: 'Special Requests',
      confirmationInfo:
        'Your reservation is currently pending. We will confirm it within 24 hours and send you an update.',
      contactUs: 'Contact Us',
      lookingForward:
        "We look forward to welcoming you at GrandCafe Cheers, Mallorca's finest beachfront dining experience!",
      footer: 'This is an automated confirmation email.',
    },
    nl: {
      greeting: 'Hallo',
      confirmationMessage:
        'Bedankt voor uw reservering bij GrandCafe Cheers! We hebben uw boekingsverzoek ontvangen.',
      pendingStatus: 'Bevestiging in behandeling',
      reservationDetails: 'Reserveringsgegevens',
      confirmationNumber: 'Bevestigingsnummer',
      date: 'Datum',
      time: 'Tijd',
      partySize: 'Aantal personen',
      guest: 'gast',
      guests: 'gasten',
      table: 'Tafel',
      section: 'Sectie',
      specialRequests: 'Speciale verzoeken',
      confirmationInfo:
        'Uw reservering is momenteel in behandeling. We bevestigen deze binnen 24 uur en sturen u een update.',
      contactUs: 'Contact',
      lookingForward:
        'We kijken ernaar uit u te verwelkomen bij GrandCafe Cheers, de beste strandervaring van Mallorca!',
      footer: 'Dit is een geautomatiseerde bevestigingsmail.',
    },
    es: {
      greeting: 'Hola',
      confirmationMessage:
        '¡Gracias por su reserva en GrandCafe Cheers! Hemos recibido su solicitud de reserva.',
      pendingStatus: 'Confirmación pendiente',
      reservationDetails: 'Detalles de la reserva',
      confirmationNumber: 'Número de confirmación',
      date: 'Fecha',
      time: 'Hora',
      partySize: 'Número de personas',
      guest: 'persona',
      guests: 'personas',
      table: 'Mesa',
      section: 'Sección',
      specialRequests: 'Peticiones especiales',
      confirmationInfo:
        'Su reserva está actualmente pendiente. La confirmaremos en un plazo de 24 horas y le enviaremos una actualización.',
      contactUs: 'Contáctenos',
      lookingForward:
        '¡Esperamos darle la bienvenida en GrandCafe Cheers, la mejor experiencia gastronómica frente al mar en Mallorca!',
      footer: 'Este es un correo electrónico de confirmación automático.',
    },
    de: {
      greeting: 'Hallo',
      confirmationMessage:
        'Vielen Dank für Ihre Reservierung im GrandCafe Cheers! Wir haben Ihre Buchungsanfrage erhalten.',
      pendingStatus: 'Bestätigung ausstehend',
      reservationDetails: 'Reservierungsdetails',
      confirmationNumber: 'Bestätigungsnummer',
      date: 'Datum',
      time: 'Uhrzeit',
      partySize: 'Personenzahl',
      guest: 'Person',
      guests: 'Personen',
      table: 'Tisch',
      section: 'Bereich',
      specialRequests: 'Besondere Wünsche',
      confirmationInfo:
        'Ihre Reservierung ist derzeit ausstehend. Wir werden sie innerhalb von 24 Stunden bestätigen und Ihnen ein Update senden.',
      contactUs: 'Kontakt',
      lookingForward:
        'Wir freuen uns darauf, Sie im GrandCafe Cheers, Mallorcas feinstem Strandrestaurant, begrüßen zu dürfen!',
      footer: 'Dies ist eine automatische Bestätigungs-E-Mail.',
    },
  }

  return translations[language] || translations.en
}

/**
 * Format date based on language locale
 */
function formatDate(dateStr: string, language: string): string {
  const date = new Date(dateStr)
  const locales: Record<string, string> = {
    en: 'en-US',
    nl: 'nl-NL',
    es: 'es-ES',
    de: 'de-DE',
  }

  return date.toLocaleDateString(locales[language] || 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ============================================================================
// NEWSLETTER EMAILS
// ============================================================================

/**
 * Send newsletter email to subscriber
 */
export async function sendNewsletterEmail(
  data: NewsletterEmailData
): Promise<EmailResult> {
  try {
    const resend = getResend()
    if (!resend) {
      console.warn('RESEND_API_KEY not configured, skipping newsletter email')
      return { success: false, error: 'Email service not configured' }
    }

    const unsubscribeUrl = `${APP_URL}/api/marketing/subscribers/unsubscribe?token=${data.subscriber_id}`

    // Use custom HTML if provided, otherwise generate from content
    const htmlContent = data.html_content || generateNewsletterHTML(
      data.subject,
      data.content,
      data.subscriber_name,
      unsubscribeUrl,
      data.language
    )

    const textContent = generateNewsletterText(
      data.subject,
      data.content,
      data.subscriber_name,
      unsubscribeUrl,
      data.language
    )

    const response = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: data.subject,
      html: htmlContent,
      text: textContent,
    })

    if (response.error) {
      console.error('Resend error:', response.error)
      return {
        success: false,
        error: response.error.message,
      }
    }

    return {
      success: true,
      messageId: response.data?.id,
    }
  } catch (error) {
    console.error('Error sending newsletter email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate HTML content for newsletter
 */
function generateNewsletterHTML(
  _subject: string,
  content: string,
  subscriberName: string | undefined,
  unsubscribeUrl: string,
  language: string
): string {
  const translations = getNewsletterTranslations(language)
  const greeting = subscriberName ? `${translations.hello} ${subscriberName}` : translations.hello

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f59e0b;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #d97706;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
      font-size: 14px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 20px;
    }
    .content {
      font-size: 16px;
      color: #4b5563;
      white-space: pre-wrap;
      margin: 20px 0;
    }
    .social-links {
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background-color: #eff6ff;
      border-radius: 8px;
    }
    .social-links a {
      display: inline-block;
      margin: 0 10px;
      color: #d97706;
      text-decoration: none;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    .unsubscribe {
      margin-top: 15px;
    }
    .unsubscribe a {
      color: #9ca3af;
      text-decoration: underline;
    }
    .address {
      margin: 10px 0;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏖️ GrandCafe Cheers</div>
      <div class="subtitle">El Arenal, Platja de Palma, Mallorca</div>
    </div>

    <div class="greeting">${greeting}!</div>

    <div class="content">${content}</div>

    <div class="social-links">
      <p style="margin-bottom: 15px; color: #111827; font-weight: 600;">
        ${translations.followUs}
      </p>
      <a href="https://instagram.com/cheersmallorca" target="_blank">
        📱 Instagram
      </a>
      <a href="https://facebook.com/grandcafecheersmallorca" target="_blank">
        👍 Facebook
      </a>
    </div>

    <div class="footer">
      <div class="address">
        <strong>GrandCafe Cheers</strong><br>
        Carrer de Cartago 22<br>
        El Arenal, Mallorca 07600<br>
        📞 +34 971 XXX XXX
      </div>

      <div class="unsubscribe">
        <p>${translations.receivingBecause}</p>
        <a href="${unsubscribeUrl}">${translations.unsubscribe}</a>
      </div>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Generate plain text content for newsletter
 */
function generateNewsletterText(
  _subject: string,
  content: string,
  subscriberName: string | undefined,
  unsubscribeUrl: string,
  language: string
): string {
  const translations = getNewsletterTranslations(language)
  const greeting = subscriberName ? `${translations.hello} ${subscriberName}` : translations.hello

  return `
${greeting}!

${content}

-----------------------------------

${translations.followUs}:
📱 Instagram: https://instagram.com/cheersmallorca
👍 Facebook: https://facebook.com/grandcafecheersmallorca

GrandCafe Cheers
Carrer de Cartago 22
El Arenal, Mallorca 07600
📞 +34 971 XXX XXX

${translations.receivingBecause}
${translations.unsubscribe}: ${unsubscribeUrl}
  `.trim()
}

/**
 * Get translations for newsletter content
 */
function getNewsletterTranslations(language: string): Record<string, string> {
  const translations: Record<string, Record<string, string>> = {
    en: {
      hello: 'Hello',
      followUs: 'Follow us on social media',
      receivingBecause: 'You are receiving this email because you subscribed to our newsletter.',
      unsubscribe: 'Unsubscribe',
    },
    nl: {
      hello: 'Hallo',
      followUs: 'Volg ons op sociale media',
      receivingBecause: 'Je ontvangt deze e-mail omdat je je hebt aangemeld voor onze nieuwsbrief.',
      unsubscribe: 'Afmelden',
    },
    es: {
      hello: 'Hola',
      followUs: 'Síguenos en las redes sociales',
      receivingBecause: 'Recibes este correo porque te suscribiste a nuestro boletín.',
      unsubscribe: 'Darse de baja',
    },
  }

  return translations[language] || translations.en
}

// ============================================================================
// SHIFT NOTIFICATION EMAILS
// ============================================================================

/**
 * Send shift notification email to employee
 */
export async function sendShiftNotification(
  data: ShiftNotificationEmailData
): Promise<EmailResult> {
  try {
    const resend = getResend()
    if (!resend) {
      console.warn('RESEND_API_KEY not configured, skipping shift notification email')
      return { success: false, error: 'Email service not configured' }
    }

    const translations = getShiftTranslations(data.language)
    const subject = `${translations.subject} - ${data.shift_date}`
    const htmlContent = getShiftNotificationHTML(data, translations)
    const textContent = getShiftNotificationText(data, translations)

    const response = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject,
      html: htmlContent,
      text: textContent,
    })

    if (response.error) {
      console.error('Resend error:', response.error)
      return {
        success: false,
        error: response.error.message,
      }
    }

    return {
      success: true,
      messageId: response.data?.id,
    }
  } catch (error) {
    console.error('Error sending shift notification email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate HTML content for shift notification
 */
function getShiftNotificationHTML(
  data: ShiftNotificationEmailData,
  translations: Record<string, string>
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #d97706;
    }
    .shift-card {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .shift-detail {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #fde68a;
    }
    .shift-detail:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #92400e;
    }
    .value {
      color: #78350f;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏖️ GrandCafe Cheers</div>
    </div>

    <h2 style="color: #111827;">${translations.greeting}, ${data.employee_name}!</h2>
    <p>${translations.message}</p>

    <div class="shift-card">
      <div class="shift-detail">
        <span class="label">${translations.date}:</span>
        <span class="value">${data.shift_date}</span>
      </div>
      <div class="shift-detail">
        <span class="label">${translations.time}:</span>
        <span class="value">${data.start_time} - ${data.end_time}</span>
      </div>
      <div class="shift-detail">
        <span class="label">${translations.role}:</span>
        <span class="value">${data.role}</span>
      </div>
    </div>

    <p style="margin-top: 20px; color: #4b5563;">
      ${translations.reminder}
    </p>

    <div class="footer">
      <p>GrandCafe Cheers - Carrer de Cartago 22, El Arenal, Mallorca 07600</p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Generate plain text content for shift notification
 */
function getShiftNotificationText(
  data: ShiftNotificationEmailData,
  translations: Record<string, string>
): string {
  return `
${translations.greeting}, ${data.employee_name}!

${translations.message}

${translations.date}: ${data.shift_date}
${translations.time}: ${data.start_time} - ${data.end_time}
${translations.role}: ${data.role}

${translations.reminder}

GrandCafe Cheers
Carrer de Cartago 22, El Arenal, Mallorca 07600
  `.trim()
}

/**
 * Get translations for shift notification
 */
function getShiftTranslations(language: string): Record<string, string> {
  const translations: Record<string, Record<string, string>> = {
    en: {
      subject: 'Your Shift Schedule',
      greeting: 'Hello',
      message: 'You have been scheduled for the following shift:',
      date: 'Date',
      time: 'Time',
      role: 'Role',
      reminder: 'Please arrive 10 minutes early. See you soon!',
    },
    nl: {
      subject: 'Je Dienstrooster',
      greeting: 'Hallo',
      message: 'Je bent ingeroosterd voor de volgende dienst:',
      date: 'Datum',
      time: 'Tijd',
      role: 'Rol',
      reminder: 'Kom alsjeblieft 10 minuten eerder. Tot snel!',
    },
    es: {
      subject: 'Tu Horario de Turno',
      greeting: 'Hola',
      message: 'Has sido programado para el siguiente turno:',
      date: 'Fecha',
      time: 'Hora',
      role: 'Rol',
      reminder: '¡Por favor llega 10 minutos antes. Nos vemos pronto!',
    },
  }

  return translations[language] || translations.en
}

// ============================================================================
// STOCK ALERT EMAILS
// ============================================================================

/**
 * Send stock alert email to managers
 */
export async function sendStockAlert(
  data: StockAlertEmailData
): Promise<EmailResult> {
  try {
    const resend = getResend()
    if (!resend) {
      console.warn('RESEND_API_KEY not configured, skipping stock alert email')
      return { success: false, error: 'Email service not configured' }
    }

    const translations = getStockAlertTranslations(data.language)
    const subject = `${translations.subject}: ${data.product_name}`
    const htmlContent = getStockAlertHTML(data, translations)
    const textContent = getStockAlertText(data, translations)

    const response = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject,
      html: htmlContent,
      text: textContent,
    })

    if (response.error) {
      console.error('Resend error:', response.error)
      return {
        success: false,
        error: response.error.message,
      }
    }

    return {
      success: true,
      messageId: response.data?.id,
    }
  } catch (error) {
    console.error('Error sending stock alert email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate HTML content for stock alert
 */
function getStockAlertHTML(
  data: StockAlertEmailData,
  translations: Record<string, string>
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #d97706;
    }
    .alert-badge {
      display: inline-block;
      background-color: #fee2e2;
      color: #991b1b;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      margin: 20px 0;
    }
    .alert-card {
      background-color: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .stock-detail {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #fecaca;
    }
    .stock-detail:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #7f1d1d;
    }
    .value {
      color: #991b1b;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚠️ ${translations.stockAlert}</div>
    </div>

    <div style="text-align: center;">
      <span class="alert-badge">${translations.lowStock}</span>
    </div>

    <p style="color: #4b5563; font-size: 16px;">
      ${translations.message}
    </p>

    <div class="alert-card">
      <div class="stock-detail">
        <span class="label">${translations.product}:</span>
        <span class="value">${data.product_name}</span>
      </div>
      <div class="stock-detail">
        <span class="label">${translations.currentStock}:</span>
        <span class="value">${data.current_stock} ${data.unit}</span>
      </div>
      <div class="stock-detail">
        <span class="label">${translations.minimumStock}:</span>
        <span class="value">${data.min_stock} ${data.unit}</span>
      </div>
    </div>

    <p style="margin-top: 20px; color: #4b5563;">
      ${translations.action}
    </p>

    <div class="footer">
      <p>GrandCafe Cheers - Inventory Management System</p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Generate plain text content for stock alert
 */
function getStockAlertText(
  data: StockAlertEmailData,
  translations: Record<string, string>
): string {
  return `
⚠️ ${translations.stockAlert}

${translations.lowStock}

${translations.message}

${translations.product}: ${data.product_name}
${translations.currentStock}: ${data.current_stock} ${data.unit}
${translations.minimumStock}: ${data.min_stock} ${data.unit}

${translations.action}

GrandCafe Cheers - Inventory Management System
  `.trim()
}

/**
 * Get translations for stock alert
 */
function getStockAlertTranslations(language: string): Record<string, string> {
  const translations: Record<string, Record<string, string>> = {
    en: {
      subject: 'Low Stock Alert',
      stockAlert: 'Stock Alert',
      lowStock: 'Low Stock Level',
      message: 'The following product has fallen below the minimum stock level:',
      product: 'Product',
      currentStock: 'Current Stock',
      minimumStock: 'Minimum Stock',
      action: 'Please reorder this product as soon as possible to avoid stockouts.',
    },
    nl: {
      subject: 'Lage Voorraad Waarschuwing',
      stockAlert: 'Voorraad Waarschuwing',
      lowStock: 'Laag Voorraadniveau',
      message: 'Het volgende product is onder het minimale voorraadniveau gedaald:',
      product: 'Product',
      currentStock: 'Huidige Voorraad',
      minimumStock: 'Minimale Voorraad',
      action: 'Bestel dit product zo snel mogelijk opnieuw om tekorten te voorkomen.',
    },
    es: {
      subject: 'Alerta de Stock Bajo',
      stockAlert: 'Alerta de Stock',
      lowStock: 'Nivel de Stock Bajo',
      message: 'El siguiente producto ha caído por debajo del nivel mínimo de stock:',
      product: 'Producto',
      currentStock: 'Stock Actual',
      minimumStock: 'Stock Mínimo',
      action: 'Por favor, vuelva a pedir este producto lo antes posible para evitar desabastecimiento.',
    },
  }

  return translations[language] || translations.en
}
