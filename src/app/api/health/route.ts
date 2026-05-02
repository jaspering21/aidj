import { NextResponse } from 'next/server'
import { checkRateLimit, logRateLimitViolation, getClientIp } from '@/lib/rate-limit'

interface HealthResponse {
  status: 'ok' | 'error'
  timestamp: string
  version: string
}

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now()
  const ip = getClientIp(new Request('http://localhost'))

  // Rate limit check
  const rateLimit = checkRateLimit(ip, '/api/health')
  if (!rateLimit.allowed) {
    logRateLimitViolation(ip, '/api/health')
    const retryAfter = Math.ceil(rateLimit.resetMs / 1000)
    return NextResponse.json(
      { success: false, error: '请求过于频繁，请稍后再试', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const timestamp = new Date().toISOString()
    const version = process.env.npm_package_version || '1.0.0'

    console.log(`[HealthCheck] action=health_check duration_ms=${Date.now() - startTime}`)

    return NextResponse.json({
      success: true,
      data: {
        status: 'ok',
        timestamp,
        version
      }
    } as { success: true; data: HealthResponse })
  } catch (err) {
    console.error('[HealthCheck] action=health_check error=', err)
    return NextResponse.json(
      { success: false, error: 'Service temporarily unavailable' },
      { status: 503 }
    )
  }
}