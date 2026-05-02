'use client'

import { useState, useEffect, useRef } from 'react'
import NeteaseLoginModal from './components/NeteaseLoginModal'
import { saveFeedback } from '@/lib/feedback'
import Clock from './components/Clock'
import NowPlaying from './components/NowPlaying'
import PlaybackControls from './components/PlaybackControls'
import VolumeSlider from './components/VolumeSlider'
import AIChatPanel from './components/AIChatPanel'
import ChatInput from './components/ChatInput'
import PlaylistPanel from './components/PlaylistPanel'
import SpeakingIndicator from './components/SpeakingIndicator'
import ToastContainer from './components/ToastContainer'
import StatusBar from './components/StatusBar'

const conditionIcons: Record<string, string> = {
  sunny: '☀️',
  cloudy: '⛅',
  rainy: '🌧️',
  snowy: '❄️'
}

const USER_FRIENDLY_ERRORS = {
  network: '网络连接不稳定，请检查网络',
  timeout: '服务响应较慢，请稍后重试',
  playback: '该歌曲暂时无法播放，将为你切换下一首',
  playlist: '播放列表加载失败，请刷新重试',
  chat: '消息发送失败，请稍后再试'
}

interface WeatherData {
  city: string
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy'
  temperature: number
  description: string
}

interface PlaylistItem {
  id: string
  songName: string
  artist: string
}

interface Toast {
  id: string
  type: 'error' | 'warning' | 'success' | 'info'
  message: string
}

interface RecommendationContext {
  songId: string
  songName: string
  artist: string
  mood: string
  reason: string
  weatherContext: string
}

function showToast(type: Toast['type'], message: string, toasts: Toast[], setToasts: React.Dispatch<React.SetStateAction<Toast[]>>) {
  const id = Date.now().toString()
  setToasts([...toasts, { id, type, message }])
  setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, 4000)
}

export default function MusicAgent() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAIDJSpeaking, setIsAIDJSpeaking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(70)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [recommendation, setRecommendation] = useState<RecommendationContext | null>(null)
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [playlistLoading, setPlaylistLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'aidj'; text: string}[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [nickname, setNickname] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [activeFeedbackBtn, setActiveFeedbackBtn] = useState<'like' | 'dislike' | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)
  const userInteractedRef = useRef(false)
  const playlistPlayRef = useRef(false)

  useEffect(() => {
    init()
  }, [])

  // Clock update
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      setCurrentTime(`${hours}:${minutes}:${seconds}`)
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const day = now.getDate().toString().padStart(2, '0')
      const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
      setCurrentDate(`${month}.${day} · ${weekDays[now.getDay()]}`)
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  // Track user interaction for auto-play
  useEffect(() => {
    const handler = () => {
      userInteractedRef.current = true
      // On first user interaction, play welcome message if not played yet
      if (recommendation && !isAIDJSpeaking) {
        playWelcomeMessage(recommendation)
      }
    }
    window.addEventListener('click', handler, { once: true })
    window.addEventListener('touchstart', handler, { once: true })
    window.addEventListener('keydown', handler, { once: true })
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('touchstart', handler)
      window.removeEventListener('keydown', handler)
    }
  }, [recommendation, isAIDJSpeaking])

  // Auto-play
  useEffect(() => {
    const timer = setTimeout(() => {
      if (playlistPlayRef.current) return
      if (!recommendation?.songId || !isLoggedIn || !audioRef.current || !userInteractedRef.current) return
      if (!audioRef.current.src || audioRef.current.src === window.location.href) return
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error)
    }, 300)
    return () => clearTimeout(timer)
  }, [recommendation?.songId, isLoggedIn])

  // Progress tracking
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      progressInterval.current = setInterval(() => {
        if (audioRef.current) {
          const { currentTime, duration } = audioRef.current
          if (duration > 0) setProgress((currentTime / duration) * 100)
        }
      }, 500)
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current) }
  }, [isPlaying])

  // Volume sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100
  }, [volume])

  function checkFirstTimeUser(): boolean {
    if (typeof window === 'undefined') return false
    return !localStorage.getItem('aidj_visited')
  }

  function markAsVisited(): void {
    if (typeof window !== 'undefined') localStorage.setItem('aidj_visited', 'true')
  }

  async function fetchWeatherByLocation(): Promise<WeatherData> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ city: '北京', condition: 'sunny', temperature: 22, description: '晴' })
        return
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords
            const data = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`).then(r => r.json())
            const cw = data.current_weather
            const map: Record<number, WeatherData['condition']> = {
              0: 'sunny', 1: 'sunny', 2: 'cloudy', 3: 'cloudy',
              45: 'cloudy', 48: 'cloudy', 51: 'rainy', 53: 'rainy', 55: 'rainy',
              61: 'rainy', 63: 'rainy', 65: 'rainy', 71: 'snowy', 73: 'snowy', 75: 'snowy',
              80: 'rainy', 82: 'rainy', 95: 'rainy'
            }
            const condition = map[Math.floor(cw.weathercode / 100) * 100] || 'sunny'
            const descMap: Record<string, string> = { sunny: '晴', cloudy: '多云', rainy: '小雨', snowy: '小雪' }
            resolve({ city: '当前位置', condition, temperature: Math.round(cw.temperature), description: descMap[condition] })
          } catch { resolve({ city: '北京', condition: 'sunny', temperature: 22, description: '晴' }) }
        },
        () => resolve({ city: '北京', condition: 'sunny', temperature: 22, description: '晴' })
      )
    })
  }

  const init = async () => {
    setIsLoading(true)
    setWeatherLoading(true)
    setPlaylistLoading(true)
    try {
      // Load preferences
      try {
        const prefsRes = await fetch('/api/preferences')
        if (prefsRes.ok) {
          const prefsData = await prefsRes.json()
          if (prefsData.success && prefsData.data) {
            setVolume(prefsData.data.volume ?? 70)
          }
        }
      } catch (e) { console.error('Failed to load preferences:', e) }

      // Validate login
      const loginRes = await fetch('/api/netease-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate' })
      })
      const loginData = await loginRes.json()
      if (loginData.success && loginData.data.valid) {
        setIsLoggedIn(true)
        setNickname(loginData.data.nickname || '用户')
      } else {
        setShowLoginModal(true)
      }

      // Load favorites
      try {
        const favRes = await fetch('/api/favorites')
        if (favRes.ok) {
          const favData = await favRes.json()
          if (favData.success && favData.data) {
            setFavoriteIds(new Set(favData.data.map((f: { songId: string }) => f.songId)))
          }
        }
      } catch (e) { console.error('Failed to load favorites:', e) }

      // Load weather and recommendation in parallel
      const w = await fetchWeatherByLocation().catch(() => null)
      setWeather(w)
      setWeatherLoading(false)

      if (w && typeof window !== 'undefined') {
        try {
          const hour = new Date().getHours()
          const weatherDesc = `${w.city}${w.description}`
          const recRes = await fetch(`/api/recommendations?action=welcome&weather=${encodeURIComponent(JSON.stringify(w))}&hour=${hour}`)
          const recData = await recRes.json()
          if (recData.success && recData.data) {
            const rec = recData.data
            const recommendationCtx: RecommendationContext = {
              songId: rec.songId,
              songName: rec.songName,
              artist: rec.artist,
              mood: rec.mood,
              reason: rec.reason,
              weatherContext: weatherDesc
            }
            setRecommendation(recommendationCtx)
            // Don't auto-play welcome message here - let user interaction handler do it
          }
        } catch (error) { console.error('Failed to initialize recommendation:', error) }
      }

      // Load playlist
      setPlaylistLoading(true)
      const lines = await fetch('/playlist_2205555594.txt').then(r => r.text()).catch(() => '')
      const items: PlaylistItem[] = lines.split('\n')
        .filter(l => /^\d+\.\s/.test(l))
        .slice(0, 20)
        .map(l => {
          const parts = l.split(';;;')
          const mainPart = parts[0]
          const match = mainPart.match(/^\d+\.\s*(.+?)\s*-\s*(.+)$/)
          if (!match) return null
          return {
            id: parts[1]?.trim() || match[1].trim(),
            songName: match[1].trim(),
            artist: match[2].trim()
          }
        }).filter(Boolean) as PlaylistItem[]
      setPlaylist(items)
      setPlaylistLoading(false)
    } catch { showToast('error', USER_FRIENDLY_ERRORS.network, toasts, setToasts) }
    finally { setIsLoading(false) }
  }

  const handleLoginSuccess = (name: string, _cookie: string) => {
    setIsLoggedIn(true)
    setNickname(name)
    setShowLoginModal(false)
  }

  async function generateTTS(text: string): Promise<string> {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      const data = await response.json()
      return data.data?.audio || ''
    } catch { return '' }
  }

  async function playWelcomeMessage(rec: RecommendationContext) {
    setIsAIDJSpeaking(true)
    const isFirstTime = checkFirstTimeUser()
    const text = isFirstTime
      ? `你好！我是 AIDJ，你的专属音乐 DJ 🎵 根据${rec.weatherContext}，我为你选了一首很棒的歌——《${rec.songName}》，${rec.artist}，希望你会喜欢 🎧`
      : `欢迎回来！根据你的品味，我为你准备了今日专属歌曲 🎵 让我为你播放...`

    if (isFirstTime) markAsVisited()

    const audioBase64 = await generateTTS(text)
    if (audioBase64) {
      const audio = new Audio()
      audio.onended = () => {
        setIsAIDJSpeaking(false)
        if (!isFirstTime) showToast('success', '今日推荐已更新 🎵', toasts, setToasts)
      }
      audio.onerror = (e) => {
        console.error('[TTS] audio error:', e)
        setIsAIDJSpeaking(false)
      }
      audio.oncanplay = async () => {
        try {
          await audio.play()
        } catch (err) {
          console.error('[TTS] play error:', err)
          setIsAIDJSpeaking(false)
        }
      }
      audio.src = `data:audio/mp3;base64,${audioBase64}`
      audio.load()
    } else {
      setIsAIDJSpeaking(false)
    }
  }

  async function fetchAudioUrl(songId: string): Promise<string | null> {
    try {
      const data = await fetch(`/api/netease-player?action=url&songId=${songId}`).then(r => r.json())
      if (data.success && data.data?.url) return data.data.url
    } catch (e) { console.error('fetchAudioUrl error:', e) }
    return null
  }

  const tryPlaySong = async (songId: string, attempts = 0): Promise<boolean> => {
    const maxAttempts = 3
    if (attempts >= maxAttempts) {
      showToast('warning', USER_FRIENDLY_ERRORS.playback, toasts, setToasts)
      return false
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }

    const url = await fetchAudioUrl(songId)
    if (!url) {
      try {
        const res = await fetch('/api/aidj', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'next', excludeIds: [songId] })
        })
        const data = await res.json()
        if (data.success && data.data?.songId) {
          setRecommendation(data.data)
          return tryPlaySong(data.data.songId, attempts + 1)
        }
      } catch (e) { console.error('tryPlaySong retry error:', e) }
      return false
    }

    if (audioRef.current) {
      audioRef.current.src = url
      audioRef.current.load()
      try {
        await audioRef.current.play()
        setIsPlaying(true)
        return true
      } catch { setIsPlaying(false); return false }
    }
    return false
  }

  const handlePlayPause = async () => {
    userInteractedRef.current = true
    if (!recommendation?.songId || !isLoggedIn) return
    if (!isPlaying) {
      await tryPlaySong(recommendation.songId)
    } else {
      if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false) }
    }
  }

  const handleNext = async () => {
    try {
      const res = await fetch('/api/aidj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'next', excludeIds: [] })
      })
      const data = await res.json()
      if (data.success && data.data) {
        setRecommendation(data.data)
        setProgress(0)
        setIsPlaying(false)
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
        if (data.data.songId) await tryPlaySong(data.data.songId)
      }
    } catch (err) { console.error('Next failed:', err) }
  }

  const handlePrev = () => {
    setProgress(0)
    if (audioRef.current) audioRef.current.currentTime = 0
  }

  const handleSkipSong = async () => {
    if (!recommendation) return
    try {
      const response = await fetch('/api/aidj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'next', excludeIds: [recommendation.songId] })
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
    } catch { showToast('error', USER_FRIENDLY_ERRORS.playback, toasts, setToasts) }
  }

  const handleLike = () => {
    if (!recommendation) return
    saveFeedback({ songId: recommendation.songId, songName: recommendation.songName, artist: recommendation.artist, action: 'like', timestamp: Date.now(), weatherContext: recommendation.weatherContext, recommendedBy: 'weather' })
    setActiveFeedbackBtn('like')
    setTimeout(() => setActiveFeedbackBtn(null), 300)
    showToast('success', '感谢你的反馈！', toasts, setToasts)
  }

  const handleDislike = () => {
    if (!recommendation) return
    saveFeedback({ songId: recommendation.songId, songName: recommendation.songName, artist: recommendation.artist, action: 'dislike', timestamp: Date.now(), weatherContext: recommendation.weatherContext, recommendedBy: 'weather' })
    setActiveFeedbackBtn('dislike')
    setTimeout(() => setActiveFeedbackBtn(null), 300)
    showToast('info', '已换一首 🎵', toasts, setToasts)
    handleSkipSong()
  }

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const msg = chatInput
    setChatInput('')
    setChatHistory(prev => [...prev, { role: 'user', text: msg }])
    setChatLoading(true)
    try {
      const res = await fetch('/api/aidj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: msg })
      })
      const data = await res.json()
      if (data.success) {
        setChatHistory(prev => [...prev, { role: 'aidj', text: data.data.reply }])
        if (data.data.audio) {
          const audio = new Audio(`data:audio/mp3;base64,${data.data.audio}`)
          audio.play().catch(console.error)
        }
      } else {
        setChatHistory(prev => [...prev, { role: 'aidj', text: '抱歉，DJ暂时无法回应，请稍后再试。' }])
      }
    } catch { showToast('error', USER_FRIENDLY_ERRORS.chat, toasts, setToasts) }
    finally { setChatLoading(false) }
  }

  const playSong = async (item: PlaylistItem, idx: number) => {
    userInteractedRef.current = true
    if (!isLoggedIn) return
    setCurrentIndex(idx)
    setProgress(0)
    setIsPlaying(false)
    playlistPlayRef.current = true
    setRecommendation({ songId: item.id, songName: item.songName, artist: item.artist, mood: '', reason: '', weatherContext: weather ? `${weather.city}${weather.description}` : '' })
    await tryPlaySong(item.id)
    playlistPlayRef.current = false
  }

  const toggleFavorite = async (songId: string, songName: string, artist: string) => {
    const isFav = favoriteIds.has(songId)
    try {
      if (isFav) {
        await fetch(`/api/favorites?id=${encodeURIComponent(songId)}`, { method: 'DELETE' })
        setFavoriteIds(prev => { const next = new Set(prev); next.delete(songId); return next })
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songId, songName, artist, addedAt: Date.now() })
        })
        setFavoriteIds(prev => new Set(prev).add(songId))
      }
    } catch (e) { console.error('Failed to toggle favorite:', e) }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="text-center">
          <div className="status-live justify-center mb-4">
            <div className="status-live-dot" />
          </div>
          <p className="hud-label">INITIALIZING</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Background effects */}
      <div className="ambient-light-primary" />
      <div className="ambient-light-secondary" />
      <div className="ambient-light-tertiary" />
      <div className="scanlines" />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      {/* Speaking indicator */}
      <SpeakingIndicator isAIDJSpeaking={isAIDJSpeaking} />

      {/* Login Modal */}
      {showLoginModal && (
        <NeteaseLoginModal onSuccess={handleLoginSuccess} onClose={() => setShowLoginModal(false)} />
      )}

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        preload="auto"
        onEnded={() => { setIsPlaying(false); setProgress(0); handleNext() }}
        onError={() => setIsPlaying(false)}
        onCanPlay={() => { if (audioRef.current) audioRef.current.volume = volume / 100 }}
      />

      {/* Main container */}
      <div className="min-h-screen flex flex-col max-w-md mx-auto px-6 py-8 relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-12 fade-in">
          <div className="indicator-dots">
            <div className="indicator-dot" />
            <div className="indicator-dot" />
            <div className="indicator-dot" />
          </div>
          <div className="flex items-center gap-2">
            {weatherLoading ? (
              <div className="weather-skeleton">
                <div className="skeleton weather-skeleton-icon" />
                <div className="skeleton weather-skeleton-text" />
              </div>
            ) : weather ? (
              <>
                <span className="weather-icon">{conditionIcons[weather.condition]}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{weather.temperature}°</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Central Clock */}
        <Clock currentTime={currentTime} currentDate={currentDate} isPlaying={isPlaying} />

        {/* Now Playing */}
        <div className="glass-panel p-6 mb-6 slide-up delay-2">
          <NowPlaying
            recommendation={recommendation}
            progress={progress}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center mb-8 slide-up delay-3">
          <PlaybackControls
            isPlaying={isPlaying}
            isLoggedIn={isLoggedIn}
            recommendation={recommendation}
            activeFeedbackBtn={activeFeedbackBtn}
            onPrev={handlePrev}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onSkip={handleSkipSong}
            onLike={handleLike}
            onDislike={handleDislike}
          />
        </div>

        {/* Volume */}
        <div className="volume-container mb-8 px-4 slide-up delay-4">
          <VolumeSlider volume={volume} onVolumeChange={setVolume} />
        </div>

        {/* AI Chat Panel */}
        <div className="glass-panel p-5 mb-6 slide-up delay-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="status-live">
              <div className="status-live-dot" />
            </div>
            <p className="hud-label">AIDJ</p>
          </div>
          <AIChatPanel chatHistory={chatHistory} chatLoading={chatLoading} />
          <div className="mt-4">
            <ChatInput value={chatInput} onChange={setChatInput} onSubmit={handleChat} />
          </div>
        </div>

        {/* Playlist */}
        <div className="glass-panel p-4 mb-8 max-h-64 overflow-y-auto slide-up delay-6">
          <PlaylistPanel
            playlist={playlist}
            currentIndex={currentIndex}
            isPlaying={isPlaying}
            favoriteIds={favoriteIds}
            onPlaySong={playSong}
            onToggleFavorite={toggleFavorite}
          />
        </div>

        {/* Bottom Status */}
        <StatusBar
          isLoggedIn={isLoggedIn}
          nickname={nickname}
          isPlaying={isPlaying}
          onLoginClick={() => setShowLoginModal(true)}
        />

      </div>
    </>
  )
}