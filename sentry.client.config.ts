import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Replay for error reproduction
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Disable in development if no DSN configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  integrations: [
    Sentry.replayIntegration({
      // Mask all user inputs to protect PII
      maskAllInputs: true,
      blockAllMedia: false,
    }),
  ],

  // Environment tagging
  environment: process.env.NODE_ENV,
})
