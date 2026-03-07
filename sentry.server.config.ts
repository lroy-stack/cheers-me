import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Lower sample rate for server (higher traffic)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Disable in development if no DSN configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tagging
  environment: process.env.NODE_ENV,
})
