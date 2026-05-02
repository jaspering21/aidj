'use client'

import { useState, useEffect, useRef } from 'react'
import NeteaseLoginModal from './components/NeteaseLoginModal'
import { withRetry } from '@/lib/retry'
import { FiRefreshCw } from 'react-icons/fi'

interface WeatherData {
  city: string
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy'
  temperature: number
  description: string
}

interface SongRecommendation {
  songId: string
  songName: string
  artist: string
  reason: string
  mood: string
  youtubeId: string
  youtubeUrl: string
  neteaseUrl?: string
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
  youtubeId?: string
  youtubeUrl?: string
  neteaseUrl?: string
}

interface UserPreferences {
  volume: number
  lastPlayedSongId?: string
  preferredMood?: string
  autoPlay: boolean
  ttsEnabled: boolean
}

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

function showToast(type: Toast['type'], message: string, toasts: Toast[], setToasts: React.Dispatch<React.SetStateAction<Toast[]>>) {
  const id = Date.now().toString()
  setToasts([...toasts, { id, type, message }])
  setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, 4000)
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
          const data = await withRetry(() =>
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`).then(r => r.json())
          )
          const cw = data.current_weather
          const map: Record<number, WeatherData['condition']> = {
            0: 'sunny', 1: 'sunny', 2: 'cloudy', 3: 'cloudy',
            45: 'cloudy', 48: 'cloudy', 51: 'rainy', 53: 'rainy', 55: 'rainy',
            61: 'rainy', 63: 'rainy', 65: 'rainy', 71: 'snowy', 73: 'snowy', 75: 'snowy',
            80: 'rainy', 82: 'rainy', 95: 'rainy'
          }
          const condition = map[Math.floor(cw.weathercode / 100) * 100] || 'sunny'
          const descMap: Record<string, string> = { sunny: '晴', cloudy: '多云', rainy: '小雨', snowy: '小雪' }
          resolve({
            city: '当前位置',
            condition,
            temperature: Math.round(cw.temperature),
            description: descMap[condition]
          })
        } catch {
          resolve({ city: '北京', condition: 'sunny', temperature: 22, description: '晴' })
        }
      },
      () => resolve({ city: '北京', condition: 'sunny', temperature: 22, description: '晴' })
    )
  })
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
  const [recommendationLoading, setRecommendationLoading] = useState(true)
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
  const [autoPlay, setAutoPlay] = useState(true)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [preferredMood, setPreferredMood] = useState<string | undefined>(undefined)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
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

  // Track user interaction
  useEffect(() => {
    const handler = () => { userInteractedRef.current = true }
    window.addEventListener('click', handler, { once: true })
    window.addEventListener('touchstart', handler, { once: true })
    window.addEventListener('keydown', handler, { once: true })
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('touchstart', handler)
      window.removeEventListener('keydown', handler)
    }
  }, [])

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
          if (duration > 0) {
            setProgress((currentTime / duration) * 100)
          }
        }
      }, 500)
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current) }
  }, [isPlaying])

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  // Save volume preference when it changes
  useEffect(() => {
    const saveVolume = async () => {
      try {
        await fetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ volume })
        })
      } catch (e) {
        console.error('Failed to save volume preference:', e)
      }
    }
    saveVolume()
  }, [volume])

  // Save autoPlay preference when it changes
  useEffect(() => {
    const saveAutoPlay = async () => {
      try {
        await fetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ autoPlay })
        })
      } catch (e) {
        console.error('Failed to save autoPlay preference:', e)
      }
    }
    saveAutoPlay()
  }, [autoPlay])

  // Save ttsEnabled preference when it changes
  useEffect(() => {
    const saveTts = async () => {
      try {
        await fetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ttsEnabled })
        })
      } catch (e) {
        console.error('Failed to save ttsEnabled preference:', e)
      }
    }
    saveTts()
  }, [ttsEnabled])

  // Save preferredMood preference when it changes
  useEffect(() => {
    const saveMood = async () => {
      try {
        await fetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferredMood })
        })
      } catch (e) {
        console.error('Failed to save preferredMood preference:', e)
      }
    }
    saveMood()
  }, [preferredMood])

  const init = async () => {
    setIsLoading(true)
    setWeatherLoading(true)
    setRecommendationLoading(true)
    setPlaylistLoading(true)
    try {
      // Load user preferences
      try {
        const prefsRes = await fetch('/api/preferences')
        if (prefsRes.ok) {
          const prefsData = await prefsRes.json()
          if (prefsData.success && prefsData.data) {
            setVolume(prefsData.data.volume ?? 70)
            setAutoPlay(prefsData.data.autoPlay ?? true)
            setTtsEnabled(prefsData.data.ttsEnabled ?? true)
            setPreferredMood(prefsData.data.preferredMood)
          }
        }
      } catch (e) {
        console.error('Failed to load preferences:', e)
      }

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
      } catch (e) {
        console.error('Failed to load favorites:', e)
      }

      const [w, rec] = await Promise.all([
        fetchWeatherByLocation().then(data => {
          setWeatherLoading(false)
          return data
        }).catch(() => {
          setWeatherLoading(false)
          return null
        }),
        fetch('/api/aidj?action=recommend').then(async r => {
          if (!r.ok) throw new Error('network')
          const data = await r.json()
          setRecommendationLoading(false)
          return data
        }).catch(() => {
          setRecommendationLoading(false)
          return null
        })
      ])
      setWeather(w)

      // AIDJ Onboarding: Get recommendation and play welcome message
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

            setTimeout(() => {
              playWelcomeMessage(recommendationCtx)
            }, 1000)
          }
        } catch (error) {
          console.error('Failed to initialize recommendation:', error)
        }
      }

      if (rec?.success) {
        setRecommendation(rec.data)
      } else {
        showToast('error', USER_FRIENDLY_ERRORS.network, toasts, setToasts)
      }

      setPlaylistLoading(true)
      const lines = await fetch('/playlist_2205555594.txt').then(r => r.text()).catch(() => {
        throw new Error('playlist')
      })
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
    } catch (err: unknown) {
      const error = err as Error
      if (error.message === 'network') {
        showToast('error', USER_FRIENDLY_ERRORS.network, toasts, setToasts)
      } else if (error.message === 'playlist') {
        showToast('error', USER_FRIENDLY_ERRORS.playlist, toasts, setToasts)
      } else {
        showToast('error', USER_FRIENDLY_ERRORS.network, toasts, setToasts)
      }
    } finally {
      setIsLoading(false)
      setWeatherLoading(false)
      setRecommendationLoading(false)
      setPlaylistLoading(false)
    }
  }

  const handleLoginSuccess = (name: string, cookie: string) => {
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
    } catch {
      return ''
    }
  }

  async function playWelcomeMessage(rec: RecommendationContext) {
    setIsAIDJSpeaking(true)

    const text = `你好！我是 AIDJ，你的专属音乐 DJ。根据${rec.weatherContext}，我为你选了一首很棒的歌——《${rec.songName}》，${rec.artist}，希望你会喜欢`

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

  const fetchAudioUrl = async (songId: string): Promise<string | null> => {
    try {
      const data = await withRetry(() =>
        fetch(`/api/netease-player?action=url&songId=${songId}`).then(async r => {
          if (!r.ok) throw new Error(`API error: ${r.status}`)
          return r.json()
        })
      )
      if (data.success && data.data?.url) {
        return data.data.url
      }
      console.log('fetchAudioUrl: song', songId, 'URL is null')
    } catch (e) {
      console.error('fetchAudioUrl error:', e)
    }
    return null
  }

  // Try to play a song, auto-skip if unavailable (max 3 attempts)
  const tryPlaySong = async (songId: string, attempts = 0): Promise<boolean> => {
    const maxAttempts = 3
    if (attempts >= maxAttempts) {
      showToast('warning', USER_FRIENDLY_ERRORS.playback, toasts, setToasts)
      setChatHistory(prev => [...prev, { role: 'aidj', text: USER_FRIENDLY_ERRORS.playback }])
      return false
    }

    // Clear previous audio state first
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }

    const url = await fetchAudioUrl(songId)
    if (!url) {
      // Song unavailable - get next song and retry
      const excludeIds = [songId]
      try {
        const res = await fetch('/api/aidj', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'next', excludeIds })
        })
        const data = await res.json()
        if (data.success && data.data?.songId) {
          setRecommendation(data.data)
          setProgress(0)
          setIsPlaying(false)
          // Recursively try the next song
          return tryPlaySong(data.data.songId, attempts + 1)
        }
      } catch (e) {
        console.error('tryPlaySong retry error:', e)
      }
      return false
    }

    if (audioRef.current) {
      audioRef.current.src = url
      audioRef.current.load()
      try {
        await audioRef.current.play()
        setIsPlaying(true)
        // Add to play history
        try {
          await fetch('/api/play-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              songId: songId,
              songName: recommendation?.songName || '',
              artist: recommendation?.artist || '',
              playedAt: Date.now()
            })
          })
        } catch (e) {
          console.error('Failed to add to play history:', e)
        }
        // Save lastPlayedSongId preference
        try {
          await fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lastPlayedSongId: songId })
          })
        } catch (e) {
          console.error('Failed to save lastPlayedSongId preference:', e)
        }
        return true
      } catch (err) {
        console.error('Playback failed:', err)
        setIsPlaying(false)
        return false
      }
    }
    return false
  }

  const handlePlayPause = async () => {
    userInteractedRef.current = true
    if (!recommendation?.songId || !isLoggedIn) return
    if (!isPlaying) {
      const success = await tryPlaySong(recommendation.songId)
      if (!success) {
        // No playable URL found
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        setIsPlaying(false)
      }
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
      if (data.success) {
        const newRec = data.data
        setRecommendation(newRec)
        setProgress(0)
        setIsPlaying(false)
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
        if (newRec.songId) {
          await tryPlaySong(newRec.songId)
        }
      }
    } catch (err) { console.error('Next failed:', err) }
  }

  const handlePrev = () => {
    setProgress(0)
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
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
      if (!res.ok) throw new Error('timeout')
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
    } catch (err) {
      showToast('error', USER_FRIENDLY_ERRORS.chat, toasts, setToasts)
    } finally {
      setChatLoading(false)
    }
  }

  const playSong = async (item: PlaylistItem, idx: number) => {
    userInteractedRef.current = true
    if (!isLoggedIn) return
    setCurrentIndex(idx)
    setProgress(0)
    setIsPlaying(false)
    playlistPlayRef.current = true
    setRecommendation({
      songId: item.id,
      songName: item.songName,
      artist: item.artist,
      reason: '',
      mood: '',
      weatherContext: weather ? `${weather.city}${weather.description}` : '',
      youtubeId: '',
      youtubeUrl: ''
    })

    await tryPlaySong(item.id)
    playlistPlayRef.current = false
  }

  const toggleFavorite = async (songId: string, songName: string, artist: string) => {
    const isFav = favoriteIds.has(songId)
    try {
      if (isFav) {
        await fetch(`/api/favorites?id=${encodeURIComponent(songId)}`, { method: 'DELETE' })
        setFavoriteIds(prev => {
          const next = new Set(prev)
          next.delete(songId)
          return next
        })
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songId, songName, artist, addedAt: Date.now() })
        })
        setFavoriteIds(prev => new Set(prev).add(songId))
      }
    } catch (e) {
      console.error('Failed to toggle favorite:', e)
    }
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
      {/* Global ambient light layers */}
      <div className="ambient-light-primary" />
      <div className="ambient-light-secondary" />
      <div className="ambient-light-tertiary" />
      <div className="scanlines" />

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'error' && '⚠️'}
              {toast.type === 'warning' && '⚡'}
              {toast.type === 'success' && '✓'}
              {toast.type === 'info' && 'ℹ️'}
            </span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>×</button>
          </div>
        ))}
      </div>

      {/* Main container */}
      <div className="min-h-screen flex flex-col max-w-md mx-auto px-6 py-8 relative z-10">

        {/* Login Modal */}
        {showLoginModal && (
          <NeteaseLoginModal
            onSuccess={handleLoginSuccess}
            onClose={() => setShowLoginModal(false)}
          />
        )}

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          preload="auto"
          onEnded={() => {
            setIsPlaying(false)
            setProgress(0)
            handleNext()
          }}
          onError={() => setIsPlaying(false)}
          onCanPlay={() => { if (audioRef.current) audioRef.current.volume = volume / 100 }}
        />

        {/* Header - Minimal */}
        <div className="flex items-center justify-between mb-16 fade-in">
          {/* Left - System status dots */}
          <div className="indicator-dots">
            <div className="indicator-dot" />
            <div className="indicator-dot" />
            <div className="indicator-dot" />
          </div>

          {/* Right - Weather */}
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

        {/* Speaking Indicator */}
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

        {/* Central Clock - Dominant Element */}
        <div className="clock-container slide-up delay-1">
          <div className="clock-glow" />
          <div className="time-display font-display clock-digit" style={{ fontSize: '4rem', position: 'relative', zIndex: 1 }}>
            {currentTime || '00:00:00'}
          </div>
          <div className="clock-date">{currentDate}</div>
        </div>

        {/* Spacer */}
        <div className="h-12" />

        {/* Now Playing */}
        <div className="glass-panel p-6 mb-6 slide-up delay-2">
          <div className="flex items-center justify-between mb-4">
            <p className="hud-label">NOW PLAYING</p>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{Math.round(progress)}%</span>
          </div>

          <div className="progress-container mb-4">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {recommendationLoading ? (
            <div className="skeleton-lines">
              <div className="skeleton skeleton-text title"></div>
              <div className="skeleton skeleton-text subtitle"></div>
            </div>
          ) : (
            <>
              <h2 className="font-display text-lg mb-1 truncate tracking-wide song-title" style={{ color: 'var(--text-primary)' }}>
                {recommendation?.songName || '---'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {recommendation?.artist || '未知歌手'}
              </p>
              {recommendation?.songId && (
                <button
                  onClick={() => toggleFavorite(recommendation.songId, recommendation.songName, recommendation.artist)}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '1rem',
                    border: `1px solid ${favoriteIds.has(recommendation.songId) ? 'var(--neon-pink)' : 'var(--text-muted)'}`,
                    background: favoriteIds.has(recommendation.songId) ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                    color: favoriteIds.has(recommendation.songId) ? 'var(--neon-pink)' : 'var(--text-muted)',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {favoriteIds.has(recommendation.songId) ? '♥ 已收藏' : '♡ 收藏'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-8 mb-10 slide-up delay-3">
          <button onClick={handlePrev} className="control-btn" disabled={!isLoggedIn}>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <button
            onClick={handlePlayPause}
            className={`control-btn-play ${isPlaying ? 'playing' : ''}`}
            disabled={!isLoggedIn || !recommendation?.songId}
          >
            {!recommendation?.songId ? (
              <div className="loading-spinner" />
            ) : isPlaying ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
              </svg>
            ) : (
              <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          <button onClick={handleNext} className="control-btn" disabled={!isLoggedIn}>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6z"/>
            </svg>
          </button>

          <button
            onClick={handleSkipSong}
            className="control-btn"
            style={{ minWidth: '44px', minHeight: '44px' }}
            title="换一首"
          >
            <FiRefreshCw size={20} />
          </button>
        </div>

        {/* Volume */}
        <div className="volume-container mb-10 px-4 slide-up delay-4">
          <svg className="volume-icon w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="volume-slider"
          />
        </div>

        {/* AI DJ Chat */}
        <div className="glass-panel p-5 mb-6 slide-up delay-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="status-live">
              <div className="status-live-dot" />
            </div>
            <p className="hud-label">AIDJ</p>
          </div>

          <div className="space-y-3 mb-4 max-h-32 overflow-y-auto">
            {chatHistory.length === 0 && !chatLoading && (
              <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                与 AI DJ 对话...
              </p>
            )}
            {chatLoading && (
              <div className="chat-bubble chat-bubble-ai">
                <div className="chat-role ai-label">DJ</div>
                <div className="thinking-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}
              >
                <div className={`chat-role ${msg.role === 'user' ? 'user-label' : 'ai-label'}`}>
                  {msg.role === 'user' ? 'YOU' : 'DJ'}
                </div>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{msg.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleChat}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="发送消息..."
              className="chat-input"
            />
          </form>
        </div>

        {/* Playlist */}
        <div className="glass-panel p-4 mb-8 max-h-48 overflow-y-auto slide-up delay-6" style={{ overflow: 'visible' }}>
          <p className="hud-label mb-3">PLAYLIST</p>
          {playlistLoading ? (
            <div className="skeleton-lines">
              <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '85%' }}></div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="space-y-1">
              {playlist.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => playSong(item, idx)}
                className={`playlist-item ${currentIndex === idx ? 'active' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-xs w-5 text-center" style={{
                    color: currentIndex === idx ? 'var(--neon-purple)' : 'var(--text-muted)',
                    opacity: currentIndex === idx ? 0.8 : 0.4
                  }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p style={{
                      fontSize: '0.85rem',
                      color: currentIndex === idx ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}>
                      {item.songName}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.artist}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(item.id, item.songName, item.artist)
                    }}
                    style={{
                      padding: '0.25rem',
                      color: favoriteIds.has(item.id) ? 'var(--neon-pink)' : 'var(--text-muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    {favoriteIds.has(item.id) ? '♥' : '♡'}
                  </button>
                  {currentIndex === idx && isPlaying && (
                    <div className="sound-bar">
                      <span /><span /><span /><span />
                    </div>
                  )}
                </div>
              </div>
            ))}
            </div>
            </div>
          )}
        </div>

        {/* Bottom Status */}
        <div className="flex items-center justify-between mt-auto fade-in delay-6">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <div className="status-live">
                <div className="status-live-dot" style={{
                  background: isPlaying ? 'var(--neon-green)' : 'var(--text-muted)',
                  boxShadow: isPlaying ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
                  animation: isPlaying ? 'live-pulse 2s ease-in-out infinite' : 'none'
                }} />
                <span className={`status-text ${isPlaying ? 'live' : ''}`}>
                  {isPlaying ? 'ON AIR' : 'STANDBY'}
                </span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{nickname}</span>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="control-btn px-4 py-2"
            >
              <span style={{ color: 'var(--neon-cyan)', fontSize: '0.7rem', letterSpacing: '0.2em' }}>LOGIN</span>
            </button>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>AIDJ v2.0</span>
        </div>
      </div>
    </>
  )
}
