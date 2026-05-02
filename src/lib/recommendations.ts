interface WeatherInfo {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy'
  temperature: number
  description: string
}

interface SongRecommendation {
  songId: string
  songName: string
  artist: string
  mood: string
  reason: string
}

interface PlaylistSong {
  id: string
  name: string
  artist: string
  mood: string
}

// Mood mapping based on time and weather
const MOOD_RULES = [
  { timeRange: [6, 12], weather: ['sunny', 'cloudy'], moods: ['清新', '轻快', '民谣'] },
  { timeRange: [12, 18], weather: ['sunny'], moods: ['流行', '活力'] },
  { timeRange: [18, 22], weather: ['sunny', 'cloudy', 'rainy', 'snowy'], moods: ['夜晚', '抒情'] },
  { timeRange: [22, 6], weather: ['sunny', 'cloudy', 'rainy', 'snowy'], moods: ['安静', '忧郁'] },
]

let playlistCache: PlaylistSong[] | null = null

export function getPlaylist(): PlaylistSong[] {
  if (playlistCache) return playlistCache

  // Load from playlist file - same logic as in aidj/route.ts
  const fs = require('fs')
  const path = require('path')
  const content = fs.readFileSync(path.join(process.cwd(), 'public/playlist_2205555594.txt'), 'utf-8')
  const lines = content.split('\n').filter((l: string) => /^\d+\.\s/.test(l))

  playlistCache = lines.map((line: string) => {
    const parts = line.split(';;;')
    const mainPart = parts[0]
    const realId = parts[1]?.trim()
    const match = mainPart.match(/^\d+\.\s*(.+?)\s*-\s*(.+)$/)
    if (!match) return null
    return {
      id: realId || Buffer.from(`${match[1]}${match[2]}`).toString('base64').slice(0, 9),
      name: match[1].trim(),
      artist: match[2].trim(),
      mood: inferMood(match[1], match[2])
    }
  }).filter(Boolean) as PlaylistSong[]

  return playlistCache
}

function inferMood(name: string, artist: string): string {
  const text = `${name} ${artist}`.toLowerCase()
  if (/夜|星|月|光/.test(text)) return '夜晚'
  if (/雨|泪|哭|伤/.test(text)) return '忧郁'
  if (/爱|情|心|甜/.test(text)) return '浪漫'
  if (/欢|乐|笑|开心/.test(text)) return '欢快'
  if (/慢|安静|静|轻/.test(text)) return '安静'
  if (/电|劲|嗨|燃/.test(text)) return '活力'
  if (/清|新|海|蓝|天|云|风|自然|春天|绿/.test(text)) return '清新'
  if (/轻|快|跳|舞|飞|自由/.test(text)) return '轻快'
  if (/民|谣|乡|村|country|folk/.test(text)) return '民谣'
  return '中性'
}

function getMoodForTimeWeather(hour: number, weather: WeatherInfo): string[] {
  for (const rule of MOOD_RULES) {
    const [start, end] = rule.timeRange
    if (hour >= start && hour < end) {
      if (rule.weather.includes(weather.condition)) {
        return rule.moods
      }
    }
  }
  return ['流行']
}

export function getWelcomeRecommendation(weather: WeatherInfo, hour: number): SongRecommendation {
  const playlist = getPlaylist()
  const targetMoods = getMoodForTimeWeather(hour, weather)

  const candidates = playlist.filter(s => targetMoods.includes(s.mood))
  const selected = candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : playlist[0]

  const timeDesc = hour < 12 ? '上午' : hour < 18 ? '下午' : '夜晚'
  const weatherDesc = `${weather.description}`

  return {
    songId: selected.id,
    songName: selected.name,
    artist: selected.artist,
    mood: selected.mood,
    reason: `${weatherDesc}的${timeDesc}，${weather.temperature}度，为你送上《${selected.name}》`
  }
}

export function getNextSong(excludeIds: string[] = []): SongRecommendation | null {
  const playlist = getPlaylist()
  const candidates = playlist.filter(s => !excludeIds.includes(s.id))

  if (candidates.length === 0) return null

  const selected = candidates[Math.floor(Math.random() * candidates.length)]
  return {
    songId: selected.id,
    songName: selected.name,
    artist: selected.artist,
    mood: selected.mood,
    reason: `为你换了一首《${selected.name}》`
  }
}

export function clearPlaylistCache(): void {
  playlistCache = null
}