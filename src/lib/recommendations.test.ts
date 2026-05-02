import { describe, it, expect, beforeEach } from 'vitest'
import { getWelcomeRecommendation, getNextSong, clearPlaylistCache } from './recommendations'
import { getPlaylist } from './recommendations'

describe('getWelcomeRecommendation', () => {
  beforeEach(() => {
    clearPlaylistCache()
  })

  it('returns a song recommendation based on weather and hour', () => {
    const weather = { condition: 'sunny' as const, temperature: 25, description: '晴' }
    const hour = 10
    const result = getWelcomeRecommendation(weather, hour)
    expect(result).toHaveProperty('songId')
    expect(result).toHaveProperty('songName')
    expect(result).toHaveProperty('artist')
    expect(result).toHaveProperty('mood')
  })

  it('maps morning sunny weather to energetic mood', () => {
    const weather = { condition: 'sunny' as const, temperature: 22, description: '晴' }
    const hour = 9
    const result = getWelcomeRecommendation(weather, hour)
    expect(['清新', '轻快', '民谣']).toContain(result.mood)
  })
})

describe('getNextSong', () => {
  beforeEach(() => {
    clearPlaylistCache()
  })

  it('excludes the current song', () => {
    const excludeIds = ['current-song-id']
    const result = getNextSong(excludeIds)
    expect(result).not.toBeNull()
    expect(result?.songId).not.toBe('current-song-id')
  })

  it('returns null when no songs available', () => {
    // Get all song IDs from the playlist
    const allSongs = getPlaylist()
    const allIds = allSongs.map(s => s.id)
    const result = getNextSong(allIds)
    expect(result).toBeNull()
  })
})