export interface FeedbackEntry {
  songId: string
  songName: string
  artist: string
  action: 'like' | 'dislike'
  timestamp: number
  weatherContext?: string
  recommendedBy?: 'weather' | 'history' | 'random'
}

interface FeedbackData {
  entries: FeedbackEntry[]
  stats: {
    totalLikes: number
    totalDislikes: number
    lastUpdated: number
  }
}

const STORAGE_KEY = 'aidj_feedback'
const MAX_ENTRIES = 100

function getDefaultData(): FeedbackData {
  return {
    entries: [],
    stats: {
      totalLikes: 0,
      totalDislikes: 0,
      lastUpdated: 0
    }
  }
}

function loadData(): FeedbackData {
  if (typeof window === 'undefined') {
    return getDefaultData()
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultData()
    return JSON.parse(raw) as FeedbackData
  } catch {
    return getDefaultData()
  }
}

function saveData(data: FeedbackData): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function saveFeedback(entry: FeedbackEntry): void {
  const data = loadData()

  // 添加新条目
  data.entries.unshift(entry)  // 最新在前

  // 删除超过 100 条的旧记录
  if (data.entries.length > MAX_ENTRIES) {
    data.entries = data.entries.slice(0, MAX_ENTRIES)
  }

  // 更新统计
  if (entry.action === 'like') {
    data.stats.totalLikes++
  } else {
    data.stats.totalDislikes++
  }
  data.stats.lastUpdated = Date.now()

  saveData(data)
}

export function loadFeedback(): FeedbackData {
  return loadData()
}

export function getFeedbackStats(): { totalLikes: number; totalDislikes: number; total: number; likeRate: number } {
  const data = loadData()
  const total = data.entries.length
  const likeRate = total > 0 ? (data.stats.totalLikes / total) * 100 : 0

  return {
    totalLikes: data.stats.totalLikes,
    totalDislikes: data.stats.totalDislikes,
    total,
    likeRate: Math.round(likeRate)
  }
}

export function clearFeedback(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}