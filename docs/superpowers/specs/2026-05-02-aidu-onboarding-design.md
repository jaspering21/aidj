# AIDJ App - A 阶段：首次用户体验改进

**日期**: 2026-05-02
**阶段**: A - 首次用户体验
**状态**: 已批准

---

## 设计目标

新用户首次打开 AIDJ 时，立即体验到"AI DJ"的独特价值，而不是被登录或空界面吓跑。

---

## 功能设计

### 1. AI 自动打招呼（欢迎语）

**触发时机**: 用户进入 app 后 1 秒

**表现方式**:
- 屏幕顶部显示 "AIDJ 🎵" 小型动画指示器（闪烁的音波图标）
- TTS 语音自动播放欢迎语

**欢迎语内容**（约 10 秒）:
> "你好！我是 AIDJ，你的专属音乐 DJ 🎵 根据今天的天气，我为你选了一首很棒的歌——《{歌曲名}》，{艺术家}，希望你会喜欢 🎧"

**示例**:
> "你好！我是 AIDJ，你的专属音乐 DJ 🎵 根据今天北京的晴天，我为你选了一首轻快的歌——《晴天》，周杰伦，希望你会喜欢 🎧"

---

### 2. 推荐逻辑

**首次推荐策略**:
1. 获取用户位置（浏览器 geolocation）
2. 获取当前天气（Open-Meteo API）
3. 获取当前时间（小时）
4. 根据 `天气 + 时间` 匹配歌曲 mood
5. 从播放列表中选择一首高可用歌曲

**Mood 匹配规则**:
| 时间 | 天气 | 推荐 mood |
|------|------|-----------|
| 早晨 (6-12) |晴天/多云 | 清新、轻快 |
| 下午 (12-18) |晴天 | 流行、活力 |
| 傍晚 (18-22) |任意 | 夜晚、抒情 |
| 深夜 (22-6) |任意 | 安静、忧郁 |

---

### 3. 一键换歌

**位置**: 播放控制区域，紧邻播放/暂停按钮

**设计**:
- 按钮样式：圆形，左箭头 + 右箭头 (⟲)
- 尺寸：44px x 44px（触摸友好）
- 颜色：与控制按钮一致

**点击行为**:
1. 播放下一首符合当前场景的歌曲
2. 更新 AI 推荐理由
3. 显示 Toast: "换了一首 🎵"

**排除逻辑**:
- 排除当前播放的歌曲
- 排除用户标记"不喜欢"的歌曲
- 最多尝试 3 次，失败后显示"没有找到其他合适的歌曲"

---

### 4. 欢迎动画指示器

**样式**:
- 位置：屏幕顶部居中
- 内容：音波图标 + "AIDJ 在说话..."
- 动画：三个点依次跳动（thinking dots）
- 持续时间：直到 TTS 播放完成
- z-index: 高于其他 UI 元素

**CSS 类**:
```css
.aidj-speaking-indicator {
  position: fixed;
  top: max(24px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 10, 18, 0.8);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1001;
}
```

---

## 实现步骤

### 文件修改

1. **`src/app/page.tsx`**
   - 添加 `welcomeMessage` state
   - 添加 `isAIDJSpeaking` state
   - 添加 `init()` 函数：在 useEffect 中调用
   - 添加 TTS 播放函数 `playWelcomeMessage()`
   - 添加换歌按钮点击处理

2. **`src/app/globals.css`**
   - 添加 `.aidj-speaking-indicator` 样式

3. **`src/lib/recommendations.ts`** (新建)
   - `getWelcomeRecommendation(weather, hour)` 函数
   - `getNextSong(excludeIds[])` 函数

### TTS 播放逻辑

```typescript
async function playWelcomeMessage(recommendation: SongRecommendation) {
  // 1. 显示 speaking indicator
  setIsAIDJSpeaking(true)

  // 2. 生成 TTS 文本
  const text = `你好！我是 AIDJ，你的专属音乐 DJ。根据${recommendation.weatherContext}，我为你选了一首很棒的歌——《${recommendation.songName}》，${recommendation.artist}，希望你会喜欢 🎧`

  // 3. 调用 TTS API
  const audioBase64 = await generateTTS(text)

  // 4. 播放音频
  if (audioBase64) {
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`)
    audio.onended = () => setIsAIDJSpeaking(false)
    audio.play()
  } else {
    setIsAIDJSpeaking(false)
  }
}
```

---

## 验收标准

1. ✅ 用户首次进入 app 后 1-2 秒内听到 AI 打招呼
2. ✅ TTS 自动播放，无需用户点击
3. ✅ 推荐歌曲符合当前天气和时间
4. ✅ "换一首"按钮功能正常
5. ✅ Speaking indicator 在 TTS 播放期间显示
6. ✅ 所有测试通过 (`npm test`)
7. ✅ Build 成功 (`npm run build`)

---

## 后续阶段

- **B 阶段**: 用户留存 - 每日推荐卡片
- **C 阶段**: 推荐质量 - thumbs up/down 反馈
- **D 阶段**: 差异化 - AI 音乐讲解员

---

## 修改文件清单

| 文件 | 操作 |
|------|------|
| `src/app/page.tsx` | 修改 |
| `src/app/globals.css` | 修改 |
| `src/lib/recommendations.ts` | 新建 |
| `src/app/api/aidj/route.ts` | 可能修改 |