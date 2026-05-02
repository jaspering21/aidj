import https from 'https'
import { IncomingMessage } from 'http'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export const NETEASE_API = 'music.163.com'
export const SESSION_FILE = join(homedir(), '.aidj', 'netease_session.json')
export const SECRETS_FILE = join(homedir(), '.aidj', 'secrets.json')

// Constants
export const PLAYLIST_ID = '2205555594'
export const TEST_SONG_ID = 476527848
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// Retry configuration
const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 500
const MAX_DELAY_MS = 5000

export interface NeteaseSession {
  cookie: string
  username: string
  userId: number
  expiresAt: number
}

export function getStoredSession(): NeteaseSession | null {
  try {
    if (existsSync(SESSION_FILE)) {
      const data = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'))
      if (data.expiresAt > Date.now()) {
        return data
      }
    }
    if (existsSync(SECRETS_FILE)) {
      const secrets = JSON.parse(readFileSync(SECRETS_FILE, 'utf-8'))
      if (secrets.netease_cookie) {
        return {
          cookie: secrets.netease_cookie,
          username: secrets.netease_nickname || 'cached',
          userId: parseInt(secrets.netease_cookie.match(/userId=(\d+)/)?.[1] || '0'),
          expiresAt: Date.now() + THIRTY_DAYS_MS
        }
      }
    }
  } catch { }
  return null
}

export function saveSession(session: NeteaseSession) {
  try {
    const dir = join(homedir(), '.aidj')
    if (!existsSync(dir)) {
      const { mkdirSync } = require('fs')
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2))

    // Update secrets.json
    let secrets: Record<string, string> = {}
    if (existsSync(SECRETS_FILE)) {
      try {
        secrets = JSON.parse(readFileSync(SECRETS_FILE, 'utf-8'))
      } catch { }
    }
    secrets.netease_cookie = session.cookie
    secrets.netease_nickname = session.username
    writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2))
  } catch (e) {
    console.error('Failed to save session:', e)
  }
}

export function clearSession() {
  try { require('fs').unlinkSync(SESSION_FILE) } catch { }
}

/**
 * Secure session retrieval with expiration check
 * - Never logs cookie contents
 * - Cleans up expired sessions automatically
 * - Returns null for expired or missing sessions
 */
export function getSecureSession(): NeteaseSession | null {
  const session = getStoredSession()
  if (!session) {
    console.log('Session: none found')
    return null
  }

  // Check expiration
  if (Date.now() > session.expiresAt) {
    console.log('Session: expired, clearing')
    clearSession()
    return null
  }

  // Log session validity without exposing cookie
  const remainingMs = session.expiresAt - Date.now()
  const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000))
  console.log(`Session: valid for user ${session.username}, expires in ~${remainingDays} days`)
  return session
}

export interface HttpRequestOptions {
  hostname: string
  path: string
  method: string
  headers: Record<string, string | number>
}

export interface HttpResponse {
  statusCode?: number
  data: string
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * HTTP request with exponential backoff retry
 * Retries on network failures and 5xx errors
 */
export function httpRequest(options: HttpRequestOptions, postData?: string, retryCount = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res: IncomingMessage) => {
      // Retry on 5xx errors
      if (res.statusCode && res.statusCode >= 500 && retryCount < MAX_RETRIES) {
        const delay = Math.min(INITIAL_DELAY_MS * Math.pow(2, retryCount), MAX_DELAY_MS)
        console.log(`HTTP ${res.statusCode}, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        sleep(delay).then(() => resolve(httpRequest(options, postData, retryCount + 1)))
        return
      }

      let data = ''
      res.on('data', (chunk: string) => data += chunk)
      res.on('end', () => resolve(data))
    })

    req.on('error', (err) => {
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(INITIAL_DELAY_MS * Math.pow(2, retryCount), MAX_DELAY_MS)
        console.log(`Network error: ${err.message}, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        sleep(delay).then(() => resolve(httpRequest(options, postData, retryCount + 1)))
      } else {
        reject(err)
      }
    })

    if (postData) req.write(postData)
    req.end()
  })
}