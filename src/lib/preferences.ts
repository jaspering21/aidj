import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface UserPreferences {
  volume: number        // 0-100, default 70
  lastPlayedSongId?: string
  preferredMood?: string
  autoPlay: boolean     // default true
  ttsEnabled: boolean   // default true
}

const PREFERENCES_FILE = path.join(os.homedir(), '.aidj', 'preferences.json')

function ensureDirectoryExists(): void {
  const dir = path.dirname(PREFERENCES_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function getDefaultPreferences(): UserPreferences {
  return {
    volume: 70,
    autoPlay: true,
    ttsEnabled: true
  }
}

export function getPreferences(): UserPreferences {
  try {
    ensureDirectoryExists()
    if (!fs.existsSync(PREFERENCES_FILE)) {
      return getDefaultPreferences()
    }
    const content = fs.readFileSync(PREFERENCES_FILE, 'utf-8')
    const parsed = JSON.parse(content)
    // Merge with defaults to ensure all fields exist
    return { ...getDefaultPreferences(), ...parsed }
  } catch {
    return getDefaultPreferences()
  }
}

export function savePreferences(prefs: Partial<UserPreferences>): UserPreferences {
  try {
    ensureDirectoryExists()
    const current = getPreferences()
    const updated = { ...current, ...prefs }
    fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(updated, null, 2), 'utf-8')
    return updated
  } catch {
    return getDefaultPreferences()
  }
}