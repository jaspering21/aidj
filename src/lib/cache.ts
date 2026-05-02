/**
 * Request Caching for AIDJ API
 * - Weather data: 5 minute TTL (time-slice based, same hour shares cache)
 * - Song recommendations: cached by condition hash (weather + hour + excludeIds)
 * - YouTube search: permanent cache (same song won't change)
 * - Max 100 entries, LRU eviction on overflow
 */

interface CacheEntry<T> {
  data: T
  expiry: number // 0 means never expires
}

// Weather cache: simple time-slice (同一小时内用同一缓存)
interface WeatherEntry {
  data: {
    city: string
    condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy'
    temperature: number
    description: string
  }
  hourKey: string // "YYYY-MM-DD-HH" for time-slice
}

const WEATHER_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 100

// In-memory caches
const weatherCache = new Map<string, WeatherEntry>()
const recommendationCache = new Map<string, CacheEntry<unknown>>()
const youtubeCache = new Map<string, { youtubeId: string; youtubeUrl: string }>()

/**
 * Get current hour key for weather cache (time-slice based)
 */
function getHourKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`
}

/**
 * Generate a simple hash for cache keys
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Enforce max cache size with LRU-style eviction (oldest first)
 */
function enforceMaxSize(cache: Map<string, unknown>): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Delete the first entry (oldest)
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) {
      cache.delete(firstKey)
    }
  }
}

/**
 * Get cached weather data
 * Returns null if not cached or expired
 */
export function getCachedWeather(): { city: string; condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy'; temperature: number; description: string } | null {
  const hourKey = getHourKey()
  const entry = weatherCache.get(hourKey)

  if (!entry) return null
  if (entry.hourKey !== hourKey) {
    // Hour changed, invalidate old entry
    weatherCache.delete(hourKey)
    return null
  }

  return entry.data
}

/**
 * Set cached weather data
 */
export function setCachedWeather(data: { city: string; condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy'; temperature: number; description: string }): void {
  const hourKey = getHourKey()
  weatherCache.set(hourKey, { data, hourKey })
}

/**
 * Get cached recommendation by condition hash
 * Returns null if not cached
 */
export function getCachedRecommendation(key: string): unknown | null {
  const entry = recommendationCache.get(key)
  if (!entry) return null
  if (entry.expiry > 0 && entry.expiry < Date.now()) {
    recommendationCache.delete(key)
    return null
  }
  return entry.data
}

/**
 * Set cached recommendation with 5 minute TTL
 */
export function setCachedRecommendation(key: string, data: unknown): void {
  enforceMaxSize(recommendationCache)
  recommendationCache.set(key, {
    data,
    expiry: Date.now() + WEATHER_TTL_MS
  })
}

/**
 * Generate recommendation cache key
 * Key = weather_condition + hour + (excludeIds ? excludeIds.join(',') : 'all')
 */
export function generateRecommendationKey(
  weatherCondition: string,
  hour: number,
  excludeIds?: string[]
): string {
  const excludePart = excludeIds && excludeIds.length > 0 ? excludeIds.join(',') : 'all'
  return simpleHash(`${weatherCondition}:${hour}:${excludePart}`)
}

/**
 * Get cached YouTube search result
 * Returns null if not cached (permanent cache)
 */
export function getCachedYouTube(songName: string, artist: string): { youtubeId: string; youtubeUrl: string } | null {
  const key = simpleHash(`${songName}:${artist}`)
  return youtubeCache.get(key) || null
}

/**
 * Set cached YouTube search result (permanent)
 */
export function setCachedYouTube(
  songName: string,
  artist: string,
  data: { youtubeId: string; youtubeUrl: string }
): void {
  enforceMaxSize(youtubeCache)
  const key = simpleHash(`${songName}:${artist}`)
  youtubeCache.set(key, data)
}

/**
 * Get YouTube cache key (for external use)
 */
export function getYouTubeCacheKey(songName: string, artist: string): string {
  return simpleHash(`${songName}:${artist}`)
}

/**
 * Clear all caches (for testing/maintenance)
 */
export function clearAllCaches(): void {
  weatherCache.clear()
  recommendationCache.clear()
  youtubeCache.clear()
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats(): { weather: number; recommendation: number; youtube: number } {
  return {
    weather: weatherCache.size,
    recommendation: recommendationCache.size,
    youtube: youtubeCache.size
  }
}