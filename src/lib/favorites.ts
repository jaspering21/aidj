import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface FavoriteEntry {
  songId: string
  songName: string
  artist: string
  addedAt: number
}

interface FavoritesData {
  favorites: FavoriteEntry[]
}

const FAVORITES_FILE = path.join(os.homedir(), '.aidj', 'favorites.json')

function ensureDirectoryExists(): void {
  const dir = path.dirname(FAVORITES_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getFavoritesData(): FavoritesData {
  try {
    ensureDirectoryExists()
    if (!fs.existsSync(FAVORITES_FILE)) {
      return { favorites: [] }
    }
    const content = fs.readFileSync(FAVORITES_FILE, 'utf-8')
    const parsed = JSON.parse(content)
    if (!parsed.favorites || !Array.isArray(parsed.favorites)) {
      return { favorites: [] }
    }
    return parsed
  } catch {
    return { favorites: [] }
  }
}

function saveFavoritesData(data: FavoritesData): void {
  try {
    ensureDirectoryExists()
    fs.writeFileSync(FAVORITES_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // Silent fail
  }
}

export function getFavorites(): FavoriteEntry[] {
  const data = getFavoritesData()
  // Return in reverse chronological order (newest first)
  return data.favorites.sort((a, b) => b.addedAt - a.addedAt)
}

export function addFavorite(entry: FavoriteEntry): boolean {
  const data = getFavoritesData()

  // Check if already exists
  if (data.favorites.some(f => f.songId === entry.songId)) {
    return false
  }

  // Add new entry at the beginning
  data.favorites.unshift(entry)
  saveFavoritesData(data)
  return true
}

export function removeFavorite(songId: string): boolean {
  const data = getFavoritesData()
  const initialLength = data.favorites.length
  data.favorites = data.favorites.filter(f => f.songId !== songId)

  if (data.favorites.length === initialLength) {
    return false
  }

  saveFavoritesData(data)
  return true
}

export function isFavorite(songId: string): boolean {
  const data = getFavoritesData()
  return data.favorites.some(f => f.songId === songId)
}