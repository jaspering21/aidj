/**
 * Rate Limiting for API routes
 * Uses in-memory storage with IP + endpoint key
 * Suitable for single-instance deployment
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

// Rate limit configurations per endpoint
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/aidj': { maxRequests: 30, windowMs: 60 * 1000 },
  '/api/netease-login': { maxRequests: 10, windowMs: 60 * 1000 },
  '/api/netease-player': { maxRequests: 60, windowMs: 60 * 1000 },
  '/api/tts': { maxRequests: 10, windowMs: 60 * 1000 },
  '/api/health': { maxRequests: 60, windowMs: 60 * 1000 }
}

// In-memory storage for request counts
const requestCounts = new Map<string, RateLimitEntry>()

/**
 * Generate cache key from IP and endpoint
 */
function getCacheKey(ip: string, endpoint: string): string {
  return `${ip}:${endpoint}`
}

/**
 * Clean up expired entries to prevent memory leaks
 */
function cleanupExpired(): void {
  const now = Date.now()
  for (const [key, entry] of requestCounts.entries()) {
    if (entry.resetAt <= now) {
      requestCounts.delete(key)
    }
  }
}

/**
 * Check if request is allowed under rate limit
 * @param ip Client IP address
 * @param endpoint API endpoint path
 * @returns Object with allowed status, remaining requests, and reset time in milliseconds
 */
export function checkRateLimit(ip: string, endpoint: string): { allowed: boolean; remaining: number; resetMs: number } {
  // Cleanup old entries periodically
  cleanupExpired()

  const config = RATE_LIMITS[endpoint]
  if (!config) {
    // No rate limit configured for this endpoint
    return { allowed: true, remaining: -1, resetMs: 0 }
  }

  const key = getCacheKey(ip, endpoint)
  const now = Date.now()
  const entry = requestCounts.get(key)

  // No existing entry - allow request and create new entry
  if (!entry) {
    requestCounts.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetMs: config.windowMs }
  }

  // Entry has expired - reset and allow
  if (entry.resetAt <= now) {
    requestCounts.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetMs: config.windowMs }
  }

  // Within window - check count
  if (entry.count < config.maxRequests) {
    entry.count++
    const remaining = config.maxRequests - entry.count
    const resetMs = entry.resetAt - now
    return { allowed: true, remaining, resetMs }
  }

  // Rate limit exceeded
  const resetMs = entry.resetAt - now
  return { allowed: false, remaining: 0, resetMs }
}

/**
 * Log rate limit violation for monitoring
 */
export function logRateLimitViolation(ip: string, endpoint: string): void {
  console.warn(`[RateLimit] action=exceeded ip=${ip} endpoint=${endpoint} timestamp=${new Date().toISOString()}`)
}

/**
 * Get client IP from request headers
 * Handles proxies and standard headers
 */
export function getClientIp(request: Request): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback
  return 'unknown'
}
