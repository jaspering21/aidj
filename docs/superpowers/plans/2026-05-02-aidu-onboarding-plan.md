# AIDJ Onboarding Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用户进入 app 后 AI 自动播放 TTS 打招呼并推荐歌曲，同时显示"换一首"按钮

**Architecture:** 使用 TTS API 生成欢迎语音，在 React 组件 mount 时触发播放。新建 recommendations.ts 封装推荐逻辑。

**Tech Stack:** Next.js 14, React, TypeScript, TTS API

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/recommendations.ts` | 新建 - 推荐逻辑封装 |
| `src/app/globals.css` | 修改 - 添加 speaking indicator 样式 |
| `src/app/page.tsx` | 修改 - 添加状态、TTS 播放、换歌按钮 |
| `src/app/api/tts/route.ts` | 可能修改 - TTS 生成 |

---

## Tasks

### Task 1: 创建 recommendations.ts

**Files:**
- Create: `src/lib/recommendations.ts`
- Test: `src/lib/recommendations.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// src/lib/recommendations.test.ts
import { describe, it, expect } from 'vitest'
import { getWelcomeRecommendation, getNextSong } from './recommendations'

describe('getWelcomeRecommendation', () => {
  it('returns a song recommendation based on weather and hour', () => {
    const weather = { condition: 'sunny', temperature: 25, description: '晴' }
    const hour = 10
    const result = getWelcomeRecommendation(weather, hour)
    expect(result).toHaveProperty('songId')
    expect(result).toHaveProperty('songName')
    expect(result).toHaveProperty('artist')
    expect(result).toHaveProperty('mood')
  })

  it('maps morning sunny weather to energetic mood', () => {
    const weather = { condition: 'sunny', temperature: 22, description: '晴' }
    const hour = 9
    const result = getWelcomeRecommendation(weather, hour)
    expect(['清新', '轻快', '民谣']).toContain(result.mood)
  })
})

describe('getNextSong', () => {
  it('excludes the current song', () => {
    const excludeIds = ['current-song-id']
    const result = getNextSong(excludeIds)
    expect(result.songId).not.toBe('current-song-id')
  })

  it('returns null when no songs available', () => {
    const excludeIds = Array(100).fill('song')
    const result = getNextSong(excludeIds)
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest src/lib/recommendations.test.ts`
Expected: FAIL with "getWelcomeRecommendation not defined"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/recommendations.ts

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

function getPlaylist(): PlaylistSong[] {
  if (playlistCache) return playlistCache

  // Load from playlist file - same logic as in aidj/route.ts
  const fs = require('fs')
  const path = require('path')
  const content = fs.readFileSync(path.join(process.cwd(), '../playlist_2205555594.txt'), 'utf-8')
  const lines = content.split('\n').filter(l => /^\d+\.\s/.test(l))

  playlistCache = lines.map(line => {
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
  return '中性'
}

function getMoodForTimeWeather(hour: number, weather: WeatherInfo): string[] {
  for (const rule of MOOD_RULES) {
    const [start, end] = rule.timeRange
    if (hour >= start || hour < end) {
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
  const weatherDesc = `${weather.city}${weather.description}`

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest src/lib/recommendations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/recommendations.ts src/lib/recommendations.test.ts
git commit -m "feat: add recommendations module for onboarding"
```

---

### Task 2: 添加 Speaking Indicator 样式

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: 添加 CSS 样式**

在 `globals.css` 末尾添加：

```css
/* AIDJ Speaking Indicator */
.aidj-speaking-indicator {
  position: fixed;
  top: max(24px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 10, 18, 0.85);
  backdrop-filter: blur(10px);
  padding: 10px 20px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 1001;
  border: 1px solid rgba(0, 245, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 245, 255, 0.1);
}

.aidj-speaking-indicator .icon {
  width: 20px;
  height: 20px;
  color: rgba(0, 245, 255, 0.9);
}

.aidj-speaking-indicator .text {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  color: rgba(232, 234, 240, 0.85);
}

/* Speaking animation */
@keyframes speaking-wave {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}

.aidj-speaking-indicator .wave-bar {
  width: 3px;
  height: 16px;
  background: linear-gradient(to top, rgba(0, 245, 255, 0.9), rgba(168, 85, 247, 0.6));
  border-radius: 2px;
  animation: speaking-wave 0.6s ease-in-out infinite;
}

.aidj-speaking-indicator .wave-bar:nth-child(2) {
  animation-delay: 0.15s;
}

.aidj-speaking-indicator .wave-bar:nth-child(3) {
  animation-delay: 0.3s;
}
```

- [ ] **Step 2: 验证 build**

Run: `npm run build`
Expected: 成功，样式编译无错误

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add speaking indicator styles"
```

---

### Task 3: 修改 page.tsx 添加 onboarding 功能

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 添加状态和类型**

在现有的 `interface` 后面添加：

```typescript
interface RecommendationContext {
  songId: string
  songName: string
  artist: string
  mood: string
  reason: string
  weatherContext: string
}
```

在 `useState` 部分添加：

```typescript
const [isAIDJSpeaking, setIsAIDJSpeaking] = useState(false)
const [recommendation, setRecommendation] = useState<RecommendationContext | null>(null)
```

- [ ] **Step 2: 添加 TTS 播放函数**

在组件内添加：

```typescript
async function generateTTS(text: string): Promise<string> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    const data = await response.json()
    return data.data?.audio || ''
  } catch {
    return ''
  }
}

async function playWelcomeMessage(rec: RecommendationContext) {
  setIsAIDJSpeaking(true)

  const text = `你好！我是 AIDJ，你的专属音乐 DJ 🎵 根据${rec.weatherContext}，我为你选了一首很棒的歌——《${rec.songName}》，${rec.artist}，希望你会喜欢 🎧`

  const audioBase64 = await generateTTS(text)

  if (audioBase64) {
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`)
    audio.onended = () => setIsAIDJSpeaking(false)
    audio.onerror = () => setIsAIDJSpeaking(false)
    audio.play()
  } else {
    setIsAIDJSpeaking(false)
  }
}

async function handleSkipSong() {
  if (!recommendation) return

  try {
    const response = await fetch('/api/aidj?action=next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next',
        excludeIds: [recommendation.songId]
      })
    })
    const data = await response.json()

    if (data.success && data.data) {
      setRecommendation({
        songId: data.data.songId,
        songName: data.data.songName,
        artist: data.data.artist,
        mood: data.data.mood || '中性',
        reason: data.data.reason || `为你换了一首《${data.data.songName}》`,
        weatherContext: `${weather?.description || '当前'}天气`
      })
      showToast('info', '换了一首 🎵', toasts, setToasts)
    }
  } catch {
    showToast('error', USER_FRIENDLY_ERRORS.playback, toasts, setToasts)
  }
}
```

- [ ] **Step 3: 修改 init() 函数添加 onboarding**

找到现有的 `init()` 函数，修改为：

```typescript
async function init() {
  // ... existing init code ...

  // AIDJ Onboarding: Get recommendation and play welcome message
  if (weather && typeof window !== 'undefined') {
    try {
      // Get recommendation from current page context
      const hour = new Date().getHours()
      const weatherDesc = `${weather.city}${weather.description}`

      // Use local recommendation logic for immediate response
      const rec = getWelcomeRecommendation(weather, hour)
      const recommendationCtx: RecommendationContext = {
        songId: rec.songId,
        songName: rec.songName,
        artist: rec.artist,
        mood: rec.mood,
        reason: rec.reason,
        weatherContext: weatherDesc
      }

      setRecommendation(recommendationCtx)

      // Play welcome message after a short delay
      setTimeout(() => {
        playWelcomeMessage(recommendationCtx)
      }, 1000)

    } catch (error) {
      console.error('Failed to initialize recommendation:', error)
    }
  }
}
```

- [ ] **Step 4: 添加 Speaking Indicator UI**

在 return 的 JSX 中，找到合适位置添加（在主内容之前）：

```tsx
{isAIDJSpeaking && (
  <div className="aidj-speaking-indicator">
    <div className="wave-bars" style={{ display: 'flex', gap: '4px' }}>
      <div className="wave-bar"></div>
      <div className="wave-bar"></div>
      <div className="wave-bar"></div>
    </div>
    <span className="text">AIDJ 在说话...</span>
  </div>
)}
```

- [ ] **Step 5: 添加换歌按钮**

在播放控制按钮区域添加（紧邻播放按钮）：

```tsx
<button
  className="control-btn"
  onClick={handleSkipSong}
  style={{ minWidth: '44px', minHeight: '44px' }}
  title="换一首"
>
  <FiRefreshCw size={20} />
</button>
```

确保导入了 `FiRefreshCw`:

```typescript
import { FiPlay, FiPause, FiSkipBack, FiSkipForward, FiVolume2, FiRefreshCw } from 'react-icons/fi'
```

- [ ] **Step 6: 运行测试验证**

Run: `npm run build`
Expected: 成功

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add AI onboarding with auto greeting and TTS"
```

---

## 验收标准检查清单

- [ ] AI 在用户进入 app 后 1-2 秒内开始说话
- [ ] TTS 自动播放，无需用户点击
- [ ] 推荐歌曲符合当前天气和时间
- [ ] "换一首"按钮功能正常
- [ ] Speaking indicator 在 TTS 播放期间显示
- [ ] 所有测试通过 (`npm test`)
- [ ] Build 成功 (`npm run build`)

---

## 后续阶段

- **B 阶段**: 用户留存 - 每日推荐卡片
- **C 阶段**: 推荐质量 - thumbs up/down 反馈
- **D 阶段**: 差异化 - AI 音乐讲解员

---

**Plan complete! Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**