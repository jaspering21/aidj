import * as Sentry from '@sentry/nextjs'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

/**
 * Get Sentry DSN from environment or secrets.json
 * Reads from ~/.aidj/secrets.json sentry_dsn field if available
 */
export function getSentryDsn(): string {
  // Environment variable takes priority
  if (process.env.SENTRY_DSN) {
    return process.env.SENTRY_DSN
  }

  // Try reading from secrets.json
  const secretsPath = join(homedir(), '.aidj', 'secrets.json')
  if (existsSync(secretsPath)) {
    try {
      const content = readFileSync(secretsPath, 'utf-8')
      const data = JSON.parse(content)
      return data.sentry_dsn || ''
    } catch {
      return ''
    }
  }

  return ''
}

/**
 * Initialize Sentry if DSN is available
 * This should be called early in the application lifecycle
 */
export function initSentry(): void {
  const dsn = getSentryDsn()
  if (dsn) {
    process.env.SENTRY_DSN = dsn
  }
}

/**
 * Capture an exception to Sentry if Sentry is configured
 * Gracefully degrades if Sentry DSN is not available
 */
export function captureSentryException(err: unknown, context?: string): void {
  // Only capture if Sentry DSN is configured
  if (!process.env.SENTRY_DSN) {
    return
  }

  try {
    if (context) {
      Sentry.captureException(err, {
        contexts: {
          route: { context }
        }
      })
    } else {
      Sentry.captureException(err)
    }
  } catch {
    // Sentry itself failed, ignore to prevent infinite loops
  }
}