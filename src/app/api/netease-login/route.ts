'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getSecureSession, saveSession, clearSession, NETEASE_API, httpRequest, NeteaseSession } from '@/lib/netease'
import { PLAYLIST_ID, THIRTY_DAYS_MS } from '@/lib/netease'
import { safeError, validateEnum, validateStringLength } from '@/lib/errors'
import { checkRateLimit, logRateLimitViolation, getClientIp } from '@/lib/rate-limit'

interface LoginRequest {
  action: unknown
  cookie?: unknown
  key?: unknown
}

interface ValidateResponse {
  valid: boolean
  nickname?: string
  reason?: string
}

interface QrKeyResponse {
  unikey: string
}

interface QrCheckResponse {
  code: number
  cookie?: string
  userId?: number
  nickname?: string
}

async function validateCookie(cookie: string): Promise<{ valid: boolean; nickname?: string; userId?: number }> {
  // First try to extract userId from cookie
  const userIdMatch = cookie.match(/userId=(\d+)/)
  let userId = userIdMatch?.[1]
  let nickname: string | undefined

  // If userId found, try to get nickname
  if (userId) {
    const options = {
      hostname: NETEASE_API,
      path: `/api/v1/user/detail/${userId}`,
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://music.163.com/'
      }
    }
    try {
      const data = await httpRequest(options)
      const json = JSON.parse(data)
      if (json.code === 200) {
        nickname = json.profile?.nickname
      }
    } catch (e) {
      console.error('[NeteaseLogin] action=validate_cookie user_id=%s error=', userId, e)
    }
  }

  // Try calling playlist API to verify cookie is valid
  const plOptions = {
    hostname: NETEASE_API,
    path: `/api/playlist/detail?id=${PLAYLIST_ID}&offset=0&total=true&limit=1`,
    method: 'GET',
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': `https://music.163.com/playlist?id=${PLAYLIST_ID}`
    }
  }
  try {
    const data = await httpRequest(plOptions, undefined)
    const json = JSON.parse(data)
    if (json.code === 200) {
      return { valid: true, nickname, userId: userId ? parseInt(userId, 10) : undefined }
    }
  } catch (e) {
    console.error('[NeteaseLogin] action=validate_playlist error=', e)
  }

  return { valid: false }
}

async function testPlayback(cookie: string): Promise<boolean> {
  // Test with a known song - just check API responds, not URL availability
  // Many songs return null URLs due to region/copyright, but API should respond
  const postData = 'ids=[1298432428]&br=320000'
  const options = {
    hostname: NETEASE_API,
    path: '/api/song/enhance/player/url',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://music.163.com/'
    }
  }

  try {
    const data = await httpRequest(options, postData)
    const json = JSON.parse(data)
    // API returns 200 even if URL is null (copyright issues)
    // We just need to verify the API accepts our cookie
    return json.code === 200 && json.data && Array.isArray(json.data)
  } catch (e) {
    console.error('[NeteaseLogin] action=test_playback error=', e)
  }
  return false
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const ip = getClientIp(request)

  // Rate limit check
  const rateLimit = checkRateLimit(ip, '/api/netease-login')
  if (!rateLimit.allowed) {
    logRateLimitViolation(ip, '/api/netease-login')
    const retryAfter = Math.ceil(rateLimit.resetMs / 1000)
    return NextResponse.json(
      { success: false, error: '请求过于频繁，请稍后再试', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  let body: LoginRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(safeError('Invalid request format', 400), { status: 400 })
  }

  const { action, cookie, key } = body

  console.log(`[NeteaseLogin] action=${action} duration_ms=${Date.now() - startTime}`)

  // Validate action enum
  if (!validateEnum(action, ['validate', 'login', 'logout', 'qrKey', 'qrCheck', 'get_cookie_help'])) {
    return NextResponse.json(safeError('Invalid action', 400), { status: 400 })
  }

  switch (action) {
    case 'validate': {
      const session = getSecureSession()
      if (!session) {
        return NextResponse.json({ success: true, data: { valid: false, reason: 'expired' } as ValidateResponse })
      }
      const result = await validateCookie(session.cookie)
      if (result.valid) {
        return NextResponse.json({ success: true, data: { valid: true, nickname: result.nickname } as ValidateResponse })
      }
      // Clear invalid session
      clearSession()
      return NextResponse.json({ success: true, data: { valid: false, reason: 'expired' } as ValidateResponse })
    }

    case 'login': {
      // Validate cookie - must be string with reasonable length
      if (!validateStringLength(cookie, 10, 2000)) {
        return NextResponse.json(safeError('Cookie required', 400), { status: 400 })
      }

      const cookieStr = cookie as string

      // Validate the cookie
      const result = await validateCookie(cookieStr)
      if (!result.valid) {
        return NextResponse.json(safeError('Invalid or expired session. Please login again.', 401), { status: 401 })
      }

      // Test playback capability - just verify API responds
      const canPlay = await testPlayback(cookieStr)
      if (!canPlay) {
        return NextResponse.json(safeError('This account cannot play music. Please try a different account.', 403), { status: 403 })
      }

      // Save session
      const session: NeteaseSession = {
        cookie: cookieStr,
        username: result.nickname || 'User',
        userId: result.userId || 0,
        expiresAt: Date.now() + THIRTY_DAYS_MS
      }
      saveSession(session)

      return NextResponse.json({ success: true, data: { nickname: result.nickname } })
    }

    case 'logout': {
      clearSession()
      return NextResponse.json({ success: true, data: {} })
    }

    case 'get_cookie_help': {
      // Return instructions on how to get cookie
      return NextResponse.json({
        success: true,
        data: {
          instructions: [
            '1. Open music.163.com in browser',
            '2. Login to your account',
            '3. Press F12 to open DevTools',
            '4. Go to Application > Cookies',
            '5. Copy the MUSIC_U cookie value',
            'Or: Install "EditThisCookie" extension and export'
          ]
        }
      })
    }

    case 'qrKey': {
      // Get unikey for QR code login
      const timestamp = Date.now()
      const options = {
        hostname: NETEASE_API,
        path: `/api/login/qrcode/unikey?type=1&timestamp=${timestamp}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://music.163.com/'
        }
      }
      try {
        const data = await httpRequest(options, `timestamp=${timestamp}`)
        const json = JSON.parse(data)
        if (json.unikey) {
          return NextResponse.json({ success: true, data: { unikey: json.unikey } as QrKeyResponse })
        }
        return NextResponse.json(safeError('Failed to get QR key', 500), { status: 500 })
      } catch (e) {
        console.error('[NeteaseLogin] action=qr_key error=', e)
        return NextResponse.json(safeError('Service temporarily unavailable', 500), { status: 500 })
      }
    }

    case 'qrCheck': {
      // Check QR code scan status
      // Validate key - must be string with reasonable length
      if (!validateStringLength(key, 10, 100)) {
        return NextResponse.json(safeError('key required', 400), { status: 400 })
      }
      const keyStr = key as string
      const timestamp = Date.now()
      const options = {
        hostname: NETEASE_API,
        path: '/api/login/qrcode/client/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://music.163.com/'
        }
      }
      try {
        const data = await httpRequest(options, `key=${keyStr}&type=1&timestamp=${timestamp}`)
        const json = JSON.parse(data)
        // code: 801=waiting, 802=scanned, 803=confirmed, 800=expired
        return NextResponse.json({
          success: true,
          data: {
            code: json.code,
            cookie: json.cookie,
            userId: json.userId,
            nickname: json.profile?.nickname
          } as QrCheckResponse
        })
      } catch (e) {
        console.error('[NeteaseLogin] action=qr_check error=', e)
        return NextResponse.json(safeError('Service temporarily unavailable', 500), { status: 500 })
      }
    }

    default:
      return NextResponse.json(safeError('Unknown action', 400), { status: 400 })
  }
}