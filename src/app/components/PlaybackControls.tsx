'use client'

import { FiRefreshCw } from 'react-icons/fi'

interface PlaybackControlsProps {
  isPlaying: boolean
  isLoggedIn: boolean
  recommendation: { songId: string } | null
  activeFeedbackBtn: 'like' | 'dislike' | null
  onPrev: () => void
  onPlayPause: () => void
  onNext: () => void
  onSkip: () => void
  onLike: () => void
  onDislike: () => void
}

export default function PlaybackControls({
  isPlaying,
  isLoggedIn,
  recommendation,
  activeFeedbackBtn,
  onPrev,
  onPlayPause,
  onNext,
  onSkip,
  onLike,
  onDislike
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      {/* Prev */}
      <button onClick={onPrev} className="control-btn" disabled={!isLoggedIn}>
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        onClick={onPlayPause}
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

      {/* Next */}
      <button onClick={onNext} className="control-btn" disabled={!isLoggedIn}>
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6z"/>
        </svg>
      </button>

      {/* Skip */}
      <button
        onClick={onSkip}
        className="control-btn"
        disabled={!isLoggedIn}
        title="换一首"
      >
        <FiRefreshCw size={20} />
      </button>

      {/* Feedback */}
      <div className="feedback-buttons">
        <button
          className={`feedback-btn like ${activeFeedbackBtn === 'like' ? 'active' : ''}`}
          onClick={onLike}
          title="喜欢"
        >
          <span style={{ fontSize: '20px' }}>👍</span>
        </button>
        <button
          className={`feedback-btn dislike ${activeFeedbackBtn === 'dislike' ? 'active' : ''}`}
          onClick={onDislike}
          title="不喜欢"
        >
          <span style={{ fontSize: '20px' }}>👎</span>
        </button>
      </div>
    </div>
  )
}