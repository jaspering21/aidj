# AIDJ Feedback Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 添加 👍👎 反馈按钮，收集用户偏好数据到 localStorage，为未来算法优化提供数据支持

**Architecture:** 新建 feedback.ts 模块处理本地存储，在 page.tsx 添加反馈按钮和逻辑。

**Tech Stack:** Next.js 14, React, TypeScript, localStorage

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/feedback.ts` | 新建 - 反馈数据存储逻辑 |
| `src/app/globals.css` | 修改 - 添加反馈按钮样式 |
| `src/app/page.tsx` | 修改 - 添加反馈按钮和逻辑 |

---

## Tasks

### Task 1: 创建 feedback.ts 模块

**Files:**
- Create: `src/lib/feedback.ts`
- Test: `src/lib/feedback.test.ts`

- [ ] **Step 1: 写测试**

```typescript
// src/lib/feedback.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { saveFeedback, loadFeedback, getFeedbackStats, clearFeedback } from './feedback'

describe('feedback module', () => {
  beforeEach(() => {
    // 清理 localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aidj_feedback')
    }
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
    // 填充 100 条
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
    expect(feedback.entries.length).toBeLessThanOrEqual(100)
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest src/lib/feedback.test.ts`
Expected: FAIL with "saveFeedback not defined"

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/feedback.ts

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest src/lib/feedback.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/feedback.ts src/lib/feedback.test.ts
git commit -m "feat: add feedback collection module for localStorage"
```

---

### Task 2: 添加反馈按钮样式

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: 添加 CSS 样式**

在 `globals.css` 末尾添加：

```css
/* Feedback Buttons */
.feedback-buttons {
  display: flex;
  gap: 16px;
  align-items: center;
}

.feedback-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.5;
}

.feedback-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.feedback-btn:active {
  transform: scale(0.95);
}

.feedback-btn.like {
  color: #10B981;
}

.feedback-btn.like:hover {
  background: rgba(16, 185, 129, 0.2);
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
}

.feedback-btn.dislike {
  color: #EF4444;
}

.feedback-btn.dislike:hover {
  background: rgba(239, 68, 68, 0.2);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}

.feedback-btn.active {
  opacity: 1;
  animation: feedback-pop 0.3s ease;
}

@keyframes feedback-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
```

- [ ] **Step 2: 验证 build**

Run: `npm run build`
Expected: 成功

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add feedback button styles"
```

---

### Task 3: 在 page.tsx 添加反馈按钮和逻辑

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 导入 feedback 函数**

在 import 区域添加：

```typescript
import { saveFeedback, getFeedbackStats } from '@/lib/feedback'
```

- [ ] **Step 2: 添加处理函数**

在组件内添加：

```typescript
async function handleLike() {
  if (!recommendation) return

  // 保存反馈
  saveFeedback({
    songId: recommendation.songId,
    songName: recommendation.songName,
    artist: recommendation.artist,
    action: 'like',
    timestamp: Date.now(),
    weatherContext: recommendation.weatherContext
  })

  // 显示感谢
  showToast('success', '感谢你的反馈！', toasts, setToasts)

  // 播放点击动画
  const btn = document.querySelector('.feedback-btn.like')
  btn?.classList.add('active')
  setTimeout(() => btn?.classList.remove('active'), 300)
}

async function handleDislike() {
  if (!recommendation) return

  // 保存反馈
  saveFeedback({
    songId: recommendation.songId,
    songName: recommendation.songName,
    artist: recommendation.artist,
    action: 'dislike',
    timestamp: Date.now(),
    weatherContext: recommendation.weatherContext
  })

  // 显示感谢
  showToast('info', '已换一首 🎵', toasts, setToasts)

  // 播放点击动画
  const btn = document.querySelector('.feedback-btn.dislike')
  btn?.classList.add('active')
  setTimeout(() => btn?.classList.remove('active'), 300)

  // 自动换歌
  handleSkipSong()
}
```

- [ ] **Step 3: 添加反馈按钮 UI**

在播放控制区域，添加反馈按钮（紧邻换歌按钮）：

```tsx
{/* 反馈按钮 */}
<div className="feedback-buttons">
  <button
    className="feedback-btn like"
    onClick={handleLike}
    title="喜欢"
  >
    <span style={{ fontSize: '20px' }}>👍</span>
  </button>
  <button
    className="feedback-btn dislike"
    onClick={handleDislike}
    title="不喜欢"
  >
    <span style={{ fontSize: '20px' }}>👎</span>
  </button>
</div>
```

- [ ] **Step 4: 验证 build**

Run: `npm run build`
Expected: 成功

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add feedback buttons with localStorage storage"
```

---

## 验收标准检查清单

- [ ] 用户可以看到 👍 👎 按钮
- [ ] 点击按钮有视觉反馈（放大动画）
- [ ] 反馈数据正确存储到 localStorage
- [ ] 不喜欢时自动换歌
- [ ] `npm run build` 成功
- [ ] `npm test` 通过

---

## 后续阶段

- **D 阶段**: 差异化 - AI 音乐讲解员

---

**Plan complete! Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**