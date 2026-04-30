'use server'

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import https from 'https'

const NETEASE_API = 'music.163.com'
const SESSION_FILE = join(homedir(), '.aidj', 'netease_session.json')

interface NeteaseSession {
  cookie: string
  username: string
  userId: number
  expiresAt: number
}

function getStoredSession(): NeteaseSession | null {
  try {
    if (existsSync(SESSION_FILE)) {
      const data = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'))
      if (data.expiresAt > Date.now()) {
        return data
      }
    }
    const secretsPath = join(homedir(), '.aidj', 'secrets.json')
    if (existsSync(secretsPath)) {
      const secrets = JSON.parse(readFileSync(secretsPath, 'utf-8'))
      if (secrets.netease_cookie) {
        return {
          cookie: secrets.netease_cookie,
          username: secrets.netease_nickname || 'cached',
          userId: parseInt(secrets.netease_cookie.match(/userId=(\d+)/)?.[1] || '0'),
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
        }
      }
    }
  } catch { }
  return null
}

function saveSession(session: NeteaseSession) {
  try {
    const dir = join(homedir(), '.aidj')
    if (!existsSync(dir)) {
      const { mkdirSync } = require('fs')
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2))

    // Update secrets.json
    const secretsPath = join(homedir(), '.aidj', 'secrets.json')
    let secrets: Record<string, string> = {}
    if (existsSync(secretsPath)) {
      try {
        secrets = JSON.parse(readFileSync(secretsPath, 'utf-8'))
      } catch { }
    }
    secrets.netease_cookie = session.cookie
    secrets.netease_nickname = session.username
    writeFileSync(secretsPath, JSON.stringify(secrets, null, 2))
  } catch (e) {
    console.error('Failed to save session:', e)
  }
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
    path: '/api/playlist/detail?id=2205555594&offset=0&total=true&limit=1',
    method: 'GET',
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://music.163.com/playlist?id=2205555594'
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

  switch (action) {
    case 'validate': {
      const session = getStoredSession()
      if (!session) {
        return NextResponse.json({ success: true, data: { valid: false, reason: 'no_session' } })
      }
      const result = await validateCookie(session.cookie)
      if (result.valid) {
        return NextResponse.json({ success: true, data: { valid: true, nickname: result.nickname } })
      }
      // Clear invalid session
      try { require('fs').unlinkSync(SESSION_FILE) } catch { }
      return NextResponse.json({ success: true, data: { valid: false, reason: 'expired' } })
    }

    case 'login': {
      if (!cookie || typeof cookie !== 'string') {
        return NextResponse.json({ success: false, error: 'Cookie required' }, { status: 400 })
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
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
      }
      saveSession(session)

      return NextResponse.json({ success: true, data: { nickname: result.nickname } })
    }

    case 'logout': {
      try { require('fs').unlinkSync(SESSION_FILE) } catch { }
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
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
      }
    }

    case 'qrCheck': {
      // Check QR code scan status
      if (!key) {
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
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  }
}