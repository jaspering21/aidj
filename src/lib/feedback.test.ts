import { describe, it, expect, beforeEach, vi } from 'vitest'

// Use hoisted to create mock before module import
const { localStorageMock } = vi.hoisted(() => {
  let store: Record<string, string> = {}
  const mock = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: mock,
    writable: true,
    configurable: true
  })
  return { localStorageMock: mock }
})

import { saveFeedback, loadFeedback, getFeedbackStats, clearFeedback } from './feedback'

describe('feedback module', () => {
  beforeEach(() => {
    // 清理 localStorage
    localStorageMock.clear()
  })

  it('saves feedback to localStorage', () => {
    const entry = {
      songId: 'test-123',
      songName: '测试歌曲',
      artist: '测试艺术家',
      action: 'like' as const,
      timestamp: Date.now()
    }

    saveFeedback(entry)
    const feedback = loadFeedback()

    expect(feedback.entries).toHaveLength(1)
    expect(feedback.entries[0].songId).toBe('test-123')
  })

  it('caps feedback at 100 entries', () => {
    // 填充 105 条
    for (let i = 0; i < 105; i++) {
      saveFeedback({
        songId: `song-${i}`,
        songName: `歌曲${i}`,
        artist: '艺术家',
        action: 'like',
        timestamp: Date.now()
      })
    }

    const feedback = loadFeedback()
    expect(feedback.entries.length).toBe(100)
  })

  it('calculates stats correctly', () => {
    saveFeedback({ songId: '1', songName: 'A', artist: 'X', action: 'like', timestamp: Date.now() })
    saveFeedback({ songId: '2', songName: 'B', artist: 'Y', action: 'like', timestamp: Date.now() })
    saveFeedback({ songId: '3', songName: 'C', artist: 'Z', action: 'dislike', timestamp: Date.now() })

    const stats = getFeedbackStats()
    expect(stats.totalLikes).toBe(2)
    expect(stats.totalDislikes).toBe(1)
  })
})