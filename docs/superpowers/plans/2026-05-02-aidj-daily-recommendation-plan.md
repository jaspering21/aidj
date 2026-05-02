# AIDJ Daily Recommendation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每次打开 app 显示"欢迎回来" + AI 播报每日专属推荐，增加用户留存

**Architecture:** 修改 playWelcomeMessage() 文案逻辑，检测用户是否首次使用，显示不同文案。新增"今日专属"标签。

**Tech Stack:** Next.js 14, React, TypeScript, TTS API

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/app/page.tsx` | 修改 - 更新文案逻辑、添加标签 |
| `src/app/globals.css` | 修改 - 添加"今日专属"样式 |
| `src/lib/recommendations.ts` | 修改 - 增强推荐逻辑考虑用户历史 |

---

## Tasks

### Task 1: 修改 page.tsx 文案逻辑

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 添加 useState 记录用户是否首次使用**

在现有 useState 部分添加：

```typescript
const [hasUsedBefore, setHasUsedBefore] = useState(false)
```

- [ ] **Step 2: 添加检测首次使用的函数**

在组件内添加：

```typescript
// 检测用户是否使用过 app（通过 localStorage）
function checkFirstTimeUser(): boolean {
  if (typeof window === 'undefined') return false
  const hasVisited = localStorage.getItem('aidj_visited')
  return !!hasVisited
}

function markAsVisited(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('aidj_visited', 'true')
  }
}
```

- [ ] **Step 3: 修改 playWelcomeMessage 函数**

找到 `playWelcomeMessage` 函数，修改文案：

```typescript
async function playWelcomeMessage(rec: RecommendationContext) {
  setIsAIDJSpeaking(true)

  // 根据是否使用过显示不同文案
  const isFirstTime = !checkFirstTimeUser()

  let text: string
  if (isFirstTime) {
    // 首次使用
    text = `你好！我是 AIDJ，你的专属音乐 DJ 🎵 根据${rec.weatherContext}，我为你选了一首很棒的歌——《${rec.songName}》，${rec.artist}，希望你会喜欢 🎧`
    markAsVisited()
  } else {
    // 再次使用
    text = `欢迎回来！根据你的品味，我为你准备了今日专属歌曲 🎵 让我为你播放...`
  }

  const audioBase64 = await generateTTS(text)

  if (audioBase64) {
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`)
    audio.onended = () => {
      setIsAIDJSpeaking(false)
      if (!isFirstTime) {
        showToast('success', '今日推荐已更新 🎵', toasts, setToasts)
      }
    }
    audio.onerror = () => setIsAIDJSpeaking(false)
    audio.play()
  } else {
    setIsAIDJSpeaking(false)
  }
}
```

- [ ] **Step 4: 添加"今日专属"标签**

在播放列表区域添加标签（紧跟播放列表标题）：

```tsx
{/* 在 Playlist 标题旁添加 */}
<div className="daily-badge">
  <span>今日专属</span>
</div>
```

- [ ] **Step 5: 验证 build**

Run: `npm run build`
Expected: 成功

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add daily recommendation with welcome back message"
```

---

### Task 2: 添加"今日专属"标签样式

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: 添加 CSS 样式**

在 `globals.css` 末尾添加：

```css
/* Daily Recommendation Badge */
.daily-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(0, 245, 255, 0.15), rgba(168, 85, 247, 0.15));
  border: 1px solid rgba(0, 245, 255, 0.3);
  margin-left: 12px;
  animation: badge-glow 3s ease-in-out infinite;
}

.daily-badge span {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: rgba(0, 245, 255, 0.9);
  letter-spacing: 0.5px;
}

@keyframes badge-glow {
  0%, 100% {
    box-shadow: 0 0 8px rgba(0, 245, 255, 0.2);
  }
  50% {
    box-shadow: 0 0 16px rgba(0, 245, 255, 0.4);
  }
}
```

- [ ] **Step 2: 验证 build**

Run: `npm run build`
Expected: 成功

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add daily recommendation badge styles"
```

---

### Task 3: 增强推荐逻辑（可选）

**Files:**
- Modify: `src/lib/recommendations.ts`

- [ ] **Step 1: 添加用户历史偏好检测**

修改 `getWelcomeRecommendation` 函数：

```typescript
export function getWelcomeRecommendation(
  weather: WeatherInfo,
  hour: number,
  userHistory?: { moods: string[] }
): SongRecommendation {
  const playlist = getPlaylist()
  const targetMoods = getMoodForTimeWeather(hour, weather)

  // 如果有用户历史，优先从相关 mood 中选择
  let candidates: PlaylistSong[]

  if (userHistory?.moods && userHistory.moods.length > 0) {
    // 用户有历史偏好，优先选择匹配历史 mood 的歌曲
    const historyMoods = userHistory.moods
    candidates = playlist.filter(s =>
      targetMoods.includes(s.mood) || historyMoods.includes(s.mood)
    )
    if (candidates.length === 0) {
      candidates = playlist.filter(s => targetMoods.includes(s.mood))
    }
  } else {
    candidates = playlist.filter(s => targetMoods.includes(s.mood))
  }

  // 如果没有匹配，取任何歌曲
  if (candidates.length === 0) {
    candidates = playlist
  }

  const selected = candidates[Math.floor(Math.random() * candidates.length)]

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
```

- [ ] **Step 2: 更新测试**

```typescript
// src/lib/recommendations.test.ts 添加
it('prefers user history moods when available', () => {
  const weather = { condition: 'sunny', temperature: 22, description: '晴' }
  const hour = 10
  const userHistory = { moods: ['夜晚', '抒情'] }
  const result = getWelcomeRecommendation(weather, hour, userHistory)
  expect(['夜晚', '抒情']).toContain(result.mood)
})
```

- [ ] **Step 3: 验证测试**

Run: `npx vitest src/lib/recommendations.test.ts`
Expected: 所有测试通过

- [ ] **Step 4: Commit**

```bash
git add src/lib/recommendations.ts src/lib/recommendations.test.ts
git commit -m "feat: enhance recommendation with user history preference"
```

---

## 验收标准检查清单

- [ ] 首次打开 app 显示"你好！我是 AIDJ..."
- [ ] 第二次及以后打开显示"欢迎回来！..."
- [ ] 播放完成后显示 Toast "今日推荐已更新"
- [ ] "今日专属"标签正确显示
- [ ] `npm run build` 成功
- [ ] `npm test` 通过

---

## 后续阶段

- **C 阶段**: 推荐质量 - thumbs up/down 反馈
- **D 阶段**: 差异化 - AI 音乐讲解员

---

**Plan complete! Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**