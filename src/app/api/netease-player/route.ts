'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getSecureSession, NETEASE_API, httpRequest, TEST_SONG_ID } from '@/lib/netease'
import { safeError, validateEnum, validateNumberRange } from '@/lib/errors'
import { checkRateLimit, logRateLimitViolation, getClientIp } from '@/lib/rate-limit'

const MAX_SONG_ID = Number.MAX_SAFE_INTEGER

async function getPlayableUrl(songId: number, cookie: string): Promise<{ url: string; br: number } | null> {
  const postData = `ids=[${songId}]&br=320000`

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
    const songData = json.data?.[0]
    if (songData && json.code === 200) {
      // url can be null for VIP songs even with valid cookie
      if (songData.url) {
        return { url: songData.url, br: songData.br || 320000 }
      }
      // Song is available but may need VIP or local cache
      console.log('[NeteasePlayer] action=get_url song_id=%d url_null=true code=%d fee=%d', songId, songData.code, songData.fee)
    }
  } catch (e) {
    console.error('[NeteasePlayer] action=get_url error=', e)
  }
  return null
}

async function getLyric(songId: number, cookie: string): Promise<{ lrc: string; tlyric?: string } | null> {
  const options = {
    hostname: NETEASE_API,
    path: `/api/song/lyric?id=${songId}&lv=1&kv=1&tv=-1`,
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
    return {
      lrc: json.lrc?.lyric || '',
      tlyric: json.tlyric?.lyric
    }
  } catch (e) {
    console.error('[NeteasePlayer] action=get_lyric error=', e)
  }
  return null
}

interface PlayerRequest {
  action: 'url' | 'lyric' | 'validate'
  songId?: unknown
}

interface UrlResponse {
  url: string
  br: number
}

interface LyricResponse {
  lrc: string
  tlyric?: string
}

interface ValidateResponse {
  valid: boolean
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const ip = getClientIp(request)

  // Rate limit check
  const rateLimit = checkRateLimit(ip, '/api/netease-player')
  if (!rateLimit.allowed) {
    logRateLimitViolation(ip, '/api/netease-player')
    const retryAfter = Math.ceil(rateLimit.resetMs / 1000)
    return NextResponse.json(
      { success: false, error: '请求过于频繁，请稍后再试', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const session = getSecureSession()
    if (!session) {
      console.log('[NeteasePlayer] action=%s duration_ms=%d error=session_expired', request.nextUrl.searchParams.get('action'), Date.now() - startTime)
      return NextResponse.json(safeError('Session expired or not found. Please login again.', 401), { status: 401 })
    }

    const songId = request.nextUrl.searchParams.get('songId')
    const action = request.nextUrl.searchParams.get('action') || 'url'

    console.log(`[NeteasePlayer] action=${action} duration_ms=${Date.now() - startTime}`)

    // Validate action enum
    if (!validateEnum(action, ['url', 'lyric', 'validate'])) {
      return NextResponse.json(safeError('Unknown action', 400), { status: 400 })
    }

    // Validate songId if provided for url/lyric actions - must be positive integer within safe range
    if (action !== 'validate' && songId !== null) {
      if (!validateNumberRange(songId, 1, MAX_SONG_ID)) {
        return NextResponse.json(safeError('songId required', 400), { status: 400 })
      }
    }

    switch (action) {
      case 'url': {
        if (!songId) {
          return NextResponse.json(safeError('songId required', 400), { status: 400 })
        }
        const numericSongId = parseInt(songId, 10)
        if (isNaN(numericSongId)) {
          return NextResponse.json(safeError('Invalid songId', 400), { status: 400 })
        }
        const urlData = await getPlayableUrl(numericSongId, session.cookie)
        if (urlData) {
          return NextResponse.json({ success: true, data: urlData as UrlResponse })
        }
        return NextResponse.json(safeError('Failed to get playable URL', 500), { status: 500 })
      }

      case 'lyric': {
        if (!songId) {
          return NextResponse.json(safeError('songId required', 400), { status: 400 })
        }
        const numericSongId = parseInt(songId, 10)
        if (isNaN(numericSongId)) {
          return NextResponse.json(safeError('Invalid songId', 400), { status: 400 })
        }
        const lyric = await getLyric(numericSongId, session.cookie)
        return NextResponse.json({ success: true, data: lyric as LyricResponse })
      }

      case 'validate': {
        const urlData = await getPlayableUrl(TEST_SONG_ID, session.cookie)
        return NextResponse.json({ success: true, data: { valid: !!urlData } as ValidateResponse })
      }

      default:
        return NextResponse.json(safeError('Unknown action', 400), { status: 400 })
    }
  } catch {
    return NextResponse.json(safeError('Service temporarily unavailable', 500), { status: 500 })
  }
}