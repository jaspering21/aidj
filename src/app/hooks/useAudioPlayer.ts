'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface PlaylistItem {
  id: string
  songName: string
  artist: string
}

interface RecommendationContext {
  songId: string
  songName: string
  artist: string
  mood: string
  reason: string
  weatherContext: string
}

interface UseAudioPlayerReturn {
  isPlaying: boolean
  progress: number
  audioRef: React.RefObject<HTMLAudioElement | null>
  tryPlaySong: (songId: string, attempts?: number) => Promise<boolean>
  handlePlayPause: () => Promise<void>
  handleNext: () => Promise<void>
  handlePrev: () => void
  setIsPlaying: (playing: boolean) => void
  setProgress: (progress: number) => void
}

const USER_FRIENDLY_ERRORS = {
  playback: '该歌曲暂时无法播放，将为你切换下一首',
}

export function useAudioPlayer(
  recommendation: RecommendationContext | null,
  weather: { description?: string; city?: string } | null
): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

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

  const fetchAudioUrl = useCallback(async (songId: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/netease-player?action=url&songId=${songId}`)
      const data = await response.json()
      if (data.success && data.data?.url) {
        return data.data.url
      }
    } catch (e) {
      console.error('fetchAudioUrl error:', e)
    }
    return null
  }, [])

  const tryPlaySong = useCallback(async (songId: string, attempts = 0): Promise<boolean> => {
    const maxAttempts = 3
    if (attempts >= maxAttempts) {
      return false
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }

    const url = await fetchAudioUrl(songId)
    if (!url) {
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
  }, [recommendation?.songName, recommendation?.artist])

  const handlePlayPause = useCallback(async () => {
    if (!recommendation?.songId) return
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
  }, [recommendation?.songId, isPlaying, tryPlaySong])

  const handleNext = useCallback(async () => {
    try {
      const res = await fetch('/api/aidj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'next', excludeIds: [] })
      })
      const data = await res.json()
      if (data.success) {
        setProgress(0)
        setIsPlaying(false)
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
      }
    } catch (err) { console.error('Next failed:', err) }
  }, [])

  const handlePrev = useCallback(() => {
    setProgress(0)
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
  }, [])

  return {
    isPlaying,
    progress,
    audioRef,
    tryPlaySong,
    handlePlayPause,
    handleNext,
    handlePrev,
    setIsPlaying,
    setProgress
  }
}