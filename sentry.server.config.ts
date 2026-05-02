import * as Sentry from '@sentry/nextjs'

const DSN = process.env.SENTRY_DSN || ''

Sentry.init({
  dsn: DSN,
  environment: process.env.NODE_ENV,
  enabled: !!DSN,
  // Only enable tracesampler in production with DSN
  tracesSampler: () => {
    if (!DSN) return 0
    return 0.1
  },
})