# AIDJ App - C 阶段：推荐质量 - 反馈收集与 A/B 测试

**日期**: 2026-05-02
**阶段**: C - 推荐质量
**状态**: 已批准

---

## 设计目标

收集用户反馈数据，隐私优先，本地存储，为未来的算法优化提供数据支持。通过渐进式测试，找到最适合用户的推荐算法。

---

## 功能设计

### 1. 反馈收集机制

**触发时机**: 用户点击 👍 或 👎 按钮

**存储内容**:
```typescript
interface FeedbackEntry {
  songId: string
  songName: string
  artist: string
  action: 'like' | 'dislike'
  timestamp: number
  weatherContext?: string  // 记录当时的天气/时间
  recommendedBy: 'weather' | 'history' | 'random'  // 推荐来源
}
```

**存储位置**: `localStorage` (隐私优先，不上传服务器)

---

### 2. UI 设计

**反馈按钮位置**: 播放控制区域，紧邻"换歌"按钮

**按钮样式**:
- 👍 点赞 - 绿色调 (#10B981)
- 👎 点踩 - 红色调 (#EF4444)
- 尺寸: 44px x 44px（触摸友好）
- 默认透明度 50%，hover 时 100%

**点击效果**:
- 按钮放大 + 回弹动画
- Toast 显示"感谢反馈" / "已换一首"
- 如果不喜欢，自动换歌

---

### 3. A/B 测试机制

**测试策略**: 渐进切换

**Phase 1: 数据收集（当前）**
- 所有用户使用相同算法（天气 + 时间）
- 收集反馈数据到 localStorage
- 不做算法调整

**Phase 2: 小规模测试**
- 10% 用户尝试新算法
- 收集对比数据

**Phase 3: 全面切换**
- 根据数据选择最佳算法
- 逐步推广

**数据收集指标**:
- 👍 点击率
- 👎 点击率
- 播放完成率
- 换歌频率

---

### 4. 反馈存储结构

**localStorage key**: `aidj_feedback`

**数据结构**:
```json
{
  "entries": [
    {
      "songId": "abc123",
      "songName": "晴天",
      "artist": "周杰伦",
      "action": "like",
      "timestamp": 1704067200000,
      "weatherContext": "北京晴天22度",
      "recommendedBy": "weather"
    }
  ],
  "stats": {
    "totalLikes": 10,
    "totalDislikes": 5,
    "lastUpdated": 1704067200000
  }
}
```

**存储限制**:
- 最多存储 100 条反馈
- 超过后删除最旧的记录

---

### 5. 数据分析（未来）

**分析维度**:
- 天气类型 vs 反馈
- 时间段 vs 反馈
- 歌曲 mood vs 反馈
- 推荐来源 vs 反馈

**决策依据**:
- 如果某 mood 歌曲 👎 率高 → 减少推荐该类型
- 如果某时间段推荐反馈差 → 调整该时段推荐策略
- 如果天气相关推荐反馈好 → 保留该算法

---

## 实现方案

### 文件修改

1. **`src/app/globals.css`**
   - 添加 `.feedback-btn` 样式
   - 添加 `.feedback-btn:hover` 样式
   - 添加 `.feedback-btn.active` 样式

2. **`src/app/page.tsx`**
   - 添加 `handleLike()` 函数
   - 添加 `handleDislike()` 函数
   - 添加反馈 UI 按钮
   - 添加 `saveFeedback()` 函数
   - 添加 `loadFeedback()` 函数

3. **`src/lib/feedback.ts`** (新建)
   - `saveFeedback(entry)` 函数
   - `loadFeedback()` 函数
   - `getFeedbackStats()` 函数

---

## 验收标准

1. ✅ 用户可以看到 👍 👎 按钮
2. ✅ 点击按钮有视觉反馈
3. ✅ 反馈数据正确存储到 localStorage
4. ✅ 不喜欢时自动换歌
5. ✅ `npm run build` 成功

---

## 后续阶段

- **D 阶段**: 差异化 - AI 音乐讲解员