'use client'

import { useState, useEffect, useRef } from 'react'
import NeteaseLoginModal from './components/NeteaseLoginModal'

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

const conditionIcons: Record<string, string> = {
  sunny: '☀️',
  cloudy: '⛅',
  rainy: '🌧️',
  snowy: '❄️'
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
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`)
          const data = await res.json()
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
  const [progress, setProgress] = useState(0)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [recommendation, setRecommendation] = useState<SongRecommendation | null>(null)
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'aidj'; text: string}[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [nickname, setNickname] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)
  const autoPlayAttemptedRef = useRef(false)
  const userInteractedRef = useRef(false)
  const playlistPlayRef = useRef(false)

  useEffect(() => {
    init()
  }, [])

  // Track user interaction for audio playback policy
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

  // Auto-play when recommendation changes or login completes
  useEffect(() => {
    const timer = setTimeout(() => {
      // Skip if playlist play is in progress (it will handle playback)
      if (playlistPlayRef.current) return
      if (!recommendation?.songId || !isLoggedIn || !audioRef.current || !userInteractedRef.current) return
      // Skip if audio element has no valid source yet or is already playing
      if (!audioRef.current.src || audioRef.current.src === window.location.href) return
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error)
    }, 300)
    return () => clearTimeout(timer)
  }, [recommendation?.songId, isLoggedIn])

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

  const init = async () => {
    setIsLoading(true)
    try {
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

      const [w, rec] = await Promise.all([
        fetchWeatherByLocation(),
        fetch('/api/aidj?action=recommend').then(r => r.json())
      ])
      setWeather(w)
      if (rec.success) {
        setRecommendation(rec.data)
      }

      const lines = await fetch('/playlist_2205555594.txt').then(r => r.text())
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
    } catch (err) {
      console.error('Init failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginSuccess = (name: string, cookie: string) => {
    setIsLoggedIn(true)
    setNickname(name)
    setShowLoginModal(false)
  }

  const handlePlayPause = async () => {
    userInteractedRef.current = true
    if (!recommendation?.songId || !isLoggedIn) return
    if (!isPlaying) {
      if (audioRef.current) {
        // If no src loaded, fetch URL first
        if (!audioRef.current.src || audioRef.current.src === '' || audioRef.current.src === window.location.href) {
          const url = await fetchAudioUrl(recommendation.songId)
          if (url && audioRef.current) {
            audioRef.current.src = url
            audioRef.current.load()
          }
        }
        audioRef.current.play().then(() => {
          setIsPlaying(true)
        }).catch(console.error)
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        setIsPlaying(false)
      }
    }
  }

  const fetchAudioUrl = async (songId: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/netease-player?action=url&songId=${songId}`)
      const data = await res.json()
      if (data.success && data.data?.url) {
        return data.data.url
      }
      console.error('fetchAudioUrl failed:', data.error || 'no url in response')
    } catch { }
    return null
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
          const url = await fetchAudioUrl(newRec.songId)
          if (url && audioRef.current) {
            audioRef.current.src = url
            audioRef.current.load()
            audioRef.current.play().then(() => {
              setIsPlaying(true)
            }).catch(console.error)
          }
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
    // Add user message to history
    setChatHistory(prev => [...prev, { role: 'user', text: msg }])
    try {
      const res = await fetch('/api/aidj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: msg })
      })
      const data = await res.json()
      if (data.success) {
        // Add AI response to history
        setChatHistory(prev => [...prev, { role: 'aidj', text: data.data.reply }])
        if (data.data.audio) {
          const audio = new Audio(`data:audio/mp3;base64,${data.data.audio}`)
          // This plays after user interaction so should be fine
          audio.play().catch(console.error)
        }
      }
    } catch (err) { console.error('Chat failed:', err) }
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
      youtubeId: '',
      youtubeUrl: ''
    })

    const url = await fetchAudioUrl(item.id)
    if (!url) {
      console.error('Song unavailable:', item.songName)
      playlistPlayRef.current = false
      setChatHistory(prev => [...prev, { role: 'aidj', text: `抱歉，《${item.songName}》暂时无法播放，请尝试其他歌曲。` }])
      setIsPlaying(false)
      return
    }

    if (audioRef.current) {
      audioRef.current.src = url
      audioRef.current.load()
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true)
        }).catch((err) => {
          console.error('Playback failed:', err)
          setChatHistory(prev => [...prev, { role: 'aidj', text: `播放失败，请检查网络或刷新页面重试。` }])
          setIsPlaying(false)
        }).finally(() => {
          playlistPlayRef.current = false
        })
      } else {
        playlistPlayRef.current = false
      }
    } else {
      playlistPlayRef.current = false
    }
  }

  const now = new Date()
  const dateStr = `${now.getMonth() + 1}.${now.getDate()}`
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const weekDay = weekDays[now.getDay()]
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="glass-panel p-8 text-center">
          <div className="status-dot on-air mx-auto mb-4" />
          <p className="hud-label">INITIALIZING</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto p-4 pb-8 relative z-10">
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
        onError={(e) => {
          console.error('Audio error:', e)
          setIsPlaying(false)
        }}
        onCanPlay={() => {
          if (audioRef.current) audioRef.current.volume = 0.8
        }}
      />

      {/* Header - Dot Matrix Time */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="hud-label mb-1">DATE</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{dateStr} · {weekDay}</p>
        </div>
        <div className="text-right">
          <p className="hud-label mb-1">TIME</p>
          <p className="time-display">{timeStr}</p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="status-indicator">
          {isPlaying ? (
            <div className="on-air-badge">
              <div className="dot" />
              <span className="text-xs uppercase tracking-widest text-glow-green" style={{ color: 'var(--accent-neon-green)' }}>ON AIR</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="status-dot standby" />
              <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>STANDBY</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {conditionIcons[weather?.condition || 'sunny']} {weather?.temperature}°C
          </span>
        </div>
      </div>

      {/* Now Playing - Glass Panel */}
      <div className="glass-panel p-5 mb-4">
        <p className="hud-label mb-3">NOW PLAYING</p>
        <div className="progress-groove h-1.5 mb-4">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <h2 className="text-lg font-medium mb-1 truncate text-glow-cyan" style={{ color: 'var(--text-primary)' }}>
          {recommendation?.songName || '---'}
        </h2>
        <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
          {recommendation?.artist || '未知歌手'}
        </p>
      </div>

      {/* Playback Controls - Spaceship Console */}
      <div className="console-panel mb-4">
        {/* Left tick marks */}
        <div className="console-ticks" style={{ position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <div className="console-tick" />
          <div className="console-tick" />
          <div className="console-tick" />
          <div className="console-tick" />
        </div>

        {/* Right tick marks */}
        <div className="console-ticks" style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <div className="console-tick" style={{ background: 'linear-gradient(90deg, transparent, var(--accent-neon-purple))' }} />
          <div className="console-tick" style={{ background: 'linear-gradient(90deg, transparent, var(--accent-neon-purple))' }} />
          <div className="console-tick" style={{ background: 'linear-gradient(90deg, transparent, var(--accent-neon-purple))' }} />
          <div className="console-tick" style={{ background: 'linear-gradient(90deg, transparent, var(--accent-neon-purple))' }} />
        </div>

        <div className="flex items-center justify-center gap-10">
          <button onClick={handlePrev} className="console-btn p-3 rounded-lg">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>
          <button
            onClick={handlePlayPause}
            className={`console-btn-play flex items-center justify-center ${isPlaying ? 'playing' : ''} ${!isLoggedIn ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {isPlaying ? (
              <svg className="w-7 h-7 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
              </svg>
            ) : (
              <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
          <button onClick={handleNext} className="console-btn p-3 rounded-lg">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* DJ Chat Interface - Holographic Comm Panel */}
      <div className="chat-panel p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="status-dot on-air" />
          <span className="hud-label">AIDJ CHAT</span>
        </div>

        {/* Chat History */}
        <div className="space-y-3 mb-3 max-h-40 overflow-y-auto">
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-aidy'}`}
            >
              <div className={`chat-role ${msg.role === 'user' ? 'you' : 'dj'}`}>
                {msg.role === 'user' ? 'YOU' : 'DJ'}
              </div>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{msg.text}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleChat} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Transmit message..."
            className="input-holo flex-1 px-4 py-2 text-sm"
          />
          <button type="submit" className="console-btn px-4 py-2 rounded-lg text-sm">
            →
          </button>
        </form>
      </div>

      {/* Playlist - Holographic Panel */}
      <div className="playlist-panel p-4 max-h-48 overflow-y-auto">
        <p className="hud-label mb-3">PLAYLIST</p>
        <div className="space-y-2">
          {playlist.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => isLoggedIn && playSong(item, idx)}
              className={`playlist-item ${
                currentIndex === idx ? 'playlist-item-active' : ''
              } ${!isLoggedIn ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs w-5 text-center font-mono" style={{ color: currentIndex === idx ? 'var(--accent-neon-green)' : 'var(--text-muted)' }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: currentIndex === idx ? 'var(--accent-neon-green)' : 'var(--text-primary)' }}>
                    {item.songName}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.artist}</p>
                </div>
                {currentIndex === idx && isPlaying && (
                  <div className="sound-bar">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Status */}
      <div className="mt-4 flex items-center justify-between">
        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            <div className="status-dot on-air" />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{nickname}</span>
          </div>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            className="console-btn px-4 py-2 rounded-lg text-sm"
            style={{ borderColor: 'rgba(0, 255, 136, 0.3)', color: 'var(--accent-neon-green)' }}
          >
            LOGIN
          </button>
        )}
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>AIDJ v1.0</span>
      </div>

      <style>{`
        @keyframes soundBar {
          0% { height: 3px; }
          100% { height: 10px; }
        }
      `}</style>
    </div>
  )
}