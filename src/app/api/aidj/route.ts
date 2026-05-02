'use server'

import * as Sentry from '@sentry/nextjs'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { NextRequest, NextResponse } from 'next/server'
import { exec as execSync } from 'child_process'
import { promisify } from 'util'
import { checkRateLimit, logRateLimitViolation, getClientIp } from '@/lib/rate-limit'
import { safeError, validateEnum, validateNumberRange, validateStringLength } from '@/lib/errors'
import {
  getCachedWeather,
  setCachedWeather,
  getCachedRecommendation,
  setCachedRecommendation,
  generateRecommendationKey,
  getCachedYouTube,
  setCachedYouTube
} from '@/lib/cache'

const exec = promisify(execSync)

interface WeatherData {
  city: string
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy'
  temperature: number
  description: string
}

interface SongItem {
  id: string
  name: string
  artist: string
  mood: string
}

interface SongRecommendation {
  songId: string
  songName: string
  artist: string
  reason: string
  mood: string
  youtubeUrl: string
  youtubeId: string
}

interface AidjRequest {
  action: unknown
  songId?: unknown
  message?: unknown
  excludeIds?: unknown
}

interface PlayResponse {
  songId: string
  songName: string
  artist: string
  youtubeId: string
  youtubeUrl: string
  playing: boolean
  reason: string
  mood: string
}

interface ChatResponse {
  reply: string
  audio: string
}

async function miniMaxChat(messages: Array<{role: string; content: string}>, maxTokens: number = 200): Promise<string> {
  const MINIMAX_API_KEY = getMiniMaxKey()
  if (!MINIMAX_API_KEY) return ''
  try {
    const response = await fetch(`${'https://api.minimax.chat'}/v1/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        tokens_to_generate: maxTokens,
        messages
      })
    })
    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (e) {
    console.error('[AIDJ] action=mini_max_chat error=', e)
    return ''
  }
}

async function generateMiniMaxTTS(text: string): Promise<string> {
  const MINIMAX_API_KEY = getMiniMaxKey()
  return new Promise((resolve) => {
    if (!MINIMAX_API_KEY) {
      console.error('[AIDJ] TTS: No API key available')
      resolve('')
      return
    }

    try {
      const { execSync } = require('child_process')
      const tmpFile = `/tmp/tts_${Date.now()}.mp3`
      const scriptPath = join(process.cwd(), 'tts_minimax.js')

      // Use proper escaping for shell arguments
      const escapedText = text.replace(/'/g, "'\\''")
      const cmd = `node "${scriptPath}" '${MINIMAX_API_KEY}' '${escapedText}' ${tmpFile}`

      console.log('[AIDJ] TTS: Generating audio for text:', text.substring(0, 50))

      execSync(cmd, {
        timeout: 20000,
        encoding: 'utf-8'
      })

      if (existsSync(tmpFile)) {
        const audioBuffer = readFileSync(tmpFile)
        try { require('fs').unlinkSync(tmpFile) } catch { }
        const base64 = audioBuffer.toString('base64')
        console.log('[AIDJ] TTS: Generated audio, base64 length:', base64.length)
        resolve(base64)
      } else {
        console.error('[AIDJ] TTS: Output file not created')
        resolve('')
      }
    } catch (e) {
      console.error('[AIDJ] TTS error:', (e as Error).message || e)
      resolve('')
    }
  })
}

let playlistCache: SongItem[] | null = null
let currentPlayingSong: SongRecommendation | null = null

function getMiniMaxKey(): string {
  const secretsPath = join(homedir(), '.aidj', 'secrets.json')
  if (existsSync(secretsPath)) {
    try {
      const content = readFileSync(secretsPath, 'utf-8')
      const data = JSON.parse(content)
      return data.minimax_api_key || ''
    } catch { return '' }
  }
  return ''
}

function getPlaylist(): SongItem[] {
  if (playlistCache) return playlistCache
  const content = readFileSync(join(process.cwd(), 'public', 'playlist_2205555594.txt'), 'utf-8')
  const lines = content.split('\n').filter(l => /^\d+\.\s/.test(l))
  playlistCache = lines.map(line => {
    const parts = line.split(';;;')
    const mainPart = parts[0]
    const realId = parts[1]?.trim()
    const match = mainPart.match(/^\d+\.\s*(.+?)\s*-\s*(.+)$/)
    if (!match) return null
    const name = match[1].trim()
    const artist = match[2].trim()
    const id = realId || Buffer.from(`${name}${artist}`).toString('base64').slice(0, 9)
    return { id, name, artist, mood: inferMood(name, artist) }
  }).filter(Boolean) as SongItem[]
  return playlistCache
}

function getCurrentPlayingSong(): SongRecommendation | null {
  return currentPlayingSong
}

function inferMood(name: string, artist: string): string {
  const text = `${name} ${artist}`.toLowerCase()
  if (/夜|星|月|光/.test(text)) return '夜晚'
  if (/雨|泪|哭|伤/.test(text)) return '忧郁'
  if (/爱|情|心|甜/.test(text)) return '浪漫'
  if (/欢|乐|笑|开心/.test(text)) return '欢快'
  if (/慢|安静|静|轻/.test(text)) return '安静'
  if (/电|劲|嗨|燃/.test(text)) return '活力'
  return '中性'
}

function getWeatherByCity(city: string): WeatherData {
  const hour = new Date().getHours()
  const conditions: Array<{ condition: WeatherData['condition']; description: string }> = [
    { condition: 'sunny', description: '晴' },
    { condition: 'cloudy', description: '多云' },
    { condition: 'rainy', description: '小雨' }
  ]
  const w = conditions[hour % 3]
  return { city, condition: w.condition, temperature: 18 + (hour % 12), description: w.description }
}

function getWeather(): WeatherData {
  // Try cache first
  const cached = getCachedWeather()
  if (cached) return cached

  // Generate and cache new weather data
  const data = getWeatherByCity('北京')
  setCachedWeather(data)
  return data
}

async function searchYouTube(songName: string, artist: string): Promise<{youtubeId: string; youtubeUrl: string}> {
  // Check cache first
  const cached = getCachedYouTube(songName, artist)
  if (cached) return cached

  const result = await new Promise<{youtubeId: string; youtubeUrl: string}>((resolve) => {
    try {
      const { YouTube } = require('youtube-search')
      const opts = { part: ['id'], maxResults: 1, key: '' }
      // For now without API key, use fallback
      const query = `${songName} ${artist}`
      resolve({
        youtubeId: '',
        youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&autoplay=1`
      })
    } catch {
      const query = `${songName} ${artist}`
      resolve({
        youtubeId: '',
        youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
      })
    }
  })

  // Cache the result permanently
  setCachedYouTube(songName, artist, result)
  return result
}

async function getRecommendation(weather: WeatherData, excludeIds: string[] = []): Promise<SongRecommendation> {
  // Generate cache key based on weather condition, hour, and excludeIds
  const hour = new Date().getHours()
  const cacheKey = generateRecommendationKey(weather.condition, hour, excludeIds)

  // Check cache first
  const cached = getCachedRecommendation(cacheKey)
  if (cached) return cached as SongRecommendation

  const playlist = getPlaylist()

  const timeMoods = hour < 12 ? ['清新', '轻快', '民谣'] : hour < 18 ? ['放松', '流行', '活力'] : ['夜晚', '安静', '抒情']
  const weatherMoodMap: Record<string, string[]> = {
    sunny: ['欢快', '流行', '活力'],
    cloudy: ['轻松', '舒适', '随性'],
    rainy: ['忧郁', '抒情', '浪漫'],
    snowy: ['温暖', '治愈', '怀旧']
  }
  const targetMoods = [...(weatherMoodMap[weather.condition] || ['流行']), ...timeMoods]

  const candidates = playlist.filter(s => !excludeIds.includes(s.id))
  const scored = candidates.map(song => {
    let score = 0
    for (const mood of targetMoods) {
      if (song.mood.includes(mood) || mood.includes(song.mood)) score += 2
    }
    score += Math.random() * 5
    return { song, score }
  }).sort((a, b) => b.score - a.score)

  const top = scored.slice(0, 5)
  const selected = top[Math.floor(Math.random() * top.length)]?.song || playlist[0]
  const timeDesc = hour < 12 ? '上午' : hour < 18 ? '下午' : '夜晚'

  // Search YouTube for the song
  const yt = await searchYouTube(selected.name, selected.artist)

  const recommendation: SongRecommendation = {
    songId: selected.id,
    songName: selected.name,
    artist: selected.artist,
    reason: `${weather.description}的${timeDesc}，${weather.temperature}度，为你送上《${selected.name}》，${selected.artist}的作品`,
    mood: selected.mood,
    youtubeId: yt.youtubeId,
    youtubeUrl: yt.youtubeUrl
  }

  // Cache the recommendation (5 minute TTL via setCachedRecommendation)
  setCachedRecommendation(cacheKey, recommendation)

  currentPlayingSong = recommendation
  return recommendation
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const ip = getClientIp(request)

  // Rate limit check
  const rateLimit = checkRateLimit(ip, '/api/aidj')
  if (!rateLimit.allowed) {
    logRateLimitViolation(ip, '/api/aidj')
    const retryAfter = Math.ceil(rateLimit.resetMs / 1000)
    return NextResponse.json(
      { success: false, error: '请求过于频繁，请稍后再试', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const action = request.nextUrl.searchParams.get('action') || 'status'

    console.log(`[AIDJ] action=${action} method=GET duration_ms=${Date.now() - startTime}`)

    if (!validateEnum(action, ['weather', 'recommend', 'status'])) {
      return NextResponse.json(safeError('Invalid action', 400), { status: 400 })
    }
    switch (action) {
      case 'weather': return NextResponse.json({ success: true, data: getWeather() })
      case 'recommend': return NextResponse.json({ success: true, data: await getRecommendation(getWeather()) })
      case 'status': return NextResponse.json({ success: true, data: { playing: false, currentSong: null, weather: getWeather() } })
      default: return NextResponse.json(safeError('Invalid action', 400), { status: 400 })
    }
  } catch (err) {
    Sentry.captureException(err, { contexts: { route: { path: '/api/aidj', method: 'GET' } } })
    return NextResponse.json(safeError('Service temporarily unavailable', 500), { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const ip = getClientIp(request)

  // Rate limit check
  const rateLimit = checkRateLimit(ip, '/api/aidj')
  if (!rateLimit.allowed) {
    logRateLimitViolation(ip, '/api/aidj')
    const retryAfter = Math.ceil(rateLimit.resetMs / 1000)
    return NextResponse.json(
      { success: false, error: '请求过于频繁，请稍后再试', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  let body: AidjRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(safeError('Invalid request format', 400), { status: 400 })
  }

  try {
    const { action, songId, message, excludeIds } = body

    console.log(`[AIDJ] action=${action} method=POST duration_ms=${Date.now() - startTime}`)

    // Validate action
    if (!validateEnum(action, ['play', 'next', 'chat'])) {
      return NextResponse.json(safeError('Invalid action', 400), { status: 400 })
    }

    // Validate songId if provided - must be positive integer string
    if (songId !== undefined && !validateNumberRange(songId, 1)) {
      return NextResponse.json(safeError('Invalid songId', 400), { status: 400 })
    }

    // Validate message if provided - must be string, max 500 chars
    if (message !== undefined && !validateStringLength(message, 1, 500)) {
      return NextResponse.json(safeError('Invalid message', 400), { status: 400 })
    }

    // Validate excludeIds if provided - must be array of strings
    if (excludeIds !== undefined) {
      if (!Array.isArray(excludeIds)) {
        return NextResponse.json(safeError('Invalid excludeIds', 400), { status: 400 })
      }
      for (const id of excludeIds) {
        if (typeof id !== 'string' || id.trim().length === 0) {
          return NextResponse.json(safeError('Invalid excludeIds', 400), { status: 400 })
        }
      }
    }

    switch (action) {
      case 'play': {
        const playlist = getPlaylist()
        const item = playlist.find(s => s.id === songId)
        if (item) {
          const yt = await searchYouTube(item.name, item.artist)
          const data = { songId: item.id, songName: item.name, artist: item.artist, youtubeId: yt.youtubeId, youtubeUrl: yt.youtubeUrl, playing: true, reason: '', mood: item.mood }
          currentPlayingSong = data
          return NextResponse.json({ success: true, data: data as PlayResponse })
        }
        const rec = await getRecommendation(getWeather())
        return NextResponse.json({ success: true, data: { songId: rec.songId, songName: rec.songName, artist: rec.artist, youtubeId: rec.youtubeId, youtubeUrl: rec.youtubeUrl, playing: true, reason: rec.reason, mood: rec.mood } as PlayResponse })
      }
      case 'next': {
        const excludes = (excludeIds as string[]) || []
        return NextResponse.json({ success: true, data: await getRecommendation(getWeather(), excludes) })
      }
      case 'chat': {
        const currentSong = getCurrentPlayingSong()
        const weather = getWeather()
        const hour = new Date().getHours()
        const timeDesc = hour < 12 ? '上午' : hour < 18 ? '下午' : '夜晚'

        let reply = ''
        const MINIMAX_API_KEY = getMiniMaxKey()
        if (MINIMAX_API_KEY) {
          const messages: Array<{role: string; content: string}> = [
            { role: 'system', content: `你是 AIDJ 电台的 AI DJ 主持人。你性格温暖、幽默、像真实电台 DJ。当前时间：${timeDesc}，天气：${weather.description}，${weather.temperature}度。如果有正在播放的歌曲，你要能讲解这首歌的背景、风格、甚至分享一些有趣的音乐知识。回复要自然、简短（50字左右）、像朋友聊天一样。` },
            { role: 'user', content: (message as string) || '你好' }
          ]
          reply = await miniMaxChat(messages)
        }

        if (!reply) {
          const fallbacks = [
            `今天的天气很适合听音乐呢～现在${weather.description}，${weather.temperature}度`,
            currentSong ? `现在为你播放的是《${currentSong.songName}》，${currentSong.artist}的作品，很适合现在的氛围哦～` : '我为你准备了一些好听的歌曲！想听什么风格的？',
            '音乐是最美的语言，不是吗？',
            `现在是${timeDesc}时光，听点好音乐犒劳自己吧～`
          ]
          reply = fallbacks[Math.floor(Math.random() * fallbacks.length)]
        }

        const audioBase64 = await generateMiniMaxTTS(reply)
        return NextResponse.json({ success: true, data: { reply, audio: audioBase64 } as ChatResponse })
      }
      default: return NextResponse.json(safeError('Unknown action', 400), { status: 400 })
    }
  } catch (err) {
    Sentry.captureException(err, { contexts: { route: { path: '/api/aidj', method: 'POST' } } })
    return NextResponse.json(safeError('Service temporarily unavailable', 500), { status: 500 })
  }
}