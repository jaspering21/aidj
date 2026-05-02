'use client'

interface StatusBarProps {
  isLoggedIn: boolean
  nickname: string
  isPlaying: boolean
  onLoginClick: () => void
}

export default function StatusBar({ isLoggedIn, nickname, isPlaying, onLoginClick }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between">
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
        <button onClick={onLoginClick} className="control-btn px-4 py-2">
          <span style={{ color: 'var(--neon-cyan)', fontSize: '0.7rem', letterSpacing: '0.2em' }}>LOGIN</span>
        </button>
      )}
      <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>AIDJ v2.0</span>
    </div>
  )
}