import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface PlayHistoryEntry {
  songId: string
  songName: string
  artist: string
  playedAt: number
}

interface PlayHistoryData {
  history: PlayHistoryEntry[]
}

const HISTORY_FILE = path.join(os.homedir(), '.aidj', 'play-history.json')
const MAX_HISTORY_SIZE = 50

function ensureDirectoryExists(): void {
  const dir = path.dirname(HISTORY_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getHistoryData(): PlayHistoryData {
  try {
    ensureDirectoryExists()
    if (!fs.existsSync(HISTORY_FILE)) {
      return { history: [] }
    }
    const content = fs.readFileSync(HISTORY_FILE, 'utf-8')
    const parsed = JSON.parse(content)
    if (!parsed.history || !Array.isArray(parsed.history)) {
      return { history: [] }
    }
    return parsed
  } catch {
    return { history: [] }
  }
}

function saveHistoryData(data: PlayHistoryData): void {
  try {
    ensureDirectoryExists()
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // Silent fail - history is not critical
  }
}

export function getPlayHistory(): PlayHistoryEntry[] {
  const data = getHistoryData()
  // Return in reverse chronological order (newest first)
  return data.history.sort((a, b) => b.playedAt - a.playedAt)
}

export function addToHistory(entry: PlayHistoryEntry): void {
  const data = getHistoryData()

  // Remove existing entry for the same songId (dedup)
  const filtered = data.history.filter(e => e.songId !== entry.songId)

  // Add new entry at the beginning
  filtered.unshift(entry)

  // Trim to max size
  if (filtered.length > MAX_HISTORY_SIZE) {
    filtered.splice(MAX_HISTORY_SIZE)
  }

  data.history = filtered
  saveHistoryData(data)
}

export function clearHistory(): void {
  saveHistoryData({ history: [] })
}