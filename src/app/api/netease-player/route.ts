'use server'

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import https from 'https'
import { getSecureSession, NETEASE_API, httpRequest, PLAYLIST_ID, TEST_SONG_ID } from '@/lib/netease'
import { safeError, validateEnum, validateNumberRange } from '@/lib/errors'

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
      console.log('Song URL null, code:', songData.code, 'fee:', songData.fee, 'payed:', songData.payed)
    }
  } catch (e) {
    console.error('getPlayableUrl error:', e)
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
  } catch { }
  return null
}

export async function GET(request: NextRequest) {
  const session = getSecureSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Session expired or not found. Please login again.' }, { status: 401 })
  }

  const songId = request.nextUrl.searchParams.get('songId')
  const action = request.nextUrl.searchParams.get('action') || 'play'

  // Validate action enum
  if (!validateEnum(action, ['url', 'lyric', 'validate'])) {
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  }

  // Validate songId if provided for url/lyric actions - must be positive integer
  if (action !== 'validate' && songId !== null) {
    if (!validateNumberRange(songId, 1)) {
      return NextResponse.json({ success: false, error: 'songId required' }, { status: 400 })
    }
  }

  switch (action) {
    case 'url': {
      if (!songId) {
        return NextResponse.json({ success: false, error: 'songId required' }, { status: 400 })
      }
      const urlData = await getPlayableUrl(parseInt(songId), session.cookie)
      if (urlData) {
        return NextResponse.json({ success: true, data: urlData })
      }
      return NextResponse.json({ success: false, error: 'Failed to get playable URL' }, { status: 500 })
    }

    case 'lyric': {
      if (!songId) {
        return NextResponse.json({ success: false, error: 'songId required' }, { status: 400 })
      }
      const lyric = await getLyric(parseInt(songId), session.cookie)
      return NextResponse.json({ success: true, data: lyric })
    }

    case 'validate': {
      const urlData = await getPlayableUrl(TEST_SONG_ID, session.cookie)
      if (urlData) {
        return NextResponse.json({ success: true, data: { valid: true } })
      }
      return NextResponse.json({ success: true, data: { valid: false } })
    }

    default:
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  }
}