'use server'

import { NextRequest, NextResponse } from 'next/server'
import https from 'https'
import { getSecureSession, saveSession, clearSession, NETEASE_API, httpRequest, NeteaseSession } from '@/lib/netease'
import { PLAYLIST_ID, THIRTY_DAYS_MS } from '@/lib/netease'
import { safeError, validateEnum, validateStringLength } from '@/lib/errors'

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
    } catch { }
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
      return { valid: true, nickname, userId: userId ? parseInt(userId) : undefined }
    }
  } catch { }

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
  } catch { }
  return false
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, cookie, key } = body

  // Validate action enum
  if (!validateEnum(action, ['validate', 'login', 'logout', 'qrKey', 'qrCheck', 'get_cookie_help'])) {
    return NextResponse.json(safeError('Invalid action', 400), { status: 400 })
  }

  switch (action) {
    case 'validate': {
      const session = getSecureSession()
      if (!session) {
        return NextResponse.json({ success: true, data: { valid: false, reason: 'expired' } })
      }
      const result = await validateCookie(session.cookie)
      if (result.valid) {
        return NextResponse.json({ success: true, data: { valid: true, nickname: result.nickname } })
      }
      // Clear invalid session
      clearSession()
      return NextResponse.json({ success: true, data: { valid: false, reason: 'expired' } })
    }

    case 'login': {
      // Validate cookie - must be string with reasonable length
      if (!validateStringLength(cookie, 10, 2000)) {
        return NextResponse.json(safeError('Cookie required', 400), { status: 400 })
      }

      // Validate the cookie
      const result = await validateCookie(cookie)
      if (!result.valid) {
        return NextResponse.json({ success: false, error: 'Invalid or expired session. Please login again.' }, { status: 401 })
      }

      // Test playback capability - just verify API responds
      const canPlay = await testPlayback(cookie)
      if (!canPlay) {
        return NextResponse.json({ success: false, error: 'This account cannot play music. Please try a different account.' }, { status: 403 })
      }

      // Save session
      const session: NeteaseSession = {
        cookie,
        username: result.nickname || 'User',
        userId: result.userId || 0,
        expiresAt: Date.now() + THIRTY_DAYS_MS
      }
      saveSession(session)

      return NextResponse.json({ success: true, data: { nickname: result.nickname } })
    }

    case 'logout': {
      clearSession()
      return NextResponse.json({ success: true })
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
          return NextResponse.json({ success: true, data: { unikey: json.unikey } })
        }
        return NextResponse.json({ success: false, error: 'Failed to get QR key', detail: json }, { status: 500 })
      } catch (e) {
        console.error('QR check error:', e)
        return NextResponse.json(safeError('Service temporarily unavailable', 500), { status: 500 })
      }
    }

    case 'qrCheck': {
      // Check QR code scan status
      // Validate key - must be string with reasonable length
      if (!validateStringLength(key, 10, 100)) {
        return NextResponse.json({ success: false, error: 'key required' }, { status: 400 })
      }
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
        const data = await httpRequest(options, `key=${key}&type=1&timestamp=${timestamp}`)
        const json = JSON.parse(data)
        // code: 801=waiting, 802=scanned, 803=confirmed, 800=expired
        return NextResponse.json({
          success: true,
          data: {
            code: json.code,
            cookie: json.cookie,
            userId: json.userId,
            nickname: json.profile?.nickname
          }
        })
      } catch (e) {
        console.error('QR check error:', e)
        return NextResponse.json(safeError('Service temporarily unavailable', 500), { status: 500 })
      }
    }

    default:
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  }
}