'use server'

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import https from 'https'

const NETEASE_API = 'music.163.com'
const PLAYLIST_ID = '2205555594'

interface NeteaseSession {
  cookie: string
  username: string
  userId: number
  expiresAt: number
}

const SESSION_FILE = join(homedir(), '.aidj', 'netease_session.json')

function getNeteaseSession(): NeteaseSession | null {
  try {
    // Try session file first
    if (existsSync(SESSION_FILE)) {
      const data = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'))
      if (data.expiresAt > Date.now() && data.cookie) {
        return data
      }
    }
    // Fall back to secrets.json
    const secretsPath = join(homedir(), '.aidj', 'secrets.json')
    if (existsSync(secretsPath)) {
      const secrets = JSON.parse(readFileSync(secretsPath, 'utf-8'))
      if (secrets.netease_cookie) {
        return {
          cookie: secrets.netease_cookie,
          username: 'cached',
          userId: parseInt(secrets.netease_cookie.match(/userId=(\d+)/)?.[1] || '0'),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000
        }
      }
    }
  } catch { }
  return null
}

function httpRequest(options: any, postData?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res: any) => {
      let data = ''
      res.on('data', (chunk: string) => data += chunk)
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    if (postData) req.write(postData)
    req.end()
  })
}

async function getPlayableUrl(songId: number, cookie: string): Promise<{ url: string; br: number } | null> {
  const postData = `ids=[${songId}]&br=320000`

  const options = {
    hostname: 'music.163.com',
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
  const session = getNeteaseSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 })
  }

  const songId = request.nextUrl.searchParams.get('songId')
  const action = request.nextUrl.searchParams.get('action') || 'play'

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
      const urlData = await getPlayableUrl(476527848, session.cookie) // Test with a known song
      if (urlData) {
        return NextResponse.json({ success: true, data: { valid: true } })
      }
      return NextResponse.json({ success: true, data: { valid: false } })
    }

    default:
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  }
}