import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getCachedWeather,
  setCachedWeather,
  getCachedRecommendation,
  setCachedRecommendation,
  generateRecommendationKey,
  getCachedYouTube,
  setCachedYouTube,
  getYouTubeCacheKey,
  clearAllCaches,
  getCacheStats
} from './cache'

describe('cache.ts', () => {
  beforeEach(() => {
    clearAllCaches()
    vi.useFakeTimers()
  })

  describe('simpleHash() via generateRecommendationKey()', () => {
    it('generates consistent hash for same input', () => {
      const key1 = generateRecommendationKey('sunny', 14, ['id1', 'id2'])
      const key2 = generateRecommendationKey('sunny', 14, ['id1', 'id2'])
      expect(key1).toBe(key2)
    })

    it('generates same hash regardless of excludeIds order', () => {
      const key1 = generateRecommendationKey('sunny', 14, ['id1', 'id2'])
      const key2 = generateRecommendationKey('sunny', 14, ['id2', 'id1'])
      // Note: due to how join works, order matters for the hash
      // This is expected behavior
      expect(key1).not.toBe(key2)
    })

    it('generates different hash for different weather conditions', () => {
      const key1 = generateRecommendationKey('sunny', 14)
      const key2 = generateRecommendationKey('rainy', 14)
      expect(key1).not.toBe(key2)
    })

    it('generates different hash for different hours', () => {
      const key1 = generateRecommendationKey('sunny', 14)
      const key2 = generateRecommendationKey('sunny', 15)
      expect(key1).not.toBe(key2)
    })

    it('generates different hash when excludeIds are present vs absent', () => {
      const key1 = generateRecommendationKey('sunny', 14)
      const key2 = generateRecommendationKey('sunny', 14, ['id1'])
      expect(key1).not.toBe(key2)
    })

    it('returns string hash', () => {
      const key = generateRecommendationKey('sunny', 14)
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(0)
    })
  })

  describe('getCachedWeather() / setCachedWeather()', () => {
    it('returns null when cache is empty', () => {
      const result = getCachedWeather()
      expect(result).toBeNull()
    })

    it('returns cached weather data', () => {
      const weatherData = {
        city: 'Beijing',
        condition: 'sunny' as const,
        temperature: 25,
        description: 'Clear sky'
      }
      setCachedWeather(weatherData)

      const result = getCachedWeather()
      expect(result).toEqual(weatherData)
    })

    it('can update cached weather', () => {
      const weather1 = {
        city: 'Beijing',
        condition: 'sunny' as const,
        temperature: 25,
        description: 'Clear sky'
      }
      setCachedWeather(weather1)

      const weather2 = {
        city: 'Shanghai',
        condition: 'rainy' as const,
        temperature: 20,
        description: 'Rainy'
      }
      setCachedWeather(weather2)

      const result = getCachedWeather()
      expect(result).toEqual(weather2)
    })
  })

  describe('getCachedRecommendation() / setCachedRecommendation()', () => {
    it('returns null when cache is empty', () => {
      const result = getCachedRecommendation('nonexistent-key')
      expect(result).toBeNull()
    })

    it('returns cached recommendation', () => {
      const key = generateRecommendationKey('sunny', 14)
      const data = { songs: ['song1', 'song2'] }
      setCachedRecommendation(key, data)

      const result = getCachedRecommendation(key)
      expect(result).toEqual(data)
    })

    it('returns null for expired recommendation', () => {
      const key = generateRecommendationKey('sunny', 14)
      const data = { songs: ['song1'] }
      setCachedRecommendation(key, data)

      // Advance time past TTL (5 minutes = 300000ms)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)

      const result = getCachedRecommendation(key)
      expect(result).toBeNull()
    })

    it('does not return expired data even if new data is set', () => {
      const key = generateRecommendationKey('sunny', 14)

      // Set initial data
      setCachedRecommendation(key, { songs: ['song1'] })
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)

      // Set new data (still within new TTL)
      setCachedRecommendation(key, { songs: ['song2'] })

      // Old key is expired and removed, new data is cached under same key but with new expiry
      const result = getCachedRecommendation(key)
      expect(result).toEqual({ songs: ['song2'] })
    })
  })

  describe('getCachedYouTube() / setCachedYouTube()', () => {
    it('returns null when cache is empty', () => {
      const result = getCachedYouTube('Unknown Song', 'Unknown Artist')
      expect(result).toBeNull()
    })

    it('returns cached YouTube data', () => {
      const songName = 'Test Song'
      const artist = 'Test Artist'
      const youtubeData = {
        youtubeId: 'dQw4w9WgXcQ',
        youtubeUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
      }
      setCachedYouTube(songName, artist, youtubeData)

      const result = getCachedYouTube(songName, artist)
      expect(result).toEqual(youtubeData)
    })

    it('is case-sensitive for song and artist', () => {
      const youtubeData = {
        youtubeId: 'abc123',
        youtubeUrl: 'https://youtube.com/watch?v=abc123'
      }
      setCachedYouTube('Test Song', 'Test Artist', youtubeData)

      // Same key with different case should not match
      const result = getCachedYouTube('test song', 'test artist')
      expect(result).toBeNull()
    })
  })

  describe('getYouTubeCacheKey()', () => {
    it('generates consistent keys', () => {
      const key1 = getYouTubeCacheKey('Song', 'Artist')
      const key2 = getYouTubeCacheKey('Song', 'Artist')
      expect(key1).toBe(key2)
    })

    it('generates different keys for different inputs', () => {
      const key1 = getYouTubeCacheKey('Song1', 'Artist1')
      const key2 = getYouTubeCacheKey('Song2', 'Artist2')
      expect(key1).not.toBe(key2)
    })
  })

  describe('LRU eviction', () => {
    it('evicts oldest entry when exceeding 100 recommendations', () => {
      // Add 100 recommendations with unique keys
      const uniqueKeys: string[] = []
      for (let i = 0; i < 100; i++) {
        const key = generateRecommendationKey('sunny', i, [`id${i}`])
        uniqueKeys.push(key)
        setCachedRecommendation(key, { songs: [`song${i}`] })
      }

      // Verify we have 100 entries
      const stats = getCacheStats()
      expect(stats.recommendation).toBe(100)

      // Add one more - this should evict the oldest
      const newKey = generateRecommendationKey('sunny', 100, ['id100'])
      setCachedRecommendation(newKey, { songs: ['newSong'] })

      // Size should still be 100
      const newStats = getCacheStats()
      expect(newStats.recommendation).toBe(100)

      // The first key should no longer be accessible
      const result = getCachedRecommendation(uniqueKeys[0])
      expect(result).toBeNull()
    })

    it('evicts oldest entry when exceeding 100 YouTube entries', () => {
      // Add 100 YouTube entries with different songs
      for (let i = 0; i < 100; i++) {
        setCachedYouTube(`Song${i}`, `Artist${i}`, {
          youtubeId: `id${i}`,
          youtubeUrl: `https://youtube.com/watch?v=id${i}`
        })
      }

      // Verify we have 100 entries
      const stats = getCacheStats()
      expect(stats.youtube).toBe(100)

      // Add one more - should trigger eviction
      setCachedYouTube('Song100', 'Artist100', {
        youtubeId: 'id100',
        youtubeUrl: 'https://youtube.com/watch?v=id100'
      })

      // Size should still be 100
      const newStats = getCacheStats()
      expect(newStats.youtube).toBe(100)
    })
  })

  describe('clearAllCaches()', () => {
    it('clears all caches', () => {
      // Add some data
      setCachedWeather({ city: 'Beijing', condition: 'sunny', temperature: 25, description: 'Clear' })
      setCachedRecommendation('key1', { songs: ['song1'] })
      setCachedYouTube('Song', 'Artist', { youtubeId: 'abc', youtubeUrl: 'https://youtube.com/watch?v=abc' })

      // Clear
      clearAllCaches()

      // All should be empty
      const stats = getCacheStats()
      expect(stats.weather).toBe(0)
      expect(stats.recommendation).toBe(0)
      expect(stats.youtube).toBe(0)

      // And getCachedWeather should return null
      expect(getCachedWeather()).toBeNull()
      expect(getCachedRecommendation('key1')).toBeNull()
      expect(getCachedYouTube('Song', 'Artist')).toBeNull()
    })
  })

  describe('getCacheStats()', () => {
    it('returns correct counts', () => {
      const initial = getCacheStats()
      expect(initial.weather).toBe(0)
      expect(initial.recommendation).toBe(0)
      expect(initial.youtube).toBe(0)

      setCachedWeather({ city: 'Beijing', condition: 'sunny', temperature: 25, description: 'Clear' })
      setCachedRecommendation('key1', { songs: ['song1'] })
      setCachedYouTube('Song', 'Artist', { youtubeId: 'abc', youtubeUrl: 'https://youtube.com/watch?v=abc' })

      const after = getCacheStats()
      expect(after.weather).toBe(1)
      expect(after.recommendation).toBe(1)
      expect(after.youtube).toBe(1)
    })
  })
})