/**
 * Retry helper with exponential backoff for transient failures.
 */

export const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 500, // ms
  maxDelay: 4000,    // ms
  backoffMultiplier: 2
}

/**
 * Executes a function with exponential backoff retry.
 * @param fn - Async function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param onRetry - Optional callback fired before each retry (attempt, error)
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = RETRY_CONFIG.maxAttempts,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e as Error
      if (attempt < maxAttempts) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
          RETRY_CONFIG.maxDelay
        )
        if (onRetry) {
          onRetry(attempt, lastError)
        }
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }

  throw lastError
}
